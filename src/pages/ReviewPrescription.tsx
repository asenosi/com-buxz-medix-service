import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Loader2, AlertTriangle, ShieldAlert, ChevronDown, Pencil, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { ExtractionResult, ExtractedMedication, AmbiguityItem, ExtractionDraftRow, HIGH_ALERT_DRUGS } from "@/types/document-extraction";

const HIGH_ALERT_LIST = [
  "warfarin", "heparin", "insulin", "methotrexate", "digoxin",
  "morphine", "fentanyl", "oxycodone", "potassium chloride", "lithium",
  "phenytoin", "theophylline", "gentamicin", "vancomycin", "colchicine",
];

function isHighAlert(med: ExtractedMedication): boolean {
  const name = ((med.drug?.brandName || "") + " " + (med.drug?.genericName || "")).toLowerCase();
  return HIGH_ALERT_LIST.some((d) => name.includes(d));
}

function getBlockers(
  medications: ExtractedMedication[],
  confirmed: Record<number, boolean>,
  doubleConfirmed: Record<number, boolean>,
  resolvedAmbiguities: Record<string, string>
): string[] {
  const blockers: string[] = [];

  medications.forEach((med, idx) => {
    const drugLabel = med.drug?.brandName || med.drug?.genericName || `Medication ${idx + 1}`;

    if (!confirmed[idx]) blockers.push(`Confirm "${drugLabel}"`);
    if (isHighAlert(med) && !doubleConfirmed[idx]) blockers.push(`Double-confirm high-alert: "${drugLabel}"`);

    // Check HIGH ambiguities are resolved
    med.ambiguities?.filter((a) => a.severity === "HIGH").forEach((a) => {
      const key = `${idx}-${a.type}`;
      if (!resolvedAmbiguities[key]) blockers.push(`Resolve: ${a.text}`);
    });

    // Blocking issues
    med.ambiguities?.filter((a) => a.severity === "BLOCKING").forEach((a) => {
      blockers.push(`Blocking: ${a.text}`);
    });
  });

  return blockers;
}

