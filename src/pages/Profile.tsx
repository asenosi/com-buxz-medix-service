import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ThemePicker from "@/components/ThemePicker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Phone, ShieldCheck, User as UserIcon } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type ProfileRow = {
  id?: string;
  user_id: string;
  full_name: string | null;
  date_of_birth: string | null;
  phone_number: string | null;
  is_caregiver: boolean | null;
  avatar_url?: string | null;
};

const Profile = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [isCaregiver, setIsCaregiver] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initials = useMemo(() => {
    const src = fullName?.trim() || session?.user?.email || "";
    const parts = src.split(/[\s@._-]+/).filter(Boolean).slice(0, 2);
    return parts.map(p => p.charAt(0).toUpperCase()).join("") || "U";
  }, [fullName, session]);

  const loadProfile = useCallback(async (userId: string, userMetadata?: { full_name?: string }) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (!data) {
        const { error: insertError } = await supabase.from("profiles").insert({
          user_id: userId,
          full_name: userMetadata?.full_name ?? null,
        });
        if (insertError) throw insertError;
        setFullName(userMetadata?.full_name ?? "");
        setDob("");
        setPhone("");
        setIsCaregiver(false);
        setAvatarUrl(null);
      } else {
        setFullName(data.full_name ?? "");
        setDob(data.date_of_birth ?? "");
        setPhone(data.phone_number ?? "");
        setIsCaregiver(Boolean(data.is_caregiver));
        
        // Load avatar from storage if it exists
        if (userId) {
          const { data: files } = await supabase.storage
            .from("avatars")
            .list(userId, { limit: 1, sortBy: { column: "created_at", order: "desc" } });
          
          if (files && files.length > 0) {
            const { data: urlData } = supabase.storage
              .from("avatars")
              .getPublicUrl(`${userId}/${files[0].name}`);
            setAvatarUrl(urlData.publicUrl);
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load profile");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session: current } } = await supabase.auth.getSession();
      setSession(current);
      if (!current) {
        navigate("/auth");
        return;
      }
      await loadProfile(current.user.id, current.user.user_metadata);
      setLoading(false);
    };
    init();
  }, [navigate, loadProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border sticky top-0 z-40 backdrop-blur-sm bg-card/80">
          <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="h-8" />
          </div>
        </header>
        <ProfilePageSkeleton />
      </div>
    );
  }

  const handleSave = async () => {
    if (!session) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: session.user.id,
          full_name: fullName || null,
          date_of_birth: dob || null,
          phone_number: phone || null,
          is_caregiver: isCaregiver,
        }, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Profile updated");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save profile");
    }
  };

  const handleDeleteAllMedications = async () => {
    if (!session) return;
    try {
      // Delete all medications for the user (cascades to schedules and dose_logs)
      const { error } = await supabase
        .from("medications")
        .delete()
        .eq("user_id", session.user.id);
      
      if (error) throw error;
      toast.success("All medication data deleted successfully");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete medication data");
    }
  };

  const handleFilePick = () => fileInputRef.current?.click();

  const handleUpload: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    if (!session) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image must be under 3MB");
      return;
    }
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${session.user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = pub?.publicUrl;
      if (!publicUrl) throw new Error("Failed to get public URL");

      setAvatarUrl(publicUrl);
      toast.success("Avatar updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload avatar. Make sure the 'avatars' bucket exists and is public.");
    } finally {
      e.target.value = "";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center animate-fade-in">
          <UserIcon className="w-12 h-12 animate-pulse text-primary mx-auto mb-3" />
          <p className="text-xl text-muted-foreground">Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40 backdrop-blur-sm bg-card/80 animate-slide-down">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="bg-primary rounded-lg p-1.5 animate-scale-in shrink-0">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold truncate">Your Profile</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Manage your account details</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
                  <Menu className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate("/profile")}>Profile</DropdownMenuItem>
                <ThemePicker trigger={<DropdownMenuItem onSelect={(e)=>e.preventDefault()}>Themes</DropdownMenuItem>} />
                <DropdownMenuItem onSelect={() => navigate("/dashboard")}>Dashboard</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={async () => { await supabase.auth.signOut(); navigate("/auth"); }}>
                  <LogOut className="w-4 h-4 mr-2" /> Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1 animate-fade-in">
            <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-t-lg p-3">
              <CardTitle className="text-sm font-medium">Account</CardTitle>
              <CardDescription className="text-xs">Identity and contact</CardDescription>
            </CardHeader>
            <CardContent className="pt-3 space-y-3 p-3">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
                <Avatar className="h-14 w-14 sm:h-12 sm:w-12 border-2 shrink-0">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt="Avatar" />
                  ) : (
                    <AvatarFallback className="text-2xl sm:text-xl bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="text-center sm:text-left flex-1 min-w-0">
                  <div className="text-sm font-medium break-words">{fullName || "Unnamed User"}</div>
                  <div className="text-xs text-muted-foreground break-words">{session?.user?.email}</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                <Button size="sm" variant="outline" onClick={handleFilePick} className="w-full sm:w-auto">Upload Avatar</Button>
                {avatarUrl && (
                  <Button size="sm" variant="secondary" onClick={() => setAvatarUrl(null)} className="w-full sm:w-auto">Remove</Button>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="fullName" className="flex items-center gap-1.5 text-xs">
                    <UserIcon className="w-3 h-3 text-muted-foreground shrink-0" /> Full name
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="phone" className="flex items-center gap-1.5 text-xs">
                    <Phone className="w-3 h-3 text-muted-foreground shrink-0" /> Phone number
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 555 123 4567"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="dob" className="flex items-center gap-1.5 text-xs">
                    <CalendarIcon className="w-3 h-3 text-muted-foreground shrink-0" /> Date of birth
                  </Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dob ?? ""}
                    onChange={(e) => setDob(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-2.5 gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-xs">Caregiver mode</div>
                    <div className="text-xs text-muted-foreground">Manage someone else's medications</div>
                  </div>
                  <Switch checked={isCaregiver} onCheckedChange={setIsCaregiver} className="shrink-0" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button size="sm" onClick={handleSave} className="w-full sm:flex-1">Save changes</Button>
                <Button size="sm" variant="outline" className="w-full sm:flex-1" onClick={() => navigate("/dashboard")}>Dashboard</Button>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            <Card className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium">Security</CardTitle>
                <CardDescription className="text-xs">We keep your data private and secure.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground p-3 pt-0">
                <p>
                  Your account uses secure authentication powered by Supabase. All
                  requests are encrypted and protected by Row Level Security (RLS).
                </p>
                <p>
                  Only you and the people you grant access to can see your medication
                  data. You can revoke access at any time.
                </p>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium">About</CardTitle>
                <CardDescription className="text-xs">Personalize how MedTracker feels.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 p-3 pt-0">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border p-2.5">
                    <div className="font-medium mb-1 text-xs">Theme</div>
                    <p className="text-xs text-muted-foreground">Light and dark mode supported via system preference.</p>
                  </div>
                  <div className="rounded-lg border p-2.5">
                    <div className="font-medium mb-1 text-xs">Animations</div>
                    <p className="text-xs text-muted-foreground">Smooth, accessible animations with reduced motion support.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in border-destructive/50" style={{ animationDelay: "0.2s" }}>
              <CardHeader className="p-3 bg-destructive/5">
                <CardTitle className="text-sm font-medium text-destructive flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" />
                  Danger Zone
                </CardTitle>
                <CardDescription className="text-xs">Irreversible actions that affect your account data.</CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-3">
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                  <div className="font-medium mb-1.5 text-xs">Delete All Medications</div>
                  <p className="text-xs text-muted-foreground mb-3">
                    This will permanently delete all your medications, schedules, and dose logs. This action cannot be undone.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive" className="w-full sm:w-auto">
                        <Trash2 className="w-3 h-3 mr-1.5" />
                        Delete All Medication Data
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all your medications, medication schedules, and dose logs. 
                          This action cannot be undone and all data will be lost forever.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAllMedications} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Yes, delete everything
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
import { ProfilePageSkeleton } from "@/components/LoadingSkeletons";
