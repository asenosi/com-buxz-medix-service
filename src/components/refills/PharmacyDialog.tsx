import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PharmacyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPharmacyAdded?: () => void;
}

export const PharmacyDialog = ({ open, onOpenChange, onPharmacyAdded }: PharmacyDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [faxNumber, setFaxNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isPreferred, setIsPreferred] = useState(false);

  const resetForm = () => {
    setName("");
    setPhoneNumber("");
    setEmail("");
    setAddress("");
    setFaxNumber("");
    setNotes("");
    setIsPreferred(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a pharmacy name");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("pharmacies")
        .insert({
          user_id: user.id,
          name: name.trim(),
          phone_number: phoneNumber.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          fax_number: faxNumber.trim() || null,
          notes: notes.trim() || null,
          is_preferred: isPreferred,
        });

      if (error) throw error;

      toast.success("Pharmacy added successfully");
      resetForm();
      onOpenChange(false);
      onPharmacyAdded?.();
    } catch (error) {
      console.error("Error adding pharmacy:", error);
      toast.error("Failed to add pharmacy");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Pharmacy</DialogTitle>
          <DialogDescription>
            Add a pharmacy where you collect your medications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pharmacy-name">Pharmacy Name *</Label>
            <Input
              id="pharmacy-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Clicks Pharmacy"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g., 011 234 5678"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g., pharmacy@example.com"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., 123 Main Street, Sandton"
              rows={2}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fax">Fax Number</Label>
            <Input
              id="fax"
              type="tel"
              value={faxNumber}
              onChange={(e) => setFaxNumber(e.target.value)}
              placeholder="e.g., 011 234 5679"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information..."
              rows={2}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="preferred">Set as preferred pharmacy</Label>
            <Switch
              id="preferred"
              checked={isPreferred}
              onCheckedChange={setIsPreferred}
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Pharmacy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
