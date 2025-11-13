import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Plus, Phone, Mail, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

interface HealthCenter {
  id: string;
  name: string;
  specialty: string | null;
  phone_number: string | null;
  email: string | null;
  clinic_name: string | null;
  address: string | null;
  region: string;
}

export function HealthCentersDirectory() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: centers, isLoading } = useQuery({
    queryKey: ["health-centers-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("health_centers_directory" as never)
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as unknown as HealthCenter[];
    },
  });

  const importMutation = useMutation({
    mutationFn: async (center: HealthCenter) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("medical_practitioners" as never).insert({
        user_id: user.id,
        name: center.name,
        specialty: center.specialty,
        phone_number: center.phone_number,
        email: center.email,
        clinic_name: center.clinic_name,
        address: center.address,
      } as never);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitioners"] });
      toast({
        title: "Health center added",
        description: "The health center has been added to your practitioners.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to add health center",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredCenters = centers?.filter((center) =>
    center.name.toLowerCase().includes(search.toLowerCase()) ||
    center.clinic_name?.toLowerCase().includes(search.toLowerCase()) ||
    center.address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Building2 className="h-4 w-4" />
          Browse Health Centers Directory
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gauteng Health Centers</DialogTitle>
          <DialogDescription>
            Browse and add health centers to your practitioners list
          </DialogDescription>
        </DialogHeader>
        
        <Input
          placeholder="Search health centers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4"
        />

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredCenters?.map((center) => (
              <Card key={center.id}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-start justify-between gap-2">
                    <span>{center.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => importMutation.mutate(center)}
                      disabled={importMutation.isPending}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                  {center.clinic_name && (
                    <CardDescription>{center.clinic_name}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {center.specialty && (
                    <div className="text-muted-foreground">{center.specialty}</div>
                  )}
                  {center.phone_number && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {center.phone_number}
                    </div>
                  )}
                  {center.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {center.email}
                    </div>
                  )}
                  {center.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {center.address}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
