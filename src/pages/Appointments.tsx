import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon, List, Plus, Filter, Search, X, CalendarCheck } from "lucide-react";
import { AppointmentWizard } from "@/components/appointments/AppointmentWizard";
import { AppointmentCard } from "@/components/appointments/AppointmentCard";
import { AppointmentCalendar } from "@/components/appointments/AppointmentCalendar";
import { AppointmentFilters } from "@/components/appointments/AppointmentFilters";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FloatingActionButton } from "@/components/FloatingActionButton";
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
  const [appointmentView, setAppointmentView] = useState<"upcoming" | "past">("upcoming");
  const [searchQuery, setSearchQuery] = useState("");

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

  const upcomingAppointments = filteredAppointments?.filter(
    (apt) => apt.status === "scheduled" && new Date(apt.appointment_date) >= new Date()
  );

  const pastAppointments = filteredAppointments?.filter(
    (apt) => apt.status !== "scheduled" || new Date(apt.appointment_date) < new Date()
  );

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
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Appointments</h1>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search doctors, appointments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="relative h-11 w-11 shrink-0"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1.5 -right-1.5 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full"
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

      <Tabs value={view} onValueChange={(v) => setView(v as "list" | "calendar")} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 h-11">
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
            <Card className="text-center py-16 sm:py-20 animate-fade-in border-none shadow-none bg-background">
              <CardContent className="space-y-6">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10">
                  <CalendarCheck className="w-12 h-12 text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-semibold text-foreground">No Appointments Yet</h2>
                  <p className="text-sm sm:text-base text-muted-foreground px-4 max-w-md mx-auto leading-relaxed">
                    Schedule your first appointment and take control of your healthcare journey. We'll remind you so you never miss a visit.
                  </p>
                </div>
                <Button 
                  onClick={() => setDialogOpen(true)}
                  size="lg"
                  className="mt-4"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Schedule Your First Visit
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Segmented Control */}
              <div className="inline-flex w-full p-1 bg-muted rounded-lg">
                <Button
                  variant={appointmentView === "upcoming" ? "default" : "ghost"}
                  onClick={() => setAppointmentView("upcoming")}
                  className="flex-1 h-9 rounded-md transition-all"
                >
                  Upcoming ({upcomingAppointments?.length || 0})
                </Button>
                <Button
                  variant={appointmentView === "past" ? "default" : "ghost"}
                  onClick={() => setAppointmentView("past")}
                  className="flex-1 h-9 rounded-md transition-all"
                >
                  Past ({pastAppointments?.length || 0})
                </Button>
              </div>

              {appointmentView === "upcoming" && (
                <>
                  {upcomingAppointments && upcomingAppointments.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingAppointments.map((appointment) => (
                        <AppointmentCard
                          key={appointment.id}
                          appointment={appointment}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No upcoming appointments
                    </div>
                  )}
                </>
              )}

              {appointmentView === "past" && (
                <>
                  {pastAppointments && pastAppointments.length > 0 ? (
                    <div className="space-y-3">
                      {pastAppointments.map((appointment) => (
                        <AppointmentCard
                          key={appointment.id}
                          appointment={appointment}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No past appointments
                    </div>
                  )}
                </>
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

      {/* Floating Action Button */}
      <FloatingActionButton
        actions={[
          {
            label: "Add Appointment",
            icon: <Plus className="h-6 w-6" />,
            onClick: () => setDialogOpen(true),
            color: "bg-primary hover:bg-primary/90",
          },
        ]}
      />
    </div>
  );
}
