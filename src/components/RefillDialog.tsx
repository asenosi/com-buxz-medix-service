import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RefillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRemaining: number;
  medicationName: string;
  onConfirm: (newAmount: number) => void;
}

export const RefillDialog = ({
  open,
  onOpenChange,
  currentRemaining,
  medicationName,
  onConfirm,
}: RefillDialogProps) => {
  const [refillAmount, setRefillAmount] = useState("");

  const handleConfirm = () => {
    const amount = parseInt(refillAmount);
    if (amount && amount > 0) {
      onConfirm(amount);
      setRefillAmount("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Refill your prescription</DialogTitle>
          <DialogDescription>
            You have {currentRemaining} meds remaining
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="refill-amount">Add</Label>
            <Input
              id="refill-amount"
              type="number"
              placeholder="Meds"
              value={refillAmount}
              onChange={(e) => setRefillAmount(e.target.value)}
              className="h-12"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-11">
            CANCEL
          </Button>
          <Button onClick={handleConfirm} disabled={!refillAmount || parseInt(refillAmount) <= 0} className="h-11">
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
