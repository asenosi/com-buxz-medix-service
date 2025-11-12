import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Clock, AlarmClock, FileText, MapPin, User, X, ChevronRight } from "lucide-react";
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

interface AppointmentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Partial<Appointment>;
}

export function AppointmentWizard({ open, onOpenChange, appointment }: AppointmentWizardProps) {
  const [step, setStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [selectedReminder, setSelectedReminder] = useState(60);

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
        .select("id, appointment_date, appointment_time, duration_minutes")
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
      // Editing existing appointment - pre-fill and go to review
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
      setStep(5); // Skip to review for editing
    } else if (appointment && appointment.appointment_date) {
      // Creating new appointment with pre-selected date - start from date step
      const appointmentDate = new Date(appointment.appointment_date);
      setSelectedDate(appointmentDate);
      setSelectedTime("09:00");
      setSelectedReminder(60);
      form.reset({
        title: "",
        description: "",
        appointment_date: appointmentDate,
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
      setStep(1); // Start from date selection (already pre-filled)
    } else {
      // Creating new appointment from scratch
      setStep(0);
      setSelectedDate(new Date());
      setSelectedTime("09:00");
      setSelectedReminder(60);
      form.reset();
    }
  }, [appointment, form, open]);

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

    const { data: insertedAppointment, error } = appointment?.id
      ? await supabase.from("appointments").update(appointmentData).eq("id", appointment.id).select().single()
      : await supabase.from("appointments").insert([appointmentData]).select().single();

    if (error) {
      console.error("Appointment error:", error);
      toast.error(`Failed to ${appointment?.id ? "update" : "create"} appointment: ${error.message}`);
    } else {
      toast.success(`Appointment ${appointment?.id ? "updated" : "created"} successfully`);
      onOpenChange(false);
      setStep(0);
    }
  };

  const checkAppointmentConflict = () => {
    if (!appointments) return null;

    const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
    const [selectedHours, selectedMinutes] = selectedTime.split(":").map(Number);
    const selectedStartMinutes = selectedHours * 60 + selectedMinutes;
    const selectedDuration = form.watch("duration_minutes") || 30;
    const selectedEndMinutes = selectedStartMinutes + selectedDuration;

    // Filter appointments on the same day (excluding current appointment if editing)
    const sameDayAppointments = appointments.filter(
      (apt) => apt.appointment_date === selectedDateStr && apt.id !== appointment?.id
    );

    for (const apt of sameDayAppointments) {
      const [aptHours, aptMinutes] = apt.appointment_time.split(":").map(Number);
      const aptStartMinutes = aptHours * 60 + aptMinutes;
      const aptEndMinutes = aptStartMinutes + (apt.duration_minutes || 30);

      // Check for exact same time
      if (selectedStartMinutes === aptStartMinutes) {
        return {
          type: "error",
          message: "An appointment already exists at this exact time. Please choose a different time.",
        };
      }

      // Check for overlap
      if (
        (selectedStartMinutes >= aptStartMinutes && selectedStartMinutes < aptEndMinutes) ||
        (selectedEndMinutes > aptStartMinutes && selectedEndMinutes <= aptEndMinutes) ||
        (selectedStartMinutes <= aptStartMinutes && selectedEndMinutes >= aptEndMinutes)
      ) {
        return {
          type: "error",
          message: `This appointment overlaps with another appointment at ${apt.appointment_time}. Please choose a different time.`,
        };
      }

      // Check for appointments within 30 minutes
      const timeDiff = Math.abs(selectedStartMinutes - aptStartMinutes);
      if (timeDiff < 30) {
        return {
          type: "warning",
          message: `Warning: This appointment is only ${timeDiff} minutes away from another appointment at ${apt.appointment_time}. Make sure you have enough time.`,
        };
      }
    }

    return null;
  };

  const handleNext = () => {
    if (step === 0) {
      form.setValue("appointment_date", selectedDate);
      setStep(1);
    } else if (step === 1) {
      form.setValue("appointment_date", selectedDate);
      setStep(2);
    } else if (step === 2) {
      // Validate time is not empty
      if (!selectedTime || selectedTime.trim() === "") {
        toast.error("Please select a time for your appointment.");
        return;
      }
      
      form.setValue("appointment_time", selectedTime);
      
      // Check if the selected date/time is in the past
      const now = new Date();
      const selectedDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(":").map(Number);
      selectedDateTime.setHours(hours, minutes, 0, 0);
      
      // Allow current day appointments as long as the time hasn't passed
      if (selectedDateTime <= now) {
        toast.error("Cannot schedule appointments in the past. Please select a future time.");
        return;
      }
      
      // Check for conflicts before proceeding
      const conflict = checkAppointmentConflict();
      if (conflict) {
        if (conflict.type === "error") {
          toast.error(conflict.message);
          return;
        } else if (conflict.type === "warning") {
          toast.warning(conflict.message);
        }
      }
      
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const reminderOptions = [
    { value: 30, label: "30 minutes before" },
    { value: 60, label: "1 hour before" },
    { value: 480, label: "8 hours before" },
    { value: 720, label: "12 hours before" },
    { value: 1440, label: "1 day before" },
    { value: 10080, label: "1 week before" },
    { value: 0, label: "No need for reminder" },
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
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        {/* Intro Screen */}
        {step === 0 && !appointment && (
          <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[600px] bg-background">
            <DialogHeader className="sr-only">
              <DialogTitle>Add Appointment</DialogTitle>
              <DialogDescription>Track your medical appointments</DialogDescription>
            </DialogHeader>

            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-primary/10 mb-4">
                  <CalendarIcon className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold mb-3 flex items-center justify-center gap-2">
                <CalendarIcon className="h-7 w-7 sm:h-8 sm:w-8" />
                Appointments
              </h2>

              <p className="text-lg sm:text-xl font-semibold mb-2">
                Track appointments and doctor visits
              </p>

              <p className="text-sm sm:text-base text-muted-foreground max-w-md mb-8">
                Keep all your health visits in one place. Get assistance preparing for and summarizing visits.
              </p>

              <Button
                onClick={() => setStep(1)}
                size="lg"
                className="w-full max-w-md h-12 sm:h-14 text-base sm:text-lg rounded-full"
              >
                Add an appointment
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Date Selection */}
        {step === 1 && (
          <div className="flex flex-col h-[600px]">
            <DialogHeader className="p-6 pb-4 space-y-4 shrink-0">
              <DialogTitle className="sr-only">Add Appointment - Select Date</DialogTitle>
              <DialogDescription className="sr-only">Choose the date for your appointment</DialogDescription>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                  <CalendarIcon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-2xl font-semibold">Add appointment</div>
              </div>
            </DialogHeader>

            <div className="flex-1 flex flex-col px-6 pb-6 min-h-0">
              <div className="mb-4">
                <h3 className="text-xl font-semibold mb-2">When is your appointment?</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary"></span>
                  Dates with existing appointments
                </p>
              </div>
              
              <div className="flex-1 flex items-center justify-center overflow-auto">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      form.setValue("appointment_date", date);
                    }
                  }}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  className="rounded-md border pointer-events-auto"
                  modifiers={{
                    hasAppointment: appointments?.map(apt => new Date(apt.appointment_date)) || [],
                  }}
                  modifiersClassNames={{
                    hasAppointment: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-primary",
                  }}
                  classNames={{
                    months: "space-y-4",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center",
                    caption_label: "text-base font-semibold",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-9 w-9",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell: "text-muted-foreground rounded-md w-10 font-normal text-sm",
                    row: "flex w-full mt-2",
                    cell: "h-10 w-10 text-center text-sm p-0 relative",
                    day: "h-10 w-10 p-0 font-normal",
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  }}
                />
              </div>

              <p className="text-center text-muted-foreground my-4">
                {getRelativeDate(selectedDate)}
              </p>

              <Button onClick={handleNext} size="lg" className="w-full h-14 text-lg rounded-full shrink-0">
                Next
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Time Selection */}
        {step === 2 && (
          <div className="flex flex-col h-[600px]">
            <DialogHeader className="p-6 pb-4 space-y-4 shrink-0">
              <DialogTitle className="sr-only">Add Appointment - Select Time</DialogTitle>
              <DialogDescription className="sr-only">Choose the time for your appointment</DialogDescription>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div className="text-2xl font-semibold">Add appointment</div>
              </div>
            </DialogHeader>

            <div className="flex-1 flex flex-col px-6 pb-6 min-h-0">
              <h3 className="text-xl font-semibold mb-6">What time is your appointment?</h3>
              
              <div className="flex-1 flex items-center justify-center">
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="text-5xl h-28 text-center font-light border-none shadow-none focus-visible:ring-0"
                  style={{ fontSize: '3rem' }}
                />
              </div>

              <Button onClick={handleNext} size="lg" className="w-full h-14 text-lg rounded-full shrink-0">
                Next
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Appointment Details */}
        {step === 3 && (
          <div className="flex flex-col h-[600px]">
            <DialogHeader className="p-6 pb-4 space-y-4 shrink-0">
              <DialogTitle className="sr-only">Add Appointment - Details</DialogTitle>
              <DialogDescription className="sr-only">Enter appointment details</DialogDescription>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="text-2xl font-semibold">Add appointment</div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
              <div>
                <Label>Appointment Title *</Label>
                <Input
                  placeholder="e.g., Annual checkup"
                  value={form.watch("title")}
                  onChange={(e) => form.setValue("title", e.target.value)}
                  className="h-12 text-lg"
                />
              </div>

              <div>
                <Label>Appointment Type</Label>
                <Select
                  value={form.watch("appointment_type")}
                  onValueChange={(value) => form.setValue("appointment_type", value)}
                >
                  <SelectTrigger className="h-12 text-base">
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
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </Label>
                <Input
                  placeholder="e.g., City Hospital, Room 204"
                  value={form.watch("location")}
                  onChange={(e) => form.setValue("location", e.target.value)}
                  className="h-12 text-base"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Doctor Name
                </Label>
                <Input
                  placeholder="e.g., Dr. Smith"
                  value={form.watch("doctor_name")}
                  onChange={(e) => form.setValue("doctor_name", e.target.value)}
                  className="h-12 text-base"
                />
              </div>
            </div>

            <div className="px-6 pb-6 shrink-0">
              <Button
                onClick={handleNext}
                disabled={!form.watch("title")}
                size="lg"
                className="w-full h-14 text-lg rounded-full"
              >
                Next
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Reminder Selection */}
        {step === 4 && (
          <div className="flex flex-col h-[600px]">
            <DialogHeader className="p-6 pb-4 space-y-4 shrink-0">
              <DialogTitle className="sr-only">Add Appointment - Reminder</DialogTitle>
              <DialogDescription className="sr-only">Set appointment reminder preferences</DialogDescription>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                  <AlarmClock className="h-6 w-6 text-primary" />
                </div>
                <div className="text-2xl font-semibold">Add appointment</div>
              </div>
            </DialogHeader>

            <div className="flex-1 flex flex-col px-6 pb-6 min-h-0">
              <h3 className="text-xl font-semibold mb-4">When would you like to be reminded?</h3>
              
              <div className="flex-1 space-y-2 overflow-y-auto">
                {reminderOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedReminder(option.value)}
                    className={cn(
                      "w-full p-4 text-left rounded-lg border transition-colors text-base",
                      selectedReminder === option.value
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-accent"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <Button
                onClick={() => {
                  form.setValue("reminder_minutes_before", selectedReminder);
                  setStep(5);
                }}
                size="lg"
                className="w-full h-14 text-lg rounded-full mt-4 shrink-0"
              >
                Next
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Review & Additional Details */}
        {step === 5 && (
          <div className="flex flex-col h-[600px]">
            <DialogHeader className="p-6 pb-4 space-y-4 border-b shrink-0">
              <DialogTitle className="sr-only">{appointment?.id ? "Edit Appointment" : "Review Appointment"}</DialogTitle>
              <DialogDescription className="sr-only">Review and finalize appointment details</DialogDescription>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                  <CalendarIcon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-xl font-semibold">
                  {appointment?.id ? "Edit Appointment" : "Review your appointment details"}
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4 pb-8 space-y-4 min-h-0">
              {/* Main Details - Click to Edit */}
              <div className="space-y-2 pb-4 border-b">
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent text-left transition-colors"
                >
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="flex-1 font-medium text-sm">{form.watch("title") || "Appointment"}</span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </button>

                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent text-left transition-colors"
                >
                  <CalendarIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <span className="font-medium text-sm">
                      {format(selectedDate, "EEE, d MMM")}
                    </span>
                    <span className="ml-3 font-medium text-sm">{selectedTime}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </button>

                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent text-left transition-colors"
                >
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="flex-1 font-medium text-sm">{form.watch("location") || "Add location"}</span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </button>

                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent text-left transition-colors"
                >
                  <User className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="flex-1 font-medium text-sm">{form.watch("doctor_name") || "Add doctor"}</span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </button>

                <button
                  onClick={() => setStep(4)}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent text-left transition-colors"
                >
                  <AlarmClock className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="flex-1 font-medium text-sm">
                    {reminderOptions.find(opt => opt.value === selectedReminder)?.label}
                  </span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </button>
              </div>

              {/* Additional Details - Directly Editable */}
              <div className="space-y-3">
                <h4 className="font-semibold text-primary text-sm">Add additional details:</h4>

                <div>
                  <Label className="flex items-center gap-2 mb-1.5 text-xs">
                    <FileText className="h-3.5 w-3.5" />
                    Notes
                  </Label>
                  <Textarea
                    placeholder="Add any notes..."
                    value={form.watch("notes")}
                    onChange={(e) => form.setValue("notes", e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={() => form.handleSubmit(onSubmit)()}
              disabled={!form.watch("title")}
              size="lg"
              className="w-full h-14 text-lg rounded-full mx-6 mb-6 mt-4 shrink-0"
            >
              Save
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
