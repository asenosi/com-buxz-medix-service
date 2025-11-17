import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Pharmacy {
  id: string;
  name: string;
  phone_number: string | null;
}

interface RefillManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicationId: string;
  medicationName: string;
  currentRemaining: number;
  onRefillComplete: () => void;
}

export const RefillManagementDialog = ({
  open,
  onOpenChange,
  medicationId,
  medicationName,
  currentRemaining,
  onRefillComplete,
}: RefillManagementDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<string>("");
  
  const [quantity, setQuantity] = useState("");
  const [prescriptionNumber, setPrescriptionNumber] = useState("");
  const [prescriberName, setPrescriberName] = useState("");
  const [cost, setCost] = useState("");
  const [insuranceCovered, setInsuranceCovered] = useState(false);
  const [copayAmount, setCopayAmount] = useState("");
  const [refillDate, setRefillDate] = useState(new Date().toISOString().split('T')[0]);
  const [requestedDate, setRequestedDate] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [status, setStatus] = useState<string>("completed");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      loadPharmacies();
    }
  }, [open]);

  const loadPharmacies = async () => {
    try {
      const { data, error } = await supabase
        .from("pharmacies")
        .select("id, name, phone_number")
        .order("is_preferred", { ascending: false })
        .order("name");
      
      if (error) throw error;
      setPharmacies(data || []);
    } catch (error) {
      console.error("Error loading pharmacies:", error);
    }
  };

  const handleSubmit = async () => {
    if (!quantity || parseInt(quantity) <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const newRemaining = currentRemaining + parseInt(quantity);

      const { error: historyError } = await supabase
        .from("refill_history")
        .insert({
          medication_id: medicationId,
          user_id: user.id,
          pharmacy_id: selectedPharmacy || null,
          quantity_added: parseInt(quantity),
          prescription_number: prescriptionNumber || null,
          prescriber_name: prescriberName || null,
          cost: cost ? parseFloat(cost) : null,
          insurance_covered: insuranceCovered,
          copay_amount: copayAmount ? parseFloat(copayAmount) : null,
          refill_date: refillDate,
          requested_date: requestedDate || null,
          pickup_date: pickupDate || null,
          status,
          notes: notes || null,
        });

      if (historyError) throw historyError;

      const { error: updateError } = await supabase
        .from("medications")
        .update({
          pills_remaining: newRemaining,
          last_refill_date: refillDate,
        })
        .eq("id", medicationId);

      if (updateError) throw updateError;

      toast.success(`Added ${quantity} pills to ${medicationName}`);
      onRefillComplete();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error recording refill:", error);
      toast.error("Failed to record refill");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setQuantity("");
    setPrescriptionNumber("");
    setPrescriberName("");
    setCost("");
    setInsuranceCovered(false);
    setCopayAmount("");
    setRefillDate(new Date().toISOString().split('T')[0]);
    setRequestedDate("");
    setPickupDate("");
    setStatus("completed");
    setNotes("");
    setSelectedPharmacy("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Refill</DialogTitle>
          <DialogDescription>
            Add refill details for {medicationName}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="details">Additional Details</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="quantity">Quantity Added *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Number of pills"
                />
                {quantity && (
                  <p className="text-sm text-muted-foreground mt-1">
                    New total: {currentRemaining + parseInt(quantity)} pills
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="refillDate">Refill Date</Label>
                <Input
                  id="refillDate"
                  type="date"
                  value={refillDate}
                  onChange={(e) => setRefillDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="pharmacy">Pharmacy</Label>
                <Select value={selectedPharmacy} onValueChange={setSelectedPharmacy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pharmacy (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {pharmacies.map((pharmacy) => (
                      <SelectItem key={pharmacy.id} value={pharmacy.id}>
                        {pharmacy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="requested">Requested</SelectItem>
                    <SelectItem value="ready">Ready for Pickup</SelectItem>
                    <SelectItem value="picked_up">Picked Up</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="prescriptionNumber">Prescription Number</Label>
                <Input
                  id="prescriptionNumber"
                  value={prescriptionNumber}
                  onChange={(e) => setPrescriptionNumber(e.target.value)}
                  placeholder="Rx #"
                />
              </div>

              <div>
                <Label htmlFor="prescriberName">Prescriber Name</Label>
                <Input
                  id="prescriberName"
                  value={prescriberName}
                  onChange={(e) => setPrescriberName(e.target.value)}
                  placeholder="Doctor's name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cost">Total Cost</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="copay">Copay Amount</Label>
                  <Input
                    id="copay"
                    type="number"
                    step="0.01"
                    min="0"
                    value={copayAmount}
                    onChange={(e) => setCopayAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="insurance"
                  checked={insuranceCovered}
                  onCheckedChange={setInsuranceCovered}
                />
                <Label htmlFor="insurance">Insurance Covered</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="requestedDate">Requested Date</Label>
                  <Input
                    id="requestedDate"
                    type="date"
                    value={requestedDate}
                    onChange={(e) => setRequestedDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="pickupDate">Pickup Date</Label>
                  <Input
                    id="pickupDate"
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record Refill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
