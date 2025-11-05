import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ExtractedMedication {
  name: string;
  dosage: string;
  form?: string;
  frequency_type?: string;
  route_of_administration?: string;
  reason_for_taking?: string;
  instructions?: string;
}

interface PrescriptionUploadProps {
  onMedicationsExtracted: (medications: ExtractedMedication[]) => void;
}

export const PrescriptionUpload = ({ onMedicationsExtracted }: PrescriptionUploadProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Convert to base64 and extract
    setIsProcessing(true);
    try {
      const base64 = await fileToBase64(file);
      
      const { data, error } = await supabase.functions.invoke('extract-prescription', {
        body: { imageBase64: base64 }
      });

      if (error) {
        console.error('Error extracting prescription:', error);
        toast.error("Failed to extract prescription data. Please try again.");
        return;
      }

      if (data?.medications && data.medications.length > 0) {
        toast.success(`Found ${data.medications.length} medication(s) in prescription`);
        onMedicationsExtracted(data.medications);
      } else {
        toast.error("No medications found in the image. Please try another image or add manually.");
      }
    } catch (error) {
      console.error('Error processing prescription:', error);
      toast.error("Failed to process prescription. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 string
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <Card className="border-2 border-dashed">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center gap-4">
          {preview ? (
            <div className="w-full max-w-sm">
              <img src={preview} alt="Prescription preview" className="rounded-lg w-full" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                Upload a photo of your prescription to automatically extract medication details
              </p>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={isProcessing}
              onClick={() => document.getElementById('prescription-upload')?.click()}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {preview ? "Upload Different Image" : "Upload Prescription"}
                </>
              )}
            </Button>
            
            <input
              id="prescription-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isProcessing}
            />
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            Supports JPG, PNG, HEIC. Max 10MB.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
