import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, Loader2, ImageIcon, Scan, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ExtractedPrescription } from "@/types/prescription";

interface ImageCaptureStepProps {
  onImageProcessed: (previews: string[], prescriptions: ExtractedPrescription[], imageFiles: File[]) => void;
}

export const ImageCaptureStep = ({ onImageProcessed }: ImageCaptureStepProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return;
      }
      if (selectedFiles.length + newFiles.length >= 5) {
        toast.error("Maximum 5 images allowed");
        return;
      }
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const processImages = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please add at least one image");
      return;
    }

    setIsProcessing(true);

    try {
      const allPrescriptions: ExtractedPrescription[] = [];

      for (const file of selectedFiles) {
        const base64 = await fileToBase64(file);

        const { data, error } = await supabase.functions.invoke("extract-prescription-v2", {
          body: { imageBase64: base64 },
        });

        if (error) {
          console.error("Function error:", error);
          toast.error(`Failed to process ${file.name}`);
          continue;
        }

        if (data?.prescriptions && data.prescriptions.length > 0) {
          allPrescriptions.push(...data.prescriptions);
        }
      }

      if (allPrescriptions.length > 0) {
        toast.success(`Found ${allPrescriptions.length} medication(s) from ${selectedFiles.length} image(s)`);
        onImageProcessed(previews, allPrescriptions, selectedFiles);
      } else {
        toast.error("No medications found. Please try clearer images.");
      }
    } catch (error) {
      console.error("Error processing prescriptions:", error);
      toast.error(error instanceof Error ? error.message : "Failed to process prescriptions");
    } finally {
      setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files);
    event.target.value = "";
  };

  return (
    <div className="p-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2">
          <Scan className="h-5 w-5 text-primary" />
          Scan Prescription
        </CardTitle>
        <CardDescription>
          Upload multiple images of your prescription labels for better OCR accuracy
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0 space-y-6">
        {/* Selected Images Preview */}
        {previews.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{previews.length} image{previews.length !== 1 ? "s" : ""} selected</p>
              <p className="text-xs text-muted-foreground">(max 5)</p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {previews.map((preview, idx) => (
                <div key={idx} className="relative group aspect-square">
                  <img
                    src={preview}
                    alt={`Image ${idx + 1}`}
                    className="w-full h-full object-cover rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFile(idx)}
                    disabled={isProcessing}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {previews.length < 5 && !isProcessing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 flex items-center justify-center hover:bg-primary/10 transition-colors"
                >
                  <Plus className="h-6 w-6 text-primary/50" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Capture Area */}
        <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
          <CardContent className="py-12">
            {isProcessing ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <Scan className="h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary/50" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Processing {selectedFiles.length} image{selectedFiles.length !== 1 ? "s" : ""}...</p>
                  <p className="text-sm text-muted-foreground">
                    AI is extracting medication details
                  </p>
                </div>
              </div>
            ) : previews.length === 0 ? (
              <div className="flex flex-col items-center gap-6">
                <div className="p-4 rounded-full bg-primary/10">
                  <ImageIcon className="h-12 w-12 text-primary" />
                </div>
                
                <div className="text-center">
                  <p className="font-medium mb-1">Add prescription images</p>
                  <p className="text-sm text-muted-foreground">
                    Upload up to 5 images for better accuracy
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                  <Button
                    variant="default"
                    className="flex-1 h-12"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera className="mr-2 h-5 w-5" />
                    Take Photo
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    Upload Images
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-muted-foreground text-center">
                  Ready to scan {selectedFiles.length} image{selectedFiles.length !== 1 ? "s" : ""}
                </p>
                <Button onClick={processImages} size="lg" className="h-12 px-8">
                  <Scan className="mr-2 h-5 w-5" />
                  Scan All Images
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Tips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <div className="p-1.5 rounded-full bg-primary/10 shrink-0">
              <span className="text-xs font-bold text-primary">1</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Capture front and back of medication labels
            </p>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <div className="p-1.5 rounded-full bg-primary/10 shrink-0">
              <span className="text-xs font-bold text-primary">2</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Multiple angles help improve accuracy
            </p>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <div className="p-1.5 rounded-full bg-primary/10 shrink-0">
              <span className="text-xs font-bold text-primary">3</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Include all dosage instructions visible
            </p>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Supports JPEG, PNG, HEIC formats up to 10MB each (max 5 images)
        </p>
      </CardContent>
    </div>
  );
};