import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Clock, AlertCircle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DoseLog {
  id: string;
  medication_id: string;
  scheduled_time: string;
  taken_at: string | null;
  status: string;
  notes?: string | null;
}

interface Medication {
  id: string;
  name: string;
  image_url: string | null;
}

interface DayDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  logs: DoseLog[];
  medications: Medication[];
}

export const DayDetailsDialog = ({ open, onOpenChange, date, logs, medications }: DayDetailsDialogProps) => {
  if (!date) return null;

  const now = new Date();
  const upcomingLogs = logs.filter(log => new Date(log.scheduled_time) > now);
  const previousLogs = logs.filter(log => new Date(log.scheduled_time) <= now);

  const getMedicationName = (medicationId: string) => {
    return medications.find(med => med.id === medicationId)?.name || "Unknown";
  };

  const getMedicationImage = (medicationId: string) => {
    return medications.find(med => med.id === medicationId)?.image_url;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'taken':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'skipped':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'snoozed':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'taken':
        return <CheckCircle className="w-4 h-4" />;
      case 'skipped':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {format(date, "MMMM d, yyyy")}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-full pr-4">
          {upcomingLogs.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Upcoming Doses
              </h3>
              <div className="space-y-3">
                {upcomingLogs.map(log => (
                  <div
                    key={log.id}
                    className={`p-4 rounded-lg border ${getStatusColor(log.status)} transition-all`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {getMedicationImage(log.medication_id) && (
                          <img
                            src={getMedicationImage(log.medication_id)!}
                            alt={getMedicationName(log.medication_id)}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <p className="font-semibold">{getMedicationName(log.medication_id)}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(log.scheduled_time), "h:mm a")}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        {getStatusIcon(log.status)}
                        {log.status}
                      </Badge>
                    </div>
                    {log.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{log.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {previousLogs.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-muted-foreground" />
                Previous Doses
              </h3>
              <div className="space-y-3">
                {previousLogs.map(log => (
                  <div
                    key={log.id}
                    className={`p-4 rounded-lg border ${getStatusColor(log.status)} ${
                      log.status === 'skipped' ? 'ring-2 ring-destructive/50' : ''
                    } transition-all`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {getMedicationImage(log.medication_id) && (
                          <img
                            src={getMedicationImage(log.medication_id)!}
                            alt={getMedicationName(log.medication_id)}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <p className="font-semibold">{getMedicationName(log.medication_id)}</p>
                          <p className="text-sm text-muted-foreground">
                            Scheduled: {format(new Date(log.scheduled_time), "h:mm a")}
                          </p>
                          {log.taken_at && (
                            <p className="text-sm text-muted-foreground">
                              Taken: {format(new Date(log.taken_at), "h:mm a")}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        {getStatusIcon(log.status)}
                        {log.status}
                      </Badge>
                    </div>
                    {log.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{log.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {logs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No medication scheduled for this day</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
