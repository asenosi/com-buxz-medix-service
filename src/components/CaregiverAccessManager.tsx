import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users, UserPlus, Trash2, Shield, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Caregiver {
  id: string;
  caregiver_user_id: string;
  access_level: string;
  granted_at: string;
  email?: string;
}

export const CaregiverAccessManager = () => {
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingCaregiver, setAddingCaregiver] = useState(false);
  const [newCaregiverEmail, setNewCaregiverEmail] = useState("");
  const [newAccessLevel, setNewAccessLevel] = useState<"view" | "full">("view");

  const fetchCaregivers = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("caregiver_access")
        .select("*")
        .eq("patient_user_id", session.user.id);

      if (error) throw error;
      setCaregivers(data || []);
    } catch (error) {
      console.error("Failed to fetch caregivers:", error);
      toast.error("Failed to load caregivers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCaregivers();
  }, [fetchCaregivers]);

  const handleAddCaregiver = async () => {
    if (!newCaregiverEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setAddingCaregiver(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Look up user by email - we need to find the user_id
      // Since we can't query auth.users directly, we'll use the profiles table
      // First, let's check if this user exists in profiles
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("full_name", `%${newCaregiverEmail}%`)
        .limit(1);

      // For demo purposes, we'll create a placeholder - in production you'd have email lookup
      // This is a limitation since we can't directly query auth.users
      
      // For now, let's assume the email is actually a user_id (UUID) for testing
      const caregiverUserId = newCaregiverEmail.trim();
      
      // Validate it looks like a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(caregiverUserId)) {
        toast.error("Please enter a valid user ID. Ask your caregiver for their user ID from their profile page.");
        setAddingCaregiver(false);
        return;
      }

      // Check if already added
      const existing = caregivers.find(c => c.caregiver_user_id === caregiverUserId);
      if (existing) {
        toast.error("This caregiver has already been added");
        setAddingCaregiver(false);
        return;
      }

      // Can't add yourself
      if (caregiverUserId === session.user.id) {
        toast.error("You cannot add yourself as a caregiver");
        setAddingCaregiver(false);
        return;
      }

      const { error } = await supabase
        .from("caregiver_access")
        .insert({
          patient_user_id: session.user.id,
          caregiver_user_id: caregiverUserId,
          access_level: newAccessLevel,
        });

      if (error) throw error;

      toast.success("Caregiver added successfully");
      setNewCaregiverEmail("");
      fetchCaregivers();
    } catch (error) {
      console.error("Failed to add caregiver:", error);
      toast.error("Failed to add caregiver");
    } finally {
      setAddingCaregiver(false);
    }
  };

  const handleRemoveCaregiver = async (caregiverId: string) => {
    try {
      const { error } = await supabase
        .from("caregiver_access")
        .delete()
        .eq("id", caregiverId);

      if (error) throw error;

      toast.success("Caregiver access revoked");
      fetchCaregivers();
    } catch (error) {
      console.error("Failed to remove caregiver:", error);
      toast.error("Failed to remove caregiver");
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-32 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Caregiver Access</CardTitle>
        </div>
        <CardDescription>
          Allow family members or caregivers to monitor your medication adherence
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Caregiver Form */}
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="caregiver-id">Caregiver User ID</Label>
            <Input
              id="caregiver-id"
              placeholder="Enter caregiver's user ID (from their profile)"
              value={newCaregiverEmail}
              onChange={(e) => setNewCaregiverEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Ask your caregiver to copy their User ID from their profile page
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Access Level</Label>
            <Select value={newAccessLevel} onValueChange={(v: "view" | "full") => setNewAccessLevel(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>View Only</span>
                  </div>
                </SelectItem>
                <SelectItem value="full">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>Full Access</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              View only: Can see medications and adherence. Full access: Can also manage doses.
            </p>
          </div>

          <Button 
            onClick={handleAddCaregiver} 
            disabled={addingCaregiver || !newCaregiverEmail.trim()}
            className="w-full"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {addingCaregiver ? "Adding..." : "Add Caregiver"}
          </Button>
        </div>

        {/* Current Caregivers List */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Current Caregivers</h4>
          
          {caregivers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No caregivers added yet
            </p>
          ) : (
            <div className="space-y-2">
              {caregivers.map((caregiver) => (
                <div
                  key={caregiver.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        CG
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[150px]">
                        {caregiver.caregiver_user_id.slice(0, 8)}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added {format(new Date(caregiver.granted_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={caregiver.access_level === "full" ? "default" : "secondary"}>
                      {caregiver.access_level === "full" ? (
                        <><Shield className="w-3 h-3 mr-1" /> Full</>
                      ) : (
                        <><Eye className="w-3 h-3 mr-1" /> View</>
                      )}
                    </Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke Access?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This caregiver will no longer be able to view your medications or adherence data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveCaregiver(caregiver.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Revoke Access
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};