import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, FileImage, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { DocumentTypeHint } from "@/types/document-extraction";

export default function UploadPrescription() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [typeHint, setTypeHint] = useState<DocumentTypeHint>("UNKNOWN");
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/tiff", "application/pdf"];
    if (!validTypes.includes(selected.type)) {
      toast.error("Please select a JPEG, PNG, WebP, TIFF, or PDF file");
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      toast.error("File must be less than 10MB");
      return;
    }

    setFile(selected);
    if (selected.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(selected));
    } else {
      setPreview(null);
    }
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) { toast.error("Please sign in first"); return; }

      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${userId}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("prescriptions")
        .upload(filePath, file, { contentType: file.type });
      if (uploadErr) throw new Error("Upload failed: " + uploadErr.message);

      const { data, error } = await supabase.functions.invoke("upload-document", {
        body: { filePath, documentTypeHint: typeHint },
      });

      if (error) throw error;

      toast.success("Prescription uploaded — processing with AI...");

      if (data?.documentId) {
        // Poll briefly or navigate to documents list
        navigate(`/documents`);
      }
    } catch (e) {
      console.error("Upload error:", e);
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Upload Prescription</h1>
          <p className="text-sm text-muted-foreground">
            Upload a prescription image to extract medication details with AI
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Prescription Image</CardTitle>
          <CardDescription>
            Take a clear photo or upload a scan. Supports JPEG, PNG, WebP, TIFF, PDF (max 10MB).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => document.getElementById("rx-file-input")?.click()}
          >
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-md" />
            ) : file ? (
              <div className="flex flex-col items-center gap-2">
                <FileImage className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm font-medium">{file.name}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm font-medium">Click to select file</p>
                <p className="text-xs text-muted-foreground">or drag and drop</p>
              </div>
            )}
          </div>
          <input
            id="rx-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/tiff,application/pdf"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium">Prescription Type</label>
            <Select value={typeHint} onValueChange={(v) => setTypeHint(v as DocumentTypeHint)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRINTED">Printed</SelectItem>
                <SelectItem value="HANDWRITTEN">Handwritten</SelectItem>
                <SelectItem value="MIXED">Mixed (printed + handwritten)</SelectItem>
                <SelectItem value="UNKNOWN">Unknown / Auto-detect</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={!file || uploading}
            onClick={handleUpload}
          >
            {uploading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" /> Upload & Extract</>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            AI-powered extraction with review before confirmation. This tool assists — it does not replace clinical judgement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
