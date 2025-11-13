import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon, List, Plus, Filter, Search, X, Grid } from "lucide-react";
import { AppointmentWizard } from "@/components/appointments/AppointmentWizard";
import { AppointmentCard } from "@/components/appointments/AppointmentCard";
import { AppointmentCalendar } from "@/components/appointments/AppointmentCalendar";
import { AppointmentFilters } from "@/components/appointments/AppointmentFilters";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
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

  const upcomingAppointments = filteredAppointments?.filter((apt) => {
    if (apt.status !== "scheduled") return false;
    const [year, month, day] = apt.appointment_date.split('-').map(Number);
    const [hours, minutes] = apt.appointment_time.split(':').map(Number);
    const appointmentDateTime = new Date(year, month - 1, day, hours, minutes);
    return appointmentDateTime > new Date();
  });

  const pastAppointments = filteredAppointments?.filter((apt) => {
    if (apt.status !== "scheduled") return true;
    const [year, month, day] = apt.appointment_date.split('-').map(Number);
    const [hours, minutes] = apt.appointment_time.split(':').map(Number);
    const appointmentDateTime = new Date(year, month - 1, day, hours, minutes);
    return appointmentDateTime <= new Date();
  });

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

      <Tabs value={view} onValueChange={(v) => setView(v as "list" | "calendar")} className="space-y-3">
        <TabsList className="grid w-full grid-cols-2 h-9 bg-muted/50 rounded-lg p-0.5">
          <TabsTrigger value="list" className="gap-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm transition-all">
            <List className="w-4 h-4" />
            <span>List</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm transition-all">
            <CalendarIcon className="w-4 h-4" />
            <span>Calendar</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-3 mt-0">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-12 animate-fade-in">
              Loading appointments...
            </div>
          ) : !appointments?.length ? (
            <Card className="text-center py-10 animate-fade-in relative overflow-visible border-2 border-dashed border-border rounded-xl">
              <CardContent className="pb-24">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center animate-scale-in">
                  <CalendarIcon className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold mb-2">No Appointments Yet</h2>
                <p className="text-sm text-muted-foreground px-4 max-w-md mx-auto mb-6">
                  Start organizing your healthcare by adding your first appointment.
                </p>
                <Button onClick={() => setDialogOpen(true)} size="default" className="mx-auto rounded-lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Appointment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="inline-flex h-9 items-center justify-center rounded-lg p-0.5 text-muted-foreground w-full">
                <button
                  onClick={() => setAppointmentView("upcoming")}
                  className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all flex-1 gap-1.5",
                    appointmentView === "upcoming" && "bg-background text-foreground shadow-sm"
                  )}
                >
                  Upcoming <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">{upcomingAppointments?.length || 0}</Badge>
                </button>
                <button
                  onClick={() => setAppointmentView("past")}
                  className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all flex-1 gap-1.5",
                    appointmentView === "past" && "bg-background text-foreground shadow-sm"
                  )}
                >
                  History <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs bg-muted text-muted-foreground">{pastAppointments?.length || 0}</Badge>
                </button>
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
                    <Card className="text-center py-8 animate-fade-in border-2 border-dashed border-border/50 rounded-xl bg-muted/20">
                      <CardContent className="space-y-3">
                        <div className="relative mx-auto w-14 h-14">
                          <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
                          <div className="relative w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                            <CalendarIcon className="w-7 h-7 text-primary" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <h3 className="text-base font-semibold text-foreground">No Upcoming Appointments</h3>
                          <p className="text-sm text-muted-foreground px-4 max-w-sm mx-auto">
                            Your schedule is clear. Add a new appointment to stay organized.
                          </p>
                        </div>
                        <Button 
                          onClick={() => setDialogOpen(true)} 
                          size="sm" 
                          className="mx-auto rounded-lg mt-2"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Schedule Appointment
                        </Button>
                      </CardContent>
                    </Card>
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
                    <Card className="text-center py-8 animate-fade-in border-2 border-dashed border-border/50 rounded-xl bg-muted/20">
                      <CardContent className="space-y-3">
                        <div className="relative mx-auto w-14 h-14">
                          <div className="absolute inset-0 rounded-full bg-muted-foreground/10 animate-pulse" />
                          <div className="relative w-14 h-14 rounded-full bg-muted-foreground/5 flex items-center justify-center">
                            <Grid className="w-7 h-7 text-muted-foreground/50" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <h3 className="text-base font-semibold text-foreground">No Past Appointments</h3>
                          <p className="text-sm text-muted-foreground px-4 max-w-sm mx-auto">
                            Your appointment history will appear here.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
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
