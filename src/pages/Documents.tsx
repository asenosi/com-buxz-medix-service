import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, FileText, Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { DocumentRow } from "@/types/document-extraction";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  UPLOADED: { label: "Uploaded", variant: "outline", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  PREPROCESSING: { label: "Preprocessing", variant: "outline", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  OCR_RUNNING: { label: "OCR Running", variant: "outline", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  EXTRACTION_RUNNING: { label: "Extracting...", variant: "secondary", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  DRAFT_READY: { label: "Ready to Review", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
  NEEDS_REVIEW: { label: "Needs Review", variant: "default", icon: <AlertTriangle className="h-3 w-3" /> },
  CONFIRMED: { label: "Confirmed", variant: "secondary", icon: <CheckCircle2 className="h-3 w-3" /> },
  FAILED: { label: "Failed", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
};

export default function Documents() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.id) return;

      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const TEN_MIN_MS = 10 * 60 * 1000;
        const now = Date.now();
        const processed = (data as unknown as DocumentRow[]).map((doc) => {
          const isProcessing = ["UPLOADED", "PREPROCESSING", "OCR_RUNNING", "EXTRACTION_RUNNING"].includes(doc.status);
          const age = now - new Date(doc.updated_at || doc.created_at).getTime();
          if (isProcessing && age > TEN_MIN_MS) {
            return { ...doc, status: "FAILED" as const, error_message: doc.error_message || "Extraction timed out" };
          }
          return doc;
        });
        setDocuments(processed);
      }
      setLoading(false);
    };

    fetchDocs();

    // Poll for status updates on processing documents
    const interval = setInterval(fetchDocs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Prescriptions</h1>
        </div>
        <Button onClick={() => navigate("/upload")} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Upload
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium mb-1">No prescriptions yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Upload a prescription to get started
            </p>
            <Button onClick={() => navigate("/upload")}>
              <Plus className="mr-2 h-4 w-4" /> Upload Prescription
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const config = statusConfig[doc.status] || statusConfig.UPLOADED;
            const canReview = doc.status === "DRAFT_READY" || doc.status === "NEEDS_REVIEW";

            return (
              <Card
                key={doc.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${canReview ? "border-primary/30" : ""}`}
                onClick={() => canReview ? navigate(`/review/${doc.id}`) : doc.status === "CONFIRMED" ? navigate(`/plans/${doc.id}`) : null}
              >
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {doc.document_type_hint !== "UNKNOWN" ? doc.document_type_hint.toLowerCase() : ""} prescription
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString()} · {new Date(doc.created_at).toLocaleTimeString()}
                      </p>
                      {doc.error_message && (
                        <p className="text-xs text-destructive mt-1">{doc.error_message}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={config.variant} className="gap-1">
                    {config.icon}
                    {config.label}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
