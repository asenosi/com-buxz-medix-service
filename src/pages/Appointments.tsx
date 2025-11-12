import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, List, Plus, Filter } from "lucide-react";
import { AppointmentWizard } from "@/components/appointments/AppointmentWizard";
import { AppointmentCard } from "@/components/appointments/AppointmentCard";
import { AppointmentCalendar } from "@/components/appointments/AppointmentCalendar";
import { AppointmentFilters } from "@/components/appointments/AppointmentFilters";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"] & {
  medications?: { name: string } | null;
};

export default function Appointments() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Partial<Appointment> | null>(null);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [filters, setFilters] = useState({
    status: "all",
    type: "all",
    dateFrom: null as Date | null,
    dateTo: null as Date | null,
  });
  const [showFilters, setShowFilters] = useState(false);

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

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedAppointment(null);
    refetch();
  };

  const upcomingAppointments = appointments?.filter(
    (apt) => apt.status === "scheduled" && new Date(apt.appointment_date) >= new Date()
  );

  const pastAppointments = appointments?.filter(
    (apt) => apt.status !== "scheduled" || new Date(apt.appointment_date) < new Date()
  );

  return (
    <div className="space-y-4 pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Appointments</h1>
          <p className="text-sm text-muted-foreground">Manage your medical appointments</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-5 h-5" />
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="flex-1 sm:flex-none">
            <Plus className="w-5 h-5 sm:mr-2" />
            <span className="sm:inline">Add</span>
          </Button>
        </div>
      </div>

      {showFilters && (
        <AppointmentFilters filters={filters} setFilters={setFilters} />
      )}

      <Tabs value={view} onValueChange={(v) => setView(v as "list" | "calendar")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="gap-2">
            <List className="w-4 h-4" />
            <span>List</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarIcon className="w-4 h-4" />
            <span>Calendar</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 mt-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-12">
              Loading appointments...
            </div>
          ) : !appointments?.length ? (
            <div className="text-center py-12 px-4 space-y-4">
              <CalendarIcon className="w-16 h-16 mx-auto text-muted-foreground/50" />
              <div>
                <h3 className="text-lg font-medium text-foreground">No appointments yet</h3>
                <p className="text-sm text-muted-foreground">
                  Create your first appointment to get started
                </p>
              </div>
              <Button onClick={() => setDialogOpen(true)} size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Add Your First Appointment
              </Button>
            </div>
          ) : (
            <>
              {upcomingAppointments && upcomingAppointments.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground px-1">
                    Upcoming
                  </h2>
                  <div className="space-y-3">
                    {upcomingAppointments.map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                      />
                    ))}
                  </div>
                </div>
              )}

              {pastAppointments && pastAppointments.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground px-1">
                    Past
                  </h2>
                  <div className="space-y-3">
                    {pastAppointments.map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <AppointmentCalendar
            appointments={appointments || []}
            onAppointmentClick={(appointment) => {
              setSelectedAppointment(appointment);
              setDialogOpen(true);
            }}
            onDateClick={(date) => {
              setSelectedAppointment({ appointment_date: format(date, "yyyy-MM-dd") });
              setDialogOpen(true);
            }}
          />
        </TabsContent>
      </Tabs>

      <AppointmentWizard
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        appointment={selectedAppointment}
      />
    </div>
  );
}
