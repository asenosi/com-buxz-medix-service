import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, User, Phone, Mail, MapPin, Stethoscope, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageLoader from "@/components/PageLoader";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { toast } from "sonner";

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

const GAUTENG_HEALTH_CENTERS = [
  { name: "Netcare Sunninghill Hospital", specialty: "General Practice", phone_number: "+27 11 806 1500", address: "Cnr Nanyuki & Arnott Rd, Sunninghill, Sandton, 2157", clinic_name: "Netcare Group" },
  { name: "Life Healthcare Fourways Hospital", specialty: "General Practice", phone_number: "+27 11 875 1000", address: "Cnr Cedar Rd & Fourways Blvd, Fourways, 2055", clinic_name: "Life Healthcare" },
  { name: "Mediclinic Sandton", specialty: "General Practice", phone_number: "+27 11 709 2000", address: "Cnr Peter Pl & Main Rd, Bryanston, Sandton, 2191", clinic_name: "Mediclinic" },
  { name: "Charlotte Maxeke Johannesburg Academic Hospital", specialty: "General Practice", phone_number: "+27 11 488 3694", address: "17 Jubilee Rd, Parktown, Johannesburg, 2193", clinic_name: "Public Hospital" },
  { name: "Steve Biko Academic Hospital", specialty: "General Practice", phone_number: "+27 12 354 1000", address: "Malherbe St, Pretoria Central, Pretoria, 0001", clinic_name: "Public Hospital" },
  { name: "Netcare Waterfall City Hospital", specialty: "General Practice", phone_number: "+27 10 020 4000", address: "Jurg Ave, Waterfall City, Midrand, 1686", clinic_name: "Netcare Group" },
  { name: "Life Wilgeheuwel Hospital", specialty: "General Practice", phone_number: "+27 11 950 6000", address: "Cnr Amplifier & Planetarium Rd, Radiokop, Roodepoort, 1724", clinic_name: "Life Healthcare" },
  { name: "Mediclinic Morningside", specialty: "General Practice", phone_number: "+27 11 282 5000", address: "Corner Hill Rd & Rivonia Rd, Morningside, Sandton, 2196", clinic_name: "Mediclinic" },
  { name: "Ahmed Kathrada Private Hospital", specialty: "General Practice", phone_number: "+27 11 812 1000", address: "Cnr Ontdekkers & Scott St, Krugersdorp, 1739", clinic_name: "Independent" },
  { name: "Life Groenkloof Hospital", specialty: "General Practice", phone_number: "+27 12 354 6000", address: "George Storrar Dr, Groenkloof, Pretoria, 0181", clinic_name: "Life Healthcare" },
  { name: "Netcare Montana Hospital", specialty: "General Practice", phone_number: "+27 12 764 3000", address: "1 Dulcie Rd, Montana Park, Pretoria, 0182", clinic_name: "Netcare Group" },
  { name: "Mediclinic Midstream", specialty: "General Practice", phone_number: "+27 12 677 2000", address: "Cnr K101 & Clifton Rd, Midstream Estate, Centurion, 1692", clinic_name: "Mediclinic" },
];

export default function Practitioners() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: practitioners, isLoading } = useQuery({
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

  const loadSampleCentersMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const centersToInsert = GAUTENG_HEALTH_CENTERS.map(center => ({
        ...center,
        user_id: user.id,
      }));

      const { error } = await supabase
        .from("medical_practitioners")
        .insert(centersToInsert);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitioners"] });
      toast.success("Gauteng health centers added successfully");
    },
    onError: () => {
      toast.error("Failed to add health centers");
    },
  });

  const filteredPractitioners = practitioners?.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.specialty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.clinic_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
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
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Medical Practitioners</h1>
          <p className="text-muted-foreground">Manage your healthcare providers</p>
        </div>

        {/* Search and Actions */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, specialty, or clinic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          {(!practitioners || practitioners.length === 0) && (
            <Button
              variant="outline"
              onClick={() => loadSampleCentersMutation.mutate()}
              disabled={loadSampleCentersMutation.isPending}
              className="h-11 whitespace-nowrap"
            >
              <Building2 className="mr-2 h-4 w-4" />
              Load Gauteng Centers
            </Button>
          )}
        </div>

        {/* Empty State */}
        {(!practitioners || practitioners.length === 0) && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-primary/10 p-6 mb-4">
                <Stethoscope className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No practitioners yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Start by adding your doctors and healthcare providers for easy reference
              </p>
              <div className="flex gap-3">
                <Button onClick={() => navigate("/practitioners/add")} size="lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Practitioner
                </Button>
                <Button 
                  onClick={() => loadSampleCentersMutation.mutate()} 
                  disabled={loadSampleCentersMutation.isPending}
                  variant="outline" 
                  size="lg"
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Load Gauteng Centers
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Practitioners List */}
        <div className="grid gap-4">
          {filteredPractitioners?.map((practitioner) => (
            <Card
              key={practitioner.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/practitioners/${practitioner.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-3">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{practitioner.name}</CardTitle>
                      {practitioner.specialty && (
                        <Badge variant="secondary" className="mt-1">
                          {practitioner.specialty}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {practitioner.clinic_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Stethoscope className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{practitioner.clinic_name}</span>
                  </div>
                )}
                {practitioner.phone_number && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{practitioner.phone_number}</span>
                  </div>
                )}
                {practitioner.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{practitioner.email}</span>
                  </div>
                )}
                {practitioner.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{practitioner.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <FloatingActionButton actions={fabActions} />
    </div>
  );
}