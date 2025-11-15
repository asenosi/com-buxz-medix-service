import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, User, Phone, Mail, MapPin, Stethoscope, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageLoader from "@/components/PageLoader";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { toast } from "@/hooks/use-toast";

interface Practitioner {
  id: string;
  name: string;
  specialty: string | null;
  phone_number: string | null;
  email: string | null;
  clinic_name: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

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

export default function Practitioners() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("practitioners");

  const { data: practitioners, isLoading: practitionersLoading } = useQuery({
    queryKey: ["practitioners"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("medical_practitioners")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Practitioner[];
    },
  });

  const { data: centers, isLoading: centersLoading } = useQuery({
    queryKey: ["health-centers-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("health_centers_directory" as never)
        .select("*")
        .order("name");
      
      if (error) throw error;
      return (data || []) as unknown as HealthCenter[];
    },
  });

  const importCenterMutation = useMutation({
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

  const filteredPractitioners = practitioners?.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.specialty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.clinic_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCenters = centers?.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.clinic_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (practitionersLoading || centersLoading) {
    return <PageLoader />;
  }

  const fabActions = [
    {
      label: "Add Practitioner",
      icon: <Plus className="h-6 w-6" />,
      onClick: () => navigate("/practitioners/add"),
      color: "bg-primary hover:bg-primary/90",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">Healthcare Providers</h1>
          <p className="text-lg text-muted-foreground">Manage and organize your medical practitioners</p>
        </div>

        {/* Search */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search practitioners, specialties, or clinics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base rounded-xl border-border/60 bg-card shadow-sm focus-visible:ring-2"
          />
        </div>

        {/* Filter Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 h-11 bg-muted/50">
            <TabsTrigger value="practitioners" className="text-sm font-medium">
              <User className="mr-2 h-4 w-4" />
              My Practitioners
            </TabsTrigger>
            <TabsTrigger value="centers" className="text-sm font-medium">
              <Building2 className="mr-2 h-4 w-4" />
              Health Centers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="practitioners" className="space-y-5 mt-8">
            {/* Empty State */}
            {(!practitioners || practitioners.length === 0) && (
              <Card className="border-dashed border-2 rounded-2xl">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="rounded-2xl bg-primary/10 p-8 mb-6">
                    <Stethoscope className="h-14 w-14 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">No practitioners yet</h3>
                  <p className="text-muted-foreground mb-8 max-w-md text-base">
                    Start by adding your doctors and healthcare providers for easy reference
                  </p>
                  <Button onClick={() => navigate("/practitioners/add")} size="lg" className="h-11 px-6">
                    <Plus className="mr-2 h-5 w-5" />
                    Add Practitioner
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Practitioners List */}
            {filteredPractitioners && filteredPractitioners.length > 0 && (
              <div className="grid gap-5">
                {filteredPractitioners.map((practitioner) => (
                  <Card
                    key={practitioner.id}
                    className="cursor-pointer hover:shadow-lg hover:border-primary/20 transition-all duration-200 rounded-2xl overflow-hidden"
                    onClick={() => navigate(`/practitioners/${practitioner.id}`)}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <CardTitle className="text-xl font-semibold flex items-center gap-3">
                            <div className="rounded-lg bg-primary/10 p-2">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            {practitioner.name}
                          </CardTitle>
                          {practitioner.specialty && (
                            <Badge variant="secondary" className="w-fit font-medium">
                              {practitioner.specialty}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      {practitioner.clinic_name && (
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 shrink-0 text-primary/60" />
                          <span>{practitioner.clinic_name}</span>
                        </div>
                      )}
                      {practitioner.phone_number && (
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4 shrink-0 text-primary/60" />
                          <span>{practitioner.phone_number}</span>
                        </div>
                      )}
                      {practitioner.email && (
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4 shrink-0 text-primary/60" />
                          <span className="truncate">{practitioner.email}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="centers" className="space-y-5 mt-8">
            {/* Empty State */}
            {(!centers || centers.length === 0) && (
              <Card className="border-dashed border-2 rounded-2xl">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="rounded-2xl bg-primary/10 p-8 mb-6">
                    <Building2 className="h-14 w-14 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">No health centers found</h3>
                  <p className="text-muted-foreground max-w-md text-base">
                    Health centers directory is currently empty
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Health Centers List */}
            {filteredCenters && filteredCenters.length > 0 && (
              <div className="grid gap-5 md:grid-cols-2">
                {filteredCenters.map((center) => (
                  <Card key={center.id} className="rounded-2xl hover:shadow-lg hover:border-primary/20 transition-all duration-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <span className="leading-tight">{center.name}</span>
                        </div>
                      </CardTitle>
                      {center.specialty && (
                        <CardDescription className="text-sm mt-2">{center.specialty}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      {center.clinic_name && (
                        <div className="flex items-start gap-3 text-sm">
                          <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary/60" />
                          <div className="flex-1">
                            <p className="font-medium">{center.clinic_name}</p>
                            {center.address && (
                              <p className="text-muted-foreground mt-0.5">{center.address}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {center.phone_number && (
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4 shrink-0 text-primary/60" />
                          <span>{center.phone_number}</span>
                        </div>
                      )}
                      {center.email && (
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4 shrink-0 text-primary/60" />
                          <span className="truncate">{center.email}</span>
                        </div>
                      )}
                      <Button
                        className="w-full mt-4 h-10"
                        onClick={() => importCenterMutation.mutate(center)}
                        disabled={importCenterMutation.isPending}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add to My Practitioners
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <FloatingActionButton actions={fabActions} />
    </div>
  );
}