export default function ReviewPrescription() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<ExtractionDraftRow | null>(null);
  const [data, setData] = useState<ExtractionResult | null>(null);
  const [confirmed, setConfirmed] = useState<Record<number, boolean>>({});
  const [doubleConfirmed, setDoubleConfirmed] = useState<Record<number, boolean>>({});
  const [resolvedAmbiguities, setResolvedAmbiguities] = useState<Record<string, string>>({});
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchDraft = async () => {
      if (!id) return;
      const { data: draftData, error } = await supabase
        .from("extraction_drafts")
        .select("*")
        .eq("document_id", id)
        .single();

      if (error || !draftData) {
        toast.error("Draft not found");
        navigate("/documents");
        return;
      }

      const d = draftData as unknown as ExtractionDraftRow;
      setDraft(d);
      setData(d.normalized_json);
      setLoading(false);
    };
    fetchDraft();
  }, [id, navigate]);

  const handleConfirmPlan = async () => {
    if (!data || !id) return;
    setSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.id) throw new Error("Not authenticated");

      // Apply edits to data
      const finalData = { ...data };
      if (finalData.medications) {
        finalData.medications = finalData.medications.map((med, idx) => {
          const editedMed = { ...med };
          // Apply any field edits
          Object.entries(editedFields).forEach(([key, value]) => {
            const [medIdx, field] = key.split("-");
            if (parseInt(medIdx) === idx) {
              if (field === "drugName" && editedMed.drug) editedMed.drug = { ...editedMed.drug, brandName: value };
              if (field === "dose" && editedMed.dose) editedMed.dose = { ...editedMed.dose, amount: value };
              if (field === "frequency" && editedMed.frequency) editedMed.frequency = { ...editedMed.frequency, raw: value };
              if (field === "route") editedMed.route = value;
              if (field === "form") editedMed.form = value;
            }
          });

          // Apply resolved ambiguities
          editedMed.ambiguities = editedMed.ambiguities?.map((a) => {
            const key = `${idx}-${a.type}`;
            if (resolvedAmbiguities[key]) return { ...a, resolvedChoice: resolvedAmbiguities[key] };
            return a;
          });

          return editedMed;
        });
      }

      // Save confirmed plan
      const { error: planErr } = await supabase
        .from("confirmed_plans")
        .insert([{
          document_id: id,
          user_id: userData.user.id,
          confirmed_json: JSON.parse(JSON.stringify(finalData)),
          confirmed_at: new Date().toISOString(),
        }]);
      if (planErr) throw planErr;

      await supabase.from("documents").update({ status: "CONFIRMED" }).eq("id", id);

      await supabase.from("audit_events").insert([{
        document_id: id,
        event_type: "PLAN_CONFIRMED",
        payload: JSON.parse(JSON.stringify({ medicationCount: data.medications?.length ?? 0 })),
      }]);

      toast.success("Medication plan confirmed!");
      navigate(`/plans/${id}`);
    } catch (e) {
      console.error("Confirm error:", e);
      toast.error(e instanceof Error ? e.message : "Failed to confirm plan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.medications?.length) {
    return (
      <div className="container max-w-2xl mx-auto py-6 px-4 text-center">
        <p className="text-muted-foreground">No medications found in this prescription.</p>
        <Button onClick={() => navigate("/documents")} className="mt-4">Back to Documents</Button>
      </div>
    );
  }

  const blockers = getBlockers(data.medications, confirmed, doubleConfirmed, resolvedAmbiguities);

  return (
    <div className="container max-w-3xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/documents")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Review Prescription</h1>
          <p className="text-sm text-muted-foreground">
            {data.medications.length} medication{data.medications.length !== 1 ? "s" : ""} extracted
          </p>
        </div>
      </div>

      {/* Patient & Prescriber info */}
      {(data.patient?.name || data.prescriber?.name) && (
        <Card>
          <CardContent className="py-4 grid grid-cols-2 gap-4 text-sm">
            {data.patient?.name && (
              <div>
                <span className="text-muted-foreground">Patient:</span>{" "}
                <span className="font-medium">{data.patient.name}</span>
              </div>
            )}
            {data.prescriber?.name && (
              <div>
                <span className="text-muted-foreground">Prescriber:</span>{" "}
                <span className="font-medium">{data.prescriber.name}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Global warnings */}
      {data.globalWarnings && data.globalWarnings.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-3">
            {data.globalWarnings.map((w, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>{w.type}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Medication cards */}
      <div className="space-y-4">
        {data.medications.map((med, idx) => {
          const drugName = med.drug?.brandName || med.drug?.genericName || "Unknown medication";
          const highAlert = isHighAlert(med);
          const confMap = med.confidence || {};

          return (
            <Collapsible key={idx} defaultOpen>
              <Card className={`${highAlert ? "border-destructive/50" : ""}`}>
                {highAlert && (
                  <div className="bg-destructive/10 px-4 py-2 flex items-center gap-2 rounded-t-lg">
                    <ShieldAlert className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-semibold text-destructive">HIGH-ALERT MEDICATION</span>
                  </div>
                )}

                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        {drugName}
                        {med.strength?.value && (
                          <span className="text-sm font-normal text-muted-foreground">
                            {med.strength.value}{med.strength.unit}
                          </span>
                        )}
                        {med.form && (
                          <Badge variant="outline" className="text-xs">{med.form}</Badge>
                        )}
                      </CardTitle>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                    {/* Plain-language summary */}
                    <p className="text-sm text-muted-foreground mt-1">
                      {med.dose?.amount && `Take ${med.dose.amount} ${med.dose.unit || ""}`}
                      {med.frequency?.raw && ` · ${med.frequency.raw}`}
                      {med.route && ` · ${med.route}`}
                      {med.duration?.raw && ` · for ${med.duration.raw}`}
                    </p>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    {/* Editable fields for low confidence */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <ConfidenceField
                        label="Drug Name"
                        value={editedFields[`${idx}-drugName`] ?? drugName}
                        confidence={confMap.drugName}
                        onEdit={(v) => setEditedFields((p) => ({ ...p, [`${idx}-drugName`]: v }))}
                        edited={!!editedFields[`${idx}-drugName`]}
                      />
                      <ConfidenceField
                        label="Dose"
                        value={editedFields[`${idx}-dose`] ?? `${med.dose?.amount ?? ""} ${med.dose?.unit ?? ""}`}
                        confidence={confMap.dose}
                        onEdit={(v) => setEditedFields((p) => ({ ...p, [`${idx}-dose`]: v }))}
                        edited={!!editedFields[`${idx}-dose`]}
                      />
                      <ConfidenceField
                        label="Frequency"
                        value={editedFields[`${idx}-frequency`] ?? (med.frequency?.raw || "")}
                        confidence={confMap.frequency}
                        onEdit={(v) => setEditedFields((p) => ({ ...p, [`${idx}-frequency`]: v }))}
                        edited={!!editedFields[`${idx}-frequency`]}
                      />
                      <ConfidenceField
                        label="Route"
                        value={editedFields[`${idx}-route`] ?? (med.route || "")}
                        confidence={confMap.route}
                        onEdit={(v) => setEditedFields((p) => ({ ...p, [`${idx}-route`]: v }))}
                        edited={!!editedFields[`${idx}-route`]}
                      />
                      <ConfidenceField
                        label="Duration"
                        value={med.duration?.raw || ""}
                        confidence={confMap.duration}
                        readOnly
                      />
                      <ConfidenceField
                        label="Quantity"
                        value={med.quantity?.value ? `${med.quantity.value} ${med.quantity.unit || ""}` : ""}
                        confidence={confMap.quantity}
                        readOnly
                      />
                    </div>

                    {/* Instructions */}
                    {med.instructions && med.instructions.length > 0 && (
                      <div className="text-sm">
                        <span className="font-medium">Instructions: </span>
                        {med.instructions.join("; ")}
                      </div>
                    )}

                    {/* PRN */}
                    {med.prn?.isPrn && (
                      <Badge variant="outline">
                        PRN{med.prn.reason ? `: ${med.prn.reason}` : " (reason not specified)"}
                      </Badge>
                    )}

                    {/* Ambiguities */}
                    {med.ambiguities && med.ambiguities.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Issues & Ambiguities</p>
                        {med.ambiguities.map((amb, ambIdx) => (
                          <div
                            key={ambIdx}
                            className={`flex items-start gap-2 p-2 rounded-md text-sm ${
                              amb.severity === "HIGH" || amb.severity === "BLOCKING"
                                ? "bg-destructive/10 border border-destructive/20"
                                : amb.severity === "MEDIUM"
                                ? "bg-amber-500/10 border border-amber-500/20"
                                : "bg-muted"
                            }`}
                          >
                            <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${
                              amb.severity === "HIGH" || amb.severity === "BLOCKING" ? "text-destructive" : "text-amber-500"
                            }`} />
                            <div className="flex-1">
                              <p>{amb.text}</p>
                              {amb.severity === "HIGH" && amb.suggestedUserChoices && amb.suggestedUserChoices.length > 0 && (
                                <Select
                                  value={resolvedAmbiguities[`${idx}-${amb.type}`] || ""}
                                  onValueChange={(v) =>
                                    setResolvedAmbiguities((p) => ({ ...p, [`${idx}-${amb.type}`]: v }))
                                  }
                                >
                                  <SelectTrigger className="mt-2 h-8">
                                    <SelectValue placeholder="Select resolution..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {amb.suggestedUserChoices.map((c) => (
                                      <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                            <Badge variant={
                              amb.severity === "BLOCKING" ? "destructive" :
                              amb.severity === "HIGH" ? "destructive" :
                              amb.severity === "MEDIUM" ? "secondary" : "outline"
                            } className="text-xs shrink-0">
                              {amb.severity}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Confirmation */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`confirm-${idx}`}
                          checked={confirmed[idx] || false}
                          onCheckedChange={(c) => setConfirmed((p) => ({ ...p, [idx]: !!c }))}
                        />
                        <label htmlFor={`confirm-${idx}`} className="text-sm">
                          I confirm this matches the prescription
                        </label>
                      </div>
                    </div>

                    {highAlert && (
                      <div className="flex items-center gap-3 p-3 bg-destructive/5 rounded-md border border-destructive/20">
                        <Switch
                          checked={doubleConfirmed[idx] || false}
                          onCheckedChange={(c) => setDoubleConfirmed((p) => ({ ...p, [idx]: c }))}
                        />
                        <span className="text-sm font-medium text-destructive">
                          I double-confirm this high-alert medication is correct
                        </span>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Blockers / Confirm */}
      <Card>
        <CardContent className="py-4 space-y-3">
          {blockers.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Before you can confirm:</p>
              {blockers.map((b, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="text-destructive">•</span> {b}
                </p>
              ))}
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            disabled={blockers.length > 0 || saving}
            onClick={handleConfirmPlan}
          >
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              <><CheckCircle2 className="mr-2 h-4 w-4" /> Confirm Medication Plan</>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            ⚕️ This tool assists — it does not replace clinical judgement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Confidence Field Component ───

function ConfidenceField({
  label,
  value,
  confidence,
  onEdit,
  edited,
  readOnly,
}: {
  label: string;
  value: string;
  confidence?: number;
  onEdit?: (v: string) => void;
  edited?: boolean;
  readOnly?: boolean;
}) {
  const isLow = (confidence ?? 1) < 0.8;
  const borderClass = edited ? "border-green-500" : isLow ? "border-amber-500" : "";

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {confidence !== undefined && (
          <span className={`text-[10px] ${confidence < 0.5 ? "text-destructive" : confidence < 0.8 ? "text-amber-500" : "text-green-600"}`}>
            {Math.round(confidence * 100)}%
          </span>
        )}
        {isLow && !readOnly && <Pencil className="h-3 w-3 text-amber-500" />}
        {edited && <CheckCircle2 className="h-3 w-3 text-green-500" />}
      </div>
      {isLow && !readOnly && onEdit ? (
        <Input
          value={value}
          onChange={(e) => onEdit(e.target.value)}
          className={`h-8 text-sm ${borderClass}`}
        />
      ) : (
        <p className={`text-sm py-1 px-2 rounded bg-muted/50 ${borderClass}`}>
          {value || <span className="text-muted-foreground italic">Not specified</span>}
        </p>
      )}
    </div>
  );
}
