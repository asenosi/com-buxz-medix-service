import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingDown, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { addDays, format, differenceInDays } from "date-fns";

interface RefillPredictionProps {
  medicationId: string;
  pillsRemaining: number;
  refillThreshold: number | null;
}

export const RefillPrediction = ({ 
  medicationId, 
  pillsRemaining,
  refillThreshold 
}: RefillPredictionProps) => {
  const [prediction, setPrediction] = useState<{
    daysUntilRefill: number;
    estimatedRefillDate: Date;
    dailyConsumption: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculatePrediction();
  }, [medicationId, pillsRemaining]);

  const calculatePrediction = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: doseLogs, error } = await supabase
        .from("dose_logs")
        .select("taken_at, status")
        .eq("medication_id", medicationId)
        .eq("status", "taken")
        .gte("scheduled_time", thirtyDaysAgo.toISOString())
        .not("taken_at", "is", null);

      if (error) throw error;

      if (!doseLogs || doseLogs.length === 0) {
        setLoading(false);
        return;
      }

      const daysWithData = differenceInDays(new Date(), thirtyDaysAgo);
      const totalTaken = doseLogs.length;
      const dailyConsumption = totalTaken / daysWithData;

      if (dailyConsumption === 0) {
        setLoading(false);
        return;
      }

      const pillsUntilRefill = refillThreshold !== null ? 
        Math.max(pillsRemaining - refillThreshold, 0) : 
        pillsRemaining;
      
      const daysUntilRefill = Math.ceil(pillsUntilRefill / dailyConsumption);
      const estimatedRefillDate = addDays(new Date(), daysUntilRefill);

      setPrediction({
        daysUntilRefill,
        estimatedRefillDate,
        dailyConsumption,
      });
    } catch (error) {
      console.error("Error calculating refill prediction:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !prediction) {
    return null;
  }

  const isUrgent = prediction.daysUntilRefill <= 7;
  const isWarning = prediction.daysUntilRefill <= 14;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Refill Prediction
          </CardTitle>
          {isUrgent && (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              Urgent
            </Badge>
          )}
          {!isUrgent && isWarning && (
            <Badge variant="outline" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              Soon
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Daily Usage</p>
            <p className="text-2xl font-bold">
              {prediction.dailyConsumption.toFixed(1)}
              <span className="text-sm font-normal text-muted-foreground ml-1">pills/day</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Days Until Refill</p>
            <p className="text-2xl font-bold">
              {prediction.daysUntilRefill}
              <span className="text-sm font-normal text-muted-foreground ml-1">days</span>
            </p>
          </div>
        </div>

        <div className="pt-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Estimated refill date:</span>
          </div>
          <p className="text-base font-medium mt-1">
            {format(prediction.estimatedRefillDate, "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        {isUrgent && (
          <div className="mt-3 p-3 bg-destructive/10 rounded-lg">
            <p className="text-sm text-destructive font-medium">
              ⚠️ Consider ordering a refill soon to avoid running out
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
