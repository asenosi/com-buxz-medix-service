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
import { Loader2, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

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
  
  // Refill details
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

      // Create refill history record
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

      // Update medication pills_remaining and last_refill_date
      const { error: updateError } = await supabase
        .from("medications")
        .update({ 
          pills_remaining: newRemaining,
          last_refill_date: refillDate,
          prescription_number: prescriptionNumber || null,
        })
        .eq("id", medicationId);

      if (updateError) throw updateError;

      toast.success(`Refilled ${medicationName} with ${quantity} pills`);
      onRefillComplete();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error processing refill:", error);
      toast.error("Failed to process refill");
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Refill {medicationName}</DialogTitle>
          <DialogDescription>
            Current stock: {currentRemaining} pills • Add new refill details
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="details">Details & Costs</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity Added *</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="Number of pills"
                value={quantity}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || (Number(val) >= 1 && Number(val) <= 10000)) {
                    setQuantity(val);
                  }
                }}
                min="1"
                max="10000"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                New total: {currentRemaining + (parseInt(quantity) || 0)} pills
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pharmacy">Pharmacy</Label>
              <Select value={selectedPharmacy} onValueChange={setSelectedPharmacy}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select pharmacy" />
                </SelectTrigger>
                <SelectContent>
                  {pharmacies.map((pharmacy) => (
                    <SelectItem key={pharmacy.id} value={pharmacy.id}>
                      {pharmacy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  // TODO: Open pharmacy management dialog
                  toast.info("Pharmacy management coming soon");
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add New Pharmacy
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refillDate">Refill Date</Label>
              <Input
                id="refillDate"
                type="date"
                value={refillDate}
                onChange={(e) => setRefillDate(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requested">Requested</SelectItem>
                  <SelectItem value="ready">Ready for Pickup</SelectItem>
                  <SelectItem value="picked_up">Picked Up</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="prescriptionNumber">Prescription Number</Label>
              <Input
                id="prescriptionNumber"
                placeholder="Rx#"
                value={prescriptionNumber}
                onChange={(e) => setPrescriptionNumber(e.target.value)}
                className="h-11"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prescriberName">Prescriber Name</Label>
              <Input
                id="prescriberName"
                placeholder="Doctor's name"
                value={prescriberName}
                onChange={(e) => setPrescriberName(e.target.value)}
                className="h-11"
                maxLength={100}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="requestedDate">Requested Date</Label>
                <Input
                  id="requestedDate"
                  type="date"
                  value={requestedDate}
                  onChange={(e) => setRequestedDate(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pickupDate">Pickup Date</Label>
                <Input
                  id="pickupDate"
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="cost">Total Cost ($)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="insuranceCovered" className="cursor-pointer">
                  Insurance Covered
                </Label>
                <Switch
                  id="insuranceCovered"
                  checked={insuranceCovered}
                  onCheckedChange={setInsuranceCovered}
                />
              </div>

              {insuranceCovered && (
                <div className="space-y-2">
                  <Label htmlFor="copayAmount">Copay Amount ($)</Label>
                  <Input
                    id="copayAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={copayAmount}
                    onChange={(e) => setCopayAmount(e.target.value)}
                    className="h-11"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-11"
          >
            CANCEL
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading || !quantity || parseInt(quantity) <= 0}
            className="h-11"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            SAVE REFILL
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
