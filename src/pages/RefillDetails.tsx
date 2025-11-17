import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RefillStatusBadge } from "@/components/refills/RefillStatusBadge";
import { RefillHistory } from "@/components/refills/RefillHistory";
import { RefillPrediction } from "@/components/refills/RefillPrediction";
import { RefillManagementDialog } from "@/components/refills/RefillManagementDialog";

type Medication = {
  id: string;
  name: string;
  dosage: string | null;
  form: string | null;
  pills_remaining: number | null;
  refill_reminder_threshold: number | null;
};

const RefillDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [med, setMed] = useState<Medication | null>(null);
  const [showRefillDialog, setShowRefillDialog] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from("medications")
          .select("id, name, dosage, form, pills_remaining, refill_reminder_threshold")
          .eq("id", id)
          .single();

        if (error) throw error;
        setMed(data);
      } catch (error) {
        console.error("Error loading medication:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleRefillRecorded = () => {
    setShowRefillDialog(false);
    if (id) {
      supabase
        .from("medications")
        .select("id, name, dosage, form, pills_remaining, refill_reminder_threshold")
        .eq("id", id)
        .single()
        .then(({ data }) => {
          if (data) setMed(data);
        });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!med) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-center text-muted-foreground">Medication not found</p>
      </div>
    );
  }

  const needsRefill = med.pills_remaining !== null && 
    med.refill_reminder_threshold !== null && 
    med.pills_remaining <= med.refill_reminder_threshold;

  return (
    <div className="container mx-auto p-4 space-y-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/medications/${id}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Refill Management</h1>
          <p className="text-sm text-muted-foreground">
            {med.name} • {med.dosage} {med.form && `• ${med.form}`}
          </p>
        </div>
      </div>

      {med.pills_remaining !== null ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Refill Information
                </CardTitle>
                <RefillStatusBadge 
                  pillsRemaining={med.pills_remaining}
                  refillThreshold={med.refill_reminder_threshold}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pills Remaining</p>
                  <p className="text-2xl font-bold">{med.pills_remaining}</p>
                </div>
                {med.refill_reminder_threshold !== null && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Refill Threshold</p>
                    <p className="text-2xl font-bold">{med.refill_reminder_threshold}</p>
                  </div>
                )}
              </div>

              {needsRefill && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-amber-900 dark:text-amber-100">Refill Needed</p>
                      <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                        You're running low on {med.name}. Consider refilling soon.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                onClick={() => setShowRefillDialog(true)}
                className="w-full"
                variant={needsRefill ? "default" : "outline"}
              >
                <Package className="mr-2 h-4 w-4" />
                Record Refill
              </Button>
            </CardContent>
          </Card>

          <RefillPrediction
            medicationId={med.id}
            pillsRemaining={med.pills_remaining}
            refillThreshold={med.refill_reminder_threshold}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Refill History</CardTitle>
            </CardHeader>
            <CardContent>
              <RefillHistory medicationId={med.id} />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <Package className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Refill tracking is not enabled for this medication
            </p>
          </CardContent>
        </Card>
      )}

      {showRefillDialog && (
        <RefillManagementDialog
          open={showRefillDialog}
          onOpenChange={setShowRefillDialog}
          medicationId={med.id}
          medicationName={med.name}
          currentRemaining={med.pills_remaining || 0}
          onRefillComplete={handleRefillRecorded}
        />
      )}
    </div>
  );
};

export default RefillDetails;
