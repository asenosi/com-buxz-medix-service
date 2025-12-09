import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon, Plus, Filter, Search, X } from "lucide-react";
import { AppointmentWizard } from "@/components/appointments/AppointmentWizard";
import { AppointmentFilters } from "@/components/appointments/AppointmentFilters";
import { CalendarSyncDialog } from "@/components/appointments/CalendarSyncDialog";
import { AppointmentWeekStrip, RelativeDateLabel } from "@/components/appointments/AppointmentWeekStrip";
import { AppointmentListItem } from "@/components/appointments/AppointmentListItem";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import { useHaptic } from "@/hooks/use-haptic";
import { cn } from "@/lib/utils";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"] & {
  medications?: { name: string } | null;
};

export default function Appointments() {
  const queryClient = useQueryClient();
  const { triggerHaptic } = useHaptic();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Partial<Appointment> | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filters, setFilters] = useState({
    status: "all",
    type: "all",
    dateFrom: null as Date | null,
    dateTo: null as Date | null,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [createdAppointmentId, setCreatedAppointmentId] = useState<string | null>(null);

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedAppointment(null);
    refetch();
  };

  const handleAppointmentCreated = (appointmentId: string, shouldSync: boolean) => {
    // Only show sync dialog for new appointments or rescheduled ones
    if (shouldSync) {
      setCreatedAppointmentId(appointmentId);
      setSyncDialogOpen(true);
    }
  };

  const handleSyncDialogClose = () => {
    setSyncDialogOpen(false);
    setCreatedAppointmentId(null);
    refetch();
  };

  const { data: appointments, isLoading, refetch } = useQuery({
    queryKey: ["appointments", filters],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select("*, medications(name)")
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      if (filters.status !== "all") {
        query = query.eq("status", filters.status as Database["public"]["Enums"]["appointment_status"]);
      }
      if (filters.type !== "all") {
        query = query.eq("appointment_type", filters.type as Database["public"]["Enums"]["appointment_type"]);
      }
      if (filters.dateFrom) {
        query = query.gte("appointment_date", format(filters.dateFrom, "yyyy-MM-dd"));
      }
      if (filters.dateTo) {
        query = query.lte("appointment_date", format(filters.dateTo, "yyyy-MM-dd"));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Real-time subscription for appointments
  useEffect(() => {
    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        () => {
          // Invalidate and refetch appointments when any change occurs
          queryClient.invalidateQueries({ queryKey: ["appointments"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Filter appointments by search query
  const filteredAppointments = appointments?.filter((apt) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      apt.title?.toLowerCase().includes(searchLower) ||
      apt.doctor_name?.toLowerCase().includes(searchLower) ||
      apt.location?.toLowerCase().includes(searchLower) ||
      apt.appointment_type?.toLowerCase().includes(searchLower)
    );
  });

  // Get appointments for selected date
  const appointmentsForSelectedDate = filteredAppointments?.filter((apt) =>
    isSameDay(new Date(apt.appointment_date), selectedDate)
  ) || [];

  // Count active filters
  const activeFilterCount = [
    filters.status !== "all",
    filters.type !== "all",
    filters.dateFrom !== null,
    filters.dateTo !== null,
  ].filter(Boolean).length;

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      status: "all",
      type: "all",
      dateFrom: null,
      dateTo: null,
    });
  };

  // Remove individual filter
  const removeFilter = (filterKey: keyof typeof filters) => {
    if (filterKey === "dateFrom" || filterKey === "dateTo") {
      setFilters({ ...filters, [filterKey]: null });
    } else {
      setFilters({ ...filters, [filterKey]: "all" });
    }
  };

  return (
    <div className="space-y-3 pb-4">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Appointments</h1>
        <p className="text-sm text-muted-foreground">
          Track your health visits and doctor appointments
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search appointments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 transition-all"
            />
          </div>
          <Button
            variant="outline"
            className="relative h-10 px-3 transition-all"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full animate-scale-in"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {filters.status !== "all" && (
              <Badge variant="secondary" className="gap-1.5 pr-1">
                Status: {filters.status}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeFilter("status")}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
            {filters.type !== "all" && (
              <Badge variant="secondary" className="gap-1.5 pr-1">
                Type: {filters.type.replace("_", " ")}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeFilter("type")}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
            {filters.dateFrom && (
              <Badge variant="secondary" className="gap-1.5 pr-1">
                From: {format(filters.dateFrom, "MMM dd")}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeFilter("dateFrom")}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
            {filters.dateTo && (
              <Badge variant="secondary" className="gap-1.5 pr-1">
                To: {format(filters.dateTo, "MMM dd")}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeFilter("dateTo")}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-7 text-xs"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {showFilters && (
        <AppointmentFilters filters={filters} setFilters={setFilters} />
      )}

      {/* Week Calendar Strip */}
      <AppointmentWeekStrip
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        appointments={filteredAppointments || []}
      />

      {/* Appointments for Selected Date */}
      <div className="space-y-3">
        <RelativeDateLabel date={selectedDate} />

        {isLoading ? (
          <div className="text-center text-muted-foreground py-12 animate-fade-in">
            Loading appointments...
          </div>
        ) : appointmentsForSelectedDate.length === 0 ? (
          <Card className="text-center py-10 animate-fade-in border-2 border-dashed border-border rounded-xl">
            <CardContent>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <CalendarIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold mb-1 text-foreground">No events</h2>
              <p className="text-sm text-muted-foreground mb-4">
                No appointments scheduled for this date
              </p>
              <Button 
                onClick={() => {
                  setSelectedAppointment({ appointment_date: format(selectedDate, "yyyy-MM-dd") });
                  setDialogOpen(true);
                }} 
                size="sm"
                variant="outline"
                className="rounded-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Appointment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {appointmentsForSelectedDate.map((appointment) => (
              <AppointmentListItem
                key={appointment.id}
                appointment={appointment}
              />
            ))}
          </div>
        )}
      </div>

      <AppointmentWizard
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        appointment={selectedAppointment}
        onAppointmentCreated={handleAppointmentCreated}
      />

      <CalendarSyncDialog
        open={syncDialogOpen}
        onOpenChange={handleSyncDialogClose}
        appointmentId={createdAppointmentId || ""}
      />

      <Button
        size="lg"
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 rounded-full h-16 w-16 sm:h-20 sm:w-20 shadow-2xl hover:scale-110 transition-all duration-300 bg-primary hover:bg-primary/90"
        onClick={() => {
          triggerHaptic("light");
          setDialogOpen(true);
        }}
      >
        <Plus className="h-8 w-8" />
      </Button>
    </div>
  );
}
