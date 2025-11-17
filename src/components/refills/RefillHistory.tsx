import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Package, Calendar, DollarSign, Building2, FileText, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RefillHistoryItem {
  id: string;
  quantity_added: number;
  prescription_number: string | null;
  prescriber_name: string | null;
  cost: number | null;
  insurance_covered: boolean;
  copay_amount: number | null;
  refill_date: string;
  requested_date: string | null;
  pickup_date: string | null;
  status: string;
  notes: string | null;
  pharmacy: {
    name: string;
  } | null;
}

interface RefillHistoryProps {
  medicationId: string;
}

export const RefillHistory = ({ medicationId }: RefillHistoryProps) => {
  const [history, setHistory] = useState<RefillHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [medicationId]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("refill_history")
        .select(`
          *,
          pharmacy:pharmacies(name)
        `)
        .eq("medication_id", medicationId)
        .order("refill_date", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error loading refill history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      requested: { variant: "secondary", label: "Requested" },
      ready: { variant: "default", label: "Ready" },
      picked_up: { variant: "default", label: "Picked Up" },
      completed: { variant: "outline", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
    };
    const config = variants[status] || variants.completed;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No refill history yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((item) => (
        <Card key={item.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {item.quantity_added} pills added
                </CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(item.refill_date), "MMM d, yyyy")}
                </CardDescription>
              </div>
              {getStatusBadge(item.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {item.pharmacy && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{item.pharmacy.name}</span>
              </div>
            )}

            {item.prescriber_name && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Dr. {item.prescriber_name}</span>
              </div>
            )}

            {item.prescription_number && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Rx# {item.prescription_number}</span>
              </div>
            )}

            {item.cost !== null && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>
                  ${item.cost.toFixed(2)}
                  {item.insurance_covered && item.copay_amount !== null && (
                    <span className="ml-1 text-xs">(Copay: ${item.copay_amount.toFixed(2)})</span>
                  )}
                  {item.insurance_covered && <Badge variant="secondary" className="ml-2 text-xs">Insured</Badge>}
                </span>
              </div>
            )}

            {item.notes && (
              <>
                <Separator className="my-2" />
                <p className="text-xs text-muted-foreground italic">{item.notes}</p>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
