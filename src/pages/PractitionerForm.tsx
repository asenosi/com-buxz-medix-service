import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import PageLoader from "@/components/PageLoader";
import { toast } from "sonner";

const MEDICAL_SPECIALTIES = [
  "General Practice",
  "Internal Medicine",
  "Pediatrics",
  "Cardiology",
  "Dermatology",
  "Endocrinology",
  "Gastroenterology",
  "Neurology",
  "Oncology",
  "Orthopedics",
  "Psychiatry",
  "Pulmonology",
  "Rheumatology",
  "Urology",
  "Obstetrics & Gynecology",
  "Ophthalmology",
  "Otolaryngology (ENT)",
  "Radiology",
  "Anesthesiology",
  "Emergency Medicine",
  "Physical Medicine & Rehabilitation",
  "Surgery",
  "Other",
];

const practitionerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  specialty: z.string().trim().max(100).optional(),
  phone_number: z.string().trim().max(20).optional(),
  email: z.string().trim().email("Invalid email address").max(255).optional().or(z.literal("")),
  clinic_name: z.string().trim().max(100).optional(),
  address: z.string().trim().max(255).optional(),
  notes: z.string().trim().max(1000).optional(),
});

type PractitionerFormData = z.infer<typeof practitionerSchema>;

export default function PractitionerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);
  const [contactType, setContactType] = useState<"practitioner" | "health_center">("practitioner");

  const form = useForm<PractitionerFormData>({
    resolver: zodResolver(practitionerSchema),
    defaultValues: {
      name: "",
      specialty: "",
      phone_number: "",
      email: "",
      clinic_name: "",
      address: "",
      notes: "",
    },
  });

  const { data: practitioner, isLoading } = useQuery({
    queryKey: ["practitioner", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("medical_practitioners")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (practitioner) {
      form.reset({
        name: practitioner.name,
        specialty: practitioner.specialty || "",
        phone_number: practitioner.phone_number || "",
        email: practitioner.email || "",
        clinic_name: practitioner.clinic_name || "",
        address: practitioner.address || "",
        notes: practitioner.notes || "",
      });
    }
  }, [practitioner, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: PractitionerFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        name: data.name,
        user_id: user.id,
        specialty: data.specialty || null,
        phone_number: data.phone_number || null,
        email: data.email || null,
        clinic_name: data.clinic_name || null,
        address: data.address || null,
        notes: data.notes || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("medical_practitioners")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("medical_practitioners")
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitioners"] });
      queryClient.invalidateQueries({ queryKey: ["practitioner", id] });
      toast.success(isEditing ? "Practitioner updated successfully" : "Practitioner added successfully");
      navigate("/practitioners");
    },
    onError: () => {
      toast.error(isEditing ? "Failed to update practitioner" : "Failed to add practitioner");
    },
  });

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-background pb-36">
      <div className="max-w-2xl mx-auto p-4 space-y-6 pb-32">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/practitioners")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditing 
              ? `Edit ${contactType === "practitioner" ? "Practitioner" : "Health Center"}`
              : `Add ${contactType === "practitioner" ? "Practitioner" : "Health Center"}`
            }
          </h1>
        </div>

        {/* Type Toggle */}
        {!isEditing && (
          <Tabs value={contactType} onValueChange={(value) => setContactType(value as "practitioner" | "health_center")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="practitioner">Practitioner</TabsTrigger>
              <TabsTrigger value="health_center">Health Center</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data: PractitionerFormData) => saveMutation.mutate(data))} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {contactType === "practitioner" ? "Doctor Name" : "Center Name"} *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder={contactType === "practitioner" ? "Dr. John Smith" : "City Medical Center"} 
                      className="h-11" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {contactType === "practitioner" ? "Specialty" : "Services Offered"}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={contactType === "practitioner" ? "Select specialty" : "Select service type"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MEDICAL_SPECIALTIES.map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {contactType === "health_center" && (
              <FormField
                control={form.control}
                name="clinic_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization/Network</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Healthcare Network Name" className="h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input {...field} type="tel" placeholder="+1 234 567 8900" className="h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="contact@example.com" className="h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="123 Medical Plaza, City, State" className="h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Additional information or reminders..."
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border p-4 pb-24 md:pb-6 flex gap-3 z-10">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 rounded-full"
                onClick={() => navigate("/practitioners")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 h-12 rounded-full"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "Saving..." : isEditing ? "Update" : "Add Practitioner"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}