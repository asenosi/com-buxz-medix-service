import { useState, useRef } from "react";
import { Camera, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CameraScannerProps {
  onScan: (text: string) => void;
  onClose: () => void;
}

export const CameraScanner = ({ onScan, onClose }: CameraScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Prefer back camera
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
      }
    } catch (error) {
      toast.error("Unable to access camera");
      console.error("Camera access error:", error);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const imageData = canvas.toDataURL("image/jpeg");
        setCapturedImage(imageData);
        stopCamera();
        
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
        
        // In a real app, you would send this to an OCR service
        // For now, we'll just show a placeholder message
        toast.info("Scan complete! Processing medication label...");
        
        // Simulate OCR processing
        setTimeout(() => {
          // Mock extracted text
          const mockText = "Example Medication 500mg";
          onScan(mockText);
        }, 1500);
      }
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Scan Medication Label</h2>
          <Button size="icon" variant="ghost" onClick={handleClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Camera View */}
        <div className="flex-1 flex items-center justify-center p-4">
          {!isScanning && !capturedImage && (
            <Card className="p-8 text-center">
              <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg mb-4">
                Position the medication label in frame
              </p>
              <Button onClick={startCamera} size="lg">
                Start Camera
              </Button>
            </Card>
          )}

          {isScanning && (
            <div className="relative w-full max-w-lg">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Scan Frame Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-4 border-primary rounded-lg w-4/5 h-3/5 shadow-lg" />
              </div>
            </div>
          )}

          {capturedImage && (
            <div className="relative w-full max-w-lg">
              <img
                src={capturedImage}
                alt="Captured medication"
                className="w-full rounded-lg"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center text-white">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 animate-scale-in" />
                  <p className="text-lg font-semibold">Processing...</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        {isScanning && (
          <div className="p-6 border-t">
            <Button
              onClick={captureImage}
              size="lg"
              className="w-full h-14 text-lg"
            >
              <Camera className="w-6 h-6 mr-2" />
              Capture
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};