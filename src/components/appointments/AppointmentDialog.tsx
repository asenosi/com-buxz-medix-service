import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];

const appointmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  appointment_date: z.date({ required_error: "Date is required" }),
  appointment_time: z.string().min(1, "Time is required"),
  duration_minutes: z.coerce.number().min(5).default(30),
  location: z.string().optional(),
  doctor_name: z.string().optional(),
  doctor_specialty: z.string().optional(),
  appointment_type: z.string(),
  status: z.string(),
  notes: z.string().optional(),
  reminder_minutes_before: z.coerce.number().min(0).default(60),
  medication_id: z.string().optional(),
});

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Partial<Appointment>;
}

export function AppointmentDialog({ open, onOpenChange, appointment }: AppointmentDialogProps) {
  const { data: medications } = useQuery({
    queryKey: ["medications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medications")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<z.infer<typeof appointmentSchema>>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      title: "",
      description: "",
      appointment_date: new Date(),
      appointment_time: "09:00",
      duration_minutes: 30,
      location: "",
      doctor_name: "",
      doctor_specialty: "",
      appointment_type: "checkup",
      status: "scheduled",
      notes: "",
      reminder_minutes_before: 60,
      medication_id: "none",
    },
  });

  useEffect(() => {
    if (appointment) {
      form.reset({
        title: appointment.title || "",
        description: appointment.description || "",
        appointment_date: appointment.appointment_date
          ? new Date(appointment.appointment_date)
          : new Date(),
        appointment_time: appointment.appointment_time || "09:00",
        duration_minutes: appointment.duration_minutes || 30,
        location: appointment.location || "",
        doctor_name: appointment.doctor_name || "",
        doctor_specialty: appointment.doctor_specialty || "",
        appointment_type: appointment.appointment_type || "checkup",
        status: appointment.status || "scheduled",
        notes: appointment.notes || "",
        reminder_minutes_before: appointment.reminder_minutes_before || 60,
        medication_id: appointment.medication_id || "none",
      });
    } else {
      form.reset({
        title: "",
        description: "",
        appointment_date: new Date(),
        appointment_time: "09:00",
        duration_minutes: 30,
        location: "",
        doctor_name: "",
        doctor_specialty: "",
        appointment_type: "checkup",
        status: "scheduled",
        notes: "",
        reminder_minutes_before: 60,
        medication_id: "none",
      });
    }
  }, [appointment, form]);

  const onSubmit = async (values: z.infer<typeof appointmentSchema>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    const appointmentData: Database["public"]["Tables"]["appointments"]["Insert"] = {
      title: values.title,
      appointment_date: format(values.appointment_date, "yyyy-MM-dd"),
      appointment_time: values.appointment_time,
      appointment_type: values.appointment_type as Database["public"]["Enums"]["appointment_type"],
      status: values.status as Database["public"]["Enums"]["appointment_status"],
      user_id: user.id,
      description: values.description,
      duration_minutes: values.duration_minutes,
      location: values.location,
      doctor_name: values.doctor_name,
      doctor_specialty: values.doctor_specialty,
      notes: values.notes,
      reminder_minutes_before: values.reminder_minutes_before,
      medication_id: values.medication_id === "none" || !values.medication_id ? null : values.medication_id,
    };

    const { error } = appointment
      ? await supabase.from("appointments").update(appointmentData).eq("id", appointment.id)
      : await supabase.from("appointments").insert([appointmentData]);

    if (error) {
      toast.error(`Failed to ${appointment ? "update" : "create"} appointment`);
    } else {
      toast.success(`Appointment ${appointment ? "updated" : "created"} successfully`);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {appointment ? "Edit Appointment" : "New Appointment"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Annual checkup" className="h-11" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the appointment"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="appointment_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="appointment_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="appointment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="checkup">Checkup</SelectItem>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                        <SelectItem value="lab_test">Lab Test</SelectItem>
                        <SelectItem value="imaging">Imaging</SelectItem>
                        <SelectItem value="procedure">Procedure</SelectItem>
                        <SelectItem value="consultation">Consultation</SelectItem>
                        <SelectItem value="vaccination">Vaccination</SelectItem>
                        <SelectItem value="therapy">Therapy</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="rescheduled">Rescheduled</SelectItem>
                        <SelectItem value="no_show">No Show</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="duration_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" min="5" step="5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Medical Center Dr" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="doctor_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Doctor Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Dr. Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="doctor_specialty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialty</FormLabel>
                    <FormControl>
                      <Input placeholder="Cardiology" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="medication_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Related Medication</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select medication (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {medications?.map((med) => (
                        <SelectItem key={med.id} value={med.id}>
                          {med.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reminder_minutes_before"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reminder (minutes before)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="5" {...field} />
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
                      placeholder="Any additional notes or instructions"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4 sticky bottom-0 bg-background">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1 h-11"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 h-11">
                {appointment ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
