import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Clock, AlarmClock, FileText, ArrowLeft, ChevronRight, Check } from "lucide-react";
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

export default function AddAppointment() {
  const navigate = useNavigate();
  const location = useLocation();
  const appointment = location.state?.appointment as Partial<Appointment> | undefined;
  
  const [step, setStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [selectedReminder, setSelectedReminder] = useState(60);
  const [editingField, setEditingField] = useState<string | null>(null);

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

  const { data: appointments } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("appointment_date")
        .order("appointment_date", { ascending: true });
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
    if (appointment && appointment.id) {
      const appointmentDate = appointment.appointment_date
        ? new Date(appointment.appointment_date)
        : new Date();
      setSelectedDate(appointmentDate);
      setSelectedTime(appointment.appointment_time || "09:00");
      setSelectedReminder(appointment.reminder_minutes_before || 60);
      
      form.reset({
        title: appointment.title || "",
        description: appointment.description || "",
        appointment_date: appointmentDate,
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
      setStep(4);
    } else if (appointment && appointment.appointment_date) {
      const appointmentDate = new Date(appointment.appointment_date);
      setSelectedDate(appointmentDate);
      form.setValue("appointment_date", appointmentDate);
      setStep(1);
    } else {
      setStep(0);
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

    const { error } = appointment?.id
      ? await supabase.from("appointments").update(appointmentData).eq("id", appointment.id)
      : await supabase.from("appointments").insert([appointmentData]);

    if (error) {
      toast.error(`Failed to ${appointment?.id ? "update" : "create"} appointment: ${error.message}`);
    } else {
      toast.success(`Appointment ${appointment?.id ? "updated" : "created"} successfully`);
      navigate("/appointments");
    }
  };

  const handleNext = () => {
    if (step === 0) {
      form.setValue("appointment_date", selectedDate);
      setStep(1);
    } else if (step === 1) {
      form.setValue("appointment_time", selectedTime);
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      form.setValue("reminder_minutes_before", selectedReminder);
      setStep(4);
    }
  };

  const handleBack = () => {
    if (step === 0) {
      navigate("/appointments");
    } else {
      setStep(step - 1);
      setEditingField(null);
    }
  };

  const reminderOptions = [
    { value: 30, label: "30 minutes before" },
    { value: 60, label: "1 hour before" },
    { value: 480, label: "8 hours before" },
    { value: 720, label: "12 hours before" },
    { value: 1440, label: "1 day before" },
    { value: 10080, label: "1 week before" },
    { value: 0, label: "No reminder" },
  ];

  const getRelativeDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(date);
    selected.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((selected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays > 1) return `in ${diffDays} days`;
    return `${Math.abs(diffDays)} days ago`;
  };

  return (
    <div className="max-w-2xl mx-auto h-full flex flex-col">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3 pb-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {appointment?.id ? "Edit Appointment" : "Add Appointment"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Step {step + 1} of 5
          </p>
        </div>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto pb-4">
        {/* Intro Screen */}
        {step === 0 && !appointment && (
          <div className="flex flex-col items-center justify-center text-center py-12 px-4">
            <div className="max-w-md w-full border-2 border-dashed border-border rounded-2xl p-8">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-4">
                  <CalendarIcon className="h-12 w-12 text-primary" />
                </div>
              </div>

              <h2 className="text-2xl font-bold mb-3 flex items-center justify-center gap-2">
                <CalendarIcon className="h-6 w-6" />
                Appointments
              </h2>

              <p className="text-lg font-semibold mb-2">
                Track appointments and doctor visits
              </p>

              <p className="text-muted-foreground mb-8">
                Keep all your health visits in one place. Get assistance preparing for and summarizing visits.
              </p>

              <Button
                onClick={() => setStep(1)}
                size="lg"
                className="w-full h-12 text-base"
              >
                Add an appointment
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Date Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 shrink-0">
                <CalendarIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">When is your appointment?</h2>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary"></span>
                  Dates with existing appointments
                </p>
              </div>
            </div>
            
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    form.setValue("appointment_date", date);
                  }
                }}
                className="rounded-md border"
                modifiers={{
                  hasAppointment: appointments?.map(apt => new Date(apt.appointment_date)) || [],
                }}
                modifiersClassNames={{
                  hasAppointment: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-primary",
                }}
              />
            </div>

            <p className="text-center text-muted-foreground">
              {getRelativeDate(selectedDate)}
            </p>
          </div>
        )}

        {/* Step 2: Time Selection */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 shrink-0">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">What time is your appointment?</h2>
            </div>
            
            <div className="flex justify-center py-8">
              <Input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="text-5xl h-28 text-center font-light border-none shadow-none focus-visible:ring-0 max-w-md"
                style={{ fontSize: '3rem' }}
              />
            </div>
          </div>
        )}

        {/* Step 3: Appointment Details */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 shrink-0">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Appointment Details</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Appointment Title *</Label>
                <Input
                  placeholder="e.g., Annual checkup"
                  value={form.watch("title")}
                  onChange={(e) => form.setValue("title", e.target.value)}
                  className="h-11"
                />
              </div>

              <div>
                <Label>Appointment Type</Label>
                <Select
                  value={form.watch("appointment_type")}
                  onValueChange={(value) => form.setValue("appointment_type", value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
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
              </div>

              <div>
                <Label>Doctor Name</Label>
                <Input
                  placeholder="Dr. Smith"
                  value={form.watch("doctor_name")}
                  onChange={(e) => form.setValue("doctor_name", e.target.value)}
                  className="h-11"
                />
              </div>

              <div>
                <Label>Location</Label>
                <Input
                  placeholder="123 Medical Center Dr"
                  value={form.watch("location")}
                  onChange={(e) => form.setValue("location", e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Reminder & Review */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 shrink-0">
                <AlarmClock className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Review & Set Reminder</h2>
            </div>

            <div className="space-y-3 bg-muted/30 rounded-lg p-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Date</span>
                <button
                  onClick={() => setStep(1)}
                  className="text-sm font-medium hover:underline"
                >
                  {format(form.watch("appointment_date"), "PPP")}
                </button>
              </div>

              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Time</span>
                <button
                  onClick={() => setStep(2)}
                  className="text-sm font-medium hover:underline"
                >
                  {form.watch("appointment_time")}
                </button>
              </div>

              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Title</span>
                <button
                  onClick={() => setStep(3)}
                  className="text-sm font-medium hover:underline text-right"
                >
                  {form.watch("title") || "Not set"}
                </button>
              </div>

              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Type</span>
                <button
                  onClick={() => setStep(3)}
                  className="text-sm font-medium hover:underline capitalize"
                >
                  {form.watch("appointment_type").replace("_", " ")}
                </button>
              </div>

              {form.watch("doctor_name") && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Doctor</span>
                  <button
                    onClick={() => setStep(3)}
                    className="text-sm font-medium hover:underline"
                  >
                    {form.watch("doctor_name")}
                  </button>
                </div>
              )}

              {form.watch("location") && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Location</span>
                  <button
                    onClick={() => setStep(3)}
                    className="text-sm font-medium hover:underline text-right"
                  >
                    {form.watch("location")}
                  </button>
                </div>
              )}
            </div>

            <div>
              <Label className="mb-2 block">Reminder</Label>
              <Select
                value={selectedReminder.toString()}
                onValueChange={(value) => {
                  setSelectedReminder(Number(value));
                  form.setValue("reminder_minutes_before", Number(value));
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reminderOptions.map(option => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Notes (Optional)</Label>
              <Textarea
                placeholder="Any additional notes or instructions"
                value={form.watch("notes")}
                onChange={(e) => form.setValue("notes", e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Action Button */}
      <div className="pt-4 pb-2">
        {step < 4 ? (
          <Button onClick={handleNext} size="lg" className="w-full h-12 text-base">
            Next
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        ) : (
          <Button
            onClick={() => onSubmit(form.getValues())}
            size="lg"
            className="w-full h-12 text-base"
          >
            <Check className="mr-2 h-5 w-5" />
            {appointment?.id ? "Update Appointment" : "Create Appointment"}
          </Button>
        )}
      </div>
    </div>
  );
}
