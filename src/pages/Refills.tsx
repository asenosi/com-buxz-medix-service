import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefillStatusBadge } from "@/components/refills/RefillStatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Plus } from "lucide-react";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  pills_remaining: number | null;
  refill_reminder_threshold: number | null;
  form: string | null;
}

const Refills = () => {
  const navigate = useNavigate();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("medications")
        .select("id, name, dosage, pills_remaining, refill_reminder_threshold, form")
        .eq("user_id", user.id)
        .eq("active", true)
        .order("name");

      if (error) throw error;
      setMedications(data || []);
    } catch (error) {
      console.error("Error loading medications:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
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

  if (medications.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Package className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Medications Yet</h2>
          <p className="text-muted-foreground mb-6">
            Add your first medication to start tracking refills
          </p>
          <Button onClick={() => navigate("/medications/add")}>
            <Plus className="h-4 w-4 mr-2" />
            Add Medication
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Refill Management</h1>
        <p className="text-muted-foreground">
          Track and manage medication refills
        </p>
      </div>

      <div className="space-y-4">
        {medications.map((medication) => (
          <Card 
            key={medication.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/medications/${medication.id}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{medication.name}</CardTitle>
                  <CardDescription>
                    {medication.dosage} {medication.form && `• ${medication.form}`}
                  </CardDescription>
                </div>
                <RefillStatusBadge
                  pillsRemaining={medication.pills_remaining}
                  refillThreshold={medication.refill_reminder_threshold}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {medication.pills_remaining !== null
                    ? `${medication.pills_remaining} pills remaining`
                    : "Stock not tracked"}
                </span>
                <Button variant="ghost" size="sm">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Refills;
