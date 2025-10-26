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
import ThemeToggle from "@/components/ThemeToggle";
import ThemePicker from "@/components/ThemePicker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Phone, ShieldCheck, User as UserIcon } from "lucide-react";

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
        // Avatar URL is managed through storage and state
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary rounded-xl p-2 sm:p-3 animate-scale-in">
                    <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Your Profile</h1>
                    <p className="text-sm sm:text-base text-muted-foreground">Manage your account details</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="hover:scale-105 transition-transform">
                        <Menu className="w-4 h-4 mr-2" /> Menu
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
            </div>
          </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1 animate-fade-in">
            <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-t-lg">
              <CardTitle className="text-lg">Account</CardTitle>
              <CardDescription>Identity and contact</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt="Avatar" />
                  ) : (
                    <AvatarFallback className="text-xl bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <div className="text-xl font-semibold">{fullName || "Unnamed User"}</div>
                  <div className="text-muted-foreground">{session?.user?.email}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                <Button variant="outline" onClick={handleFilePick} className="hover:scale-105 transition-transform">Upload Avatar</Button>
                {avatarUrl && (
                  <Button variant="secondary" onClick={() => setAvatarUrl(null)}>Remove</Button>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="fullName" className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-muted-foreground" /> Full name
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" /> Phone number
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 555 123 4567"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="dob" className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" /> Date of birth
                  </Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dob ?? ""}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium">Caregiver mode</div>
                    <div className="text-sm text-muted-foreground">Helps manage someone else’s medications</div>
                  </div>
                  <Switch checked={isCaregiver} onCheckedChange={setIsCaregiver} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} className="flex-1 hover:scale-[1.02] transition-transform">Save changes</Button>
                <Button variant="outline" className="flex-1" onClick={() => navigate("/dashboard")}>Dashboard</Button>
              </div>
            </CardContent>
          </Card>

          <div className="md:col-span-2 space-y-6">
            <Card className="animate-fade-in" style={{ animationDelay: "0.05s" }}>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>We keep your data private and secure.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-muted-foreground">
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
              <CardHeader>
                <CardTitle>About</CardTitle>
                <CardDescription>Personalize how MedTracker feels.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <div className="font-medium mb-1">Theme</div>
                    <p className="text-sm text-muted-foreground">Light and dark mode supported via system preference.</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="font-medium mb-1">Animations</div>
                    <p className="text-sm text-muted-foreground">Smooth, accessible animations with reduced motion support.</p>
                  </div>
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
