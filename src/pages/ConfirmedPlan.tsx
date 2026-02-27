import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, CheckCircle2, Pill } from "lucide-react";
import type { ExtractionResult } from "@/types/document-extraction";

export default function ConfirmedPlan() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<{ confirmed_json: ExtractionResult; confirmed_at: string } | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from("confirmed_plans")
        .select("confirmed_json, confirmed_at")
        .eq("document_id", id)
        .single();

      if (!error && data) setPlan(data as unknown as { confirmed_json: ExtractionResult; confirmed_at: string });
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="container max-w-2xl mx-auto py-6 px-4 text-center">
        <p className="text-muted-foreground">Plan not found.</p>
        <Button onClick={() => navigate("/documents")} className="mt-4">Back to Documents</Button>
      </div>
    );
  }

  const data = plan.confirmed_json;

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/documents")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Confirmed Plan</h1>
          <p className="text-sm text-muted-foreground">
            Confirmed {new Date(plan.confirmed_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="py-3 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">
            This medication plan has been reviewed and confirmed.
          </span>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {data.medications?.map((med, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Pill className="h-4 w-4 text-primary" />
                {med.drug?.brandName || med.drug?.genericName || "Unknown"}
                {med.strength?.value && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {med.strength.value}{med.strength.unit}
                  </span>
                )}
                {med.form && <Badge variant="outline" className="text-xs">{med.form}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {med.dose?.amount && <p><span className="text-muted-foreground">Dose:</span> {med.dose.amount} {med.dose.unit}</p>}
              {med.frequency?.raw && <p><span className="text-muted-foreground">Frequency:</span> {med.frequency.raw}</p>}
              {med.route && <p><span className="text-muted-foreground">Route:</span> {med.route}</p>}
              {med.duration?.raw && <p><span className="text-muted-foreground">Duration:</span> {med.duration.raw}</p>}
              {med.instructions && med.instructions.length > 0 && (
                <p><span className="text-muted-foreground">Instructions:</span> {med.instructions.join("; ")}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
