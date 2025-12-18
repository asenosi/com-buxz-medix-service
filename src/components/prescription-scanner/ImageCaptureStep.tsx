import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, Loader2, ImageIcon, Scan } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ExtractedPrescription } from "@/types/prescription";

interface ImageCaptureStepProps {
  onImageProcessed: (preview: string, prescriptions: ExtractedPrescription[]) => void;
}

export const ImageCaptureStep = ({ onImageProcessed }: ImageCaptureStepProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    setIsProcessing(true);

    try {
      const base64 = await fileToBase64(file);

      const { data, error } = await supabase.functions.invoke("extract-prescription-v2", {
        body: { imageBase64: base64 },
      });

      if (error) {
        console.error("Function error:", error);
        throw new Error(error.message || "Failed to process image");
      }

      if (data?.prescriptions && data.prescriptions.length > 0) {
        toast.success(`Found ${data.prescriptions.length} medication(s) in prescription`);
        onImageProcessed(previewUrl, data.prescriptions);
      } else {
        toast.error("No medications found. Please try a clearer image.");
        setPreview(null);
      }
    } catch (error) {
      console.error("Error processing prescription:", error);
      toast.error(error instanceof Error ? error.message : "Failed to process prescription");
      setPreview(null);
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
    const file = event.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  return (
    <div className="p-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2">
          <Scan className="h-5 w-5 text-primary" />
          Scan Prescription
        </CardTitle>
        <CardDescription>
          Take a photo or upload an image of your prescription label to automatically extract medication details
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0 space-y-6">
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
                  <p className="font-medium">Processing prescription...</p>
                  <p className="text-sm text-muted-foreground">
                    AI is extracting medication details
                  </p>
                </div>
                {preview && (
                  <img
                    src={preview}
                    alt="Processing"
                    className="w-32 h-32 object-cover rounded-lg opacity-50"
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6">
                <div className="p-4 rounded-full bg-primary/10">
                  <ImageIcon className="h-12 w-12 text-primary" />
                </div>
                
                <div className="text-center">
                  <p className="font-medium mb-1">Position entire prescription label within frame</p>
                  <p className="text-sm text-muted-foreground">
                    Ensure good lighting and all text is visible
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
                    Upload Image
                  </Button>
                </div>

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
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <div className="p-1.5 rounded-full bg-primary/10 shrink-0">
              <span className="text-xs font-bold text-primary">1</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Ensure prescription label is flat and unobstructed
            </p>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <div className="p-1.5 rounded-full bg-primary/10 shrink-0">
              <span className="text-xs font-bold text-primary">2</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Use good lighting to avoid shadows on text
            </p>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <div className="p-1.5 rounded-full bg-primary/10 shrink-0">
              <span className="text-xs font-bold text-primary">3</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Include all dosage instructions in the frame
            </p>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Supports JPEG, PNG, HEIC formats up to 10MB
        </p>
      </CardContent>
    </div>
  );
};
