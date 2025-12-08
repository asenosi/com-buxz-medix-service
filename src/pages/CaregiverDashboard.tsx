import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Pill, CheckCircle2, XCircle, Clock, TrendingUp, AlertCircle, ArrowRight, RefreshCw } from "lucide-react";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Patient {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  access_level: string;
  granted_at: string;
}

interface PatientStats {
  userId: string;
  totalDosesToday: number;
  takenToday: number;
  missedToday: number;
  skippedToday: number;
  snoozedToday: number;
  adherenceRate: number;
  medications: Array<{
    id: string;
    name: string;
    dosage: string;
    form: string | null;
  }>;
}

const CaregiverDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientStats, setPatientStats] = useState<Map<string, PatientStats>>(new Map());
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPatients = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Get patients I have access to
      const { data: accessData, error: accessError } = await supabase
        .from("caregiver_access")
        .select("patient_user_id, access_level, granted_at")
        .eq("caregiver_user_id", session.user.id);

      if (accessError) throw accessError;

      if (!accessData || accessData.length === 0) {
        setPatients([]);
        setLoading(false);
        return;
      }

      // Get profiles for these patients
      const patientIds = accessData.map(a => a.patient_user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", patientIds);

      if (profilesError) throw profilesError;

      const patientsWithProfiles: Patient[] = accessData.map(access => {
        const profile = profilesData?.find(p => p.user_id === access.patient_user_id);
        return {
          user_id: access.patient_user_id,
          full_name: profile?.full_name || "Unknown Patient",
          avatar_url: profile?.avatar_url,
          access_level: access.access_level,
          granted_at: access.granted_at,
        };
      });

      setPatients(patientsWithProfiles);

      // Fetch stats for each patient
      await fetchAllPatientStats(patientIds);
    } catch (error) {
      console.error("Failed to fetch patients:", error);
      toast.error("Failed to load patient data");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchAllPatientStats = async (patientIds: string[]) => {
    const statsMap = new Map<string, PatientStats>();
    const today = new Date();
    const startOfToday = startOfDay(today).toISOString();
    const endOfToday = endOfDay(today).toISOString();

    for (const patientId of patientIds) {
      try {
        // Get medications for this patient
        const { data: meds } = await supabase
          .from("medications")
          .select("id, name, dosage, form")
          .eq("user_id", patientId)
          .eq("active", true);

        if (!meds || meds.length === 0) {
          statsMap.set(patientId, {
            userId: patientId,
            totalDosesToday: 0,
            takenToday: 0,
            missedToday: 0,
            skippedToday: 0,
            snoozedToday: 0,
            adherenceRate: 0,
            medications: [],
          });
          continue;
        }

        const medIds = meds.map(m => m.id);

        // Get today's dose logs
        const { data: logs } = await supabase
          .from("dose_logs")
          .select("status")
          .in("medication_id", medIds)
          .gte("scheduled_time", startOfToday)
          .lte("scheduled_time", endOfToday);

        // Get weekly logs for adherence rate
        const weekAgo = subDays(today, 7).toISOString();
        const { data: weeklyLogs } = await supabase
          .from("dose_logs")
          .select("status")
          .in("medication_id", medIds)
          .gte("scheduled_time", weekAgo);

        const takenToday = logs?.filter(l => l.status === "taken").length || 0;
        const skippedToday = logs?.filter(l => l.status === "skipped").length || 0;
        const missedToday = logs?.filter(l => l.status === "missed").length || 0;
        const snoozedToday = logs?.filter(l => l.status === "snoozed").length || 0;

        const weeklyTaken = weeklyLogs?.filter(l => l.status === "taken").length || 0;
        const weeklyTotal = weeklyLogs?.length || 1;

        statsMap.set(patientId, {
          userId: patientId,
          totalDosesToday: logs?.length || 0,
          takenToday,
          missedToday,
          skippedToday,
          snoozedToday,
          adherenceRate: Math.round((weeklyTaken / weeklyTotal) * 100),
          medications: meds,
        });
      } catch (error) {
        console.error(`Failed to fetch stats for patient ${patientId}:`, error);
      }
    }

    setPatientStats(statsMap);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPatients();
    setRefreshing(false);
    toast.success("Data refreshed");
  };

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Caregiver Dashboard</h1>
            <p className="text-muted-foreground">Monitor your patients' medication adherence</p>
          </div>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Patients Yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-4">
              You haven't been granted access to monitor any patients yet. Ask your patients to add you as a caregiver from their profile settings.
            </p>
            <Button variant="outline" onClick={() => navigate("/profile")}>
              Go to Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedStats = selectedPatient ? patientStats.get(selectedPatient) : null;
  const selectedPatientInfo = patients.find(p => p.user_id === selectedPatient);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Caregiver Dashboard</h1>
          <p className="text-muted-foreground">Monitor your patients' medication adherence</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Patient Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {patients.map(patient => {
              const stats = patientStats.get(patient.user_id);
              const progressPercent = stats?.totalDosesToday 
                ? Math.round((stats.takenToday / stats.totalDosesToday) * 100) 
                : 0;

              return (
                <Card 
                  key={patient.user_id} 
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedPatient === patient.user_id && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedPatient(patient.user_id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={patient.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {(patient.full_name || "U")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{patient.full_name}</CardTitle>
                        <CardDescription className="text-xs">
                          Since {format(new Date(patient.granted_at), "MMM d, yyyy")}
                        </CardDescription>
                      </div>
                      <Badge variant={patient.access_level === "full" ? "default" : "secondary"} className="text-xs">
                        {patient.access_level}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Today's Progress</span>
                      <span className="font-medium">{stats?.takenToday || 0}/{stats?.totalDosesToday || 0}</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                    
                    <div className="grid grid-cols-4 gap-2 pt-2">
                      <div className="text-center">
                        <div className="flex items-center justify-center w-8 h-8 mx-auto rounded-full bg-success/10">
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        </div>
                        <span className="text-xs text-muted-foreground mt-1 block">{stats?.takenToday || 0}</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center w-8 h-8 mx-auto rounded-full bg-destructive/10">
                          <XCircle className="w-4 h-4 text-destructive" />
                        </div>
                        <span className="text-xs text-muted-foreground mt-1 block">{stats?.skippedToday || 0}</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center w-8 h-8 mx-auto rounded-full bg-warning/10">
                          <Clock className="w-4 h-4 text-warning" />
                        </div>
                        <span className="text-xs text-muted-foreground mt-1 block">{stats?.snoozedToday || 0}</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center w-8 h-8 mx-auto rounded-full bg-muted">
                          <AlertCircle className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="text-xs text-muted-foreground mt-1 block">{stats?.missedToday || 0}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-1 text-sm">
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">7-day adherence:</span>
                      </div>
                      <Badge variant={stats?.adherenceRate && stats.adherenceRate >= 80 ? "default" : "destructive"}>
                        {stats?.adherenceRate || 0}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {!selectedPatient ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Select a patient from the overview to view details</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={selectedPatientInfo?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {(selectedPatientInfo?.full_name || "U")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{selectedPatientInfo?.full_name}</CardTitle>
                      <CardDescription>
                        {selectedStats?.medications.length || 0} active medications
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Today's Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        Taken
                      </span>
                      <span className="font-medium">{selectedStats?.takenToday || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-destructive" />
                        Skipped
                      </span>
                      <span className="font-medium">{selectedStats?.skippedToday || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-warning" />
                        Snoozed
                      </span>
                      <span className="font-medium">{selectedStats?.snoozedToday || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-muted-foreground" />
                        Missed
                      </span>
                      <span className="font-medium">{selectedStats?.missedToday || 0}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Medications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedStats?.medications.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No active medications</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedStats?.medications.map(med => (
                          <div key={med.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Pill className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{med.name}</p>
                              <p className="text-xs text-muted-foreground">{med.dosage} {med.form && `• ${med.form}`}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CaregiverDashboard;