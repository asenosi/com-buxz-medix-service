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
import { FloatingActionButton } from "@/components/FloatingActionButton";
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
      <div className="space-y-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Appointments</h1>
        <div className="border-2 border-dashed border-border rounded-lg p-4 bg-muted/30">
          <h3 className="font-semibold text-foreground mb-1">Track appointments and doctor visits</h3>
          <p className="text-sm text-muted-foreground">
            Keep all your health visits in one place. Get assistance preparing for and summarizing visits.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search appointments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <Button
            variant="outline"
            className="relative h-11 px-4"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
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
        <TabsList className="grid w-full grid-cols-2 h-11 bg-muted rounded-xl">
          <TabsTrigger value="list" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <List className="w-4 h-4" />
            <span>List</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
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
            <Card className="text-center py-12 sm:py-16 animate-fade-in relative overflow-visible border-2 border-dashed border-border rounded-2xl">
              <CardContent className="pb-32 sm:pb-40">
                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <CalendarIcon className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold mb-3">No Appointments Yet</h2>
                <p className="text-sm sm:text-base text-muted-foreground px-4 max-w-md mx-auto mb-8">
                  Start organizing your healthcare by adding your first appointment. Never miss a doctor's visit again.
                </p>
                <Button onClick={() => setDialogOpen(true)} size="lg" className="mx-auto rounded-xl h-12 px-6">
                  <Plus className="w-5 h-5 mr-2" />
                  Add Appointment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="inline-flex h-11 items-center justify-center rounded-xl bg-muted p-1 text-muted-foreground w-full">
                <button
                  onClick={() => setAppointmentView("upcoming")}
                  className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1",
                    appointmentView === "upcoming" && "bg-background text-foreground shadow-sm"
                  )}
                >
                  Upcoming <Badge variant="secondary" className="ml-2 text-xs">{upcomingAppointments?.length || 0}</Badge>
                </button>
                <button
                  onClick={() => setAppointmentView("past")}
                  className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1",
                    appointmentView === "past" && "bg-background text-foreground shadow-sm"
                  )}
                >
                  Past <Badge variant="secondary" className="ml-2 text-xs">{pastAppointments?.length || 0}</Badge>
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
                    <Card className="text-center py-12 animate-fade-in border-2 border-dashed border-border/50 rounded-2xl bg-muted/20">
                      <CardContent className="space-y-4">
                        <div className="relative mx-auto w-16 h-16">
                          <div className="absolute inset-0 rounded-full bg-primary/20 animate-glow" />
                          <div className="relative w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-float">
                            <CalendarIcon className="w-8 h-8 text-primary" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-foreground">No Upcoming Appointments</h3>
                          <p className="text-sm text-muted-foreground px-4 max-w-sm mx-auto">
                            Your schedule is clear. Add a new appointment to stay on top of your health visits.
                          </p>
                        </div>
                        <Button 
                          onClick={() => setDialogOpen(true)} 
                          size="default" 
                          className="mx-auto rounded-xl mt-4 animate-scale-in"
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
                    <Card className="text-center py-12 animate-fade-in border-2 border-dashed border-border/50 rounded-2xl bg-muted/20">
                      <CardContent className="space-y-4">
                        <div className="relative mx-auto w-16 h-16">
                          <div className="absolute inset-0 rounded-full bg-muted-foreground/10 animate-pulse-slow" />
                          <div className="relative w-16 h-16 rounded-full bg-muted-foreground/5 flex items-center justify-center">
                            <Grid className="w-8 h-8 text-muted-foreground/50" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-foreground">No Past Appointments</h3>
                          <p className="text-sm text-muted-foreground px-4 max-w-sm mx-auto">
                            Your appointment history will appear here once you complete or cancel scheduled appointments.
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

      <FloatingActionButton
        actions={[
          {
            label: "Add Appointment",
            icon: <Plus className="h-6 w-6" />,
            onClick: () => {
              triggerHaptic("light");
              setDialogOpen(true);
            },
            color: "bg-primary hover:bg-primary/90",
          },
        ]}
      />
    </div>
  );
}
