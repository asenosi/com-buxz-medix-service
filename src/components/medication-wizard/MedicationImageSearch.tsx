import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

interface MedicationImageSearchProps {
  medicationName: string;
  onImageSelect: (imageUrl: string) => void;
}

interface ImageResult {
  url: string;
  title?: string;
}

export const MedicationImageSearch = ({ medicationName, onImageSelect }: MedicationImageSearchProps) => {
  const [searchQuery, setSearchQuery] = useState(medicationName);
  const [isSearching, setIsSearching] = useState(false);
  const [imageResults, setImageResults] = useState<ImageResult[]>([]);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

  const searchImages = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a medication name to search");
      return;
    }

    setIsSearching(true);
    setImageResults([]);

    try {
      const response = await fetch("https://api.search.brave.com/res/v1/web/search", {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "X-Subscription-Token": "BSAb8L9yD5L4Pf_RLY3HKGbqwyCIeYd"
        },
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      
      // Extract image links from results
      const images: ImageResult[] = [];
      if (data.results) {
        data.results.forEach((result: { thumbnail?: { src: string }, title?: string }) => {
          if (result.thumbnail?.src) {
            images.push({
              url: result.thumbnail.src,
              title: result.title
            });
          }
        });
      }

      if (images.length === 0) {
        toast.info("No images found. Try a different search term.");
      }

      setImageResults(images);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search for images. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleImageSelect = async (imageUrl: string, index: number) => {
    setDownloadingIndex(index);
    try {
      // Fetch the image as a blob
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("Failed to fetch image");
      
      const blob = await response.blob();
      
      // Create a data URL from the blob
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageSelect(reader.result as string);
        toast.success("Image added successfully");
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("Failed to download image. Try another one.");
    } finally {
      setDownloadingIndex(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="imageSearch" className="text-sm">Search for Medication Images</Label>
        <div className="flex gap-2">
          <Input
            id="imageSearch"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g., aspirin tablet"
            className="h-9"
            onKeyDown={(e) => e.key === "Enter" && searchImages()}
          />
          <Button
            type="button"
            onClick={searchImages}
            disabled={isSearching}
            size="sm"
            className="shrink-0"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {imageResults.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Click on an image to add it to your medication
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto border rounded-lg p-2">
            {imageResults.map((image, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleImageSelect(image.url, index)}
                disabled={downloadingIndex !== null}
                className="relative aspect-square rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary transition-all disabled:opacity-50"
                title={image.title}
              >
                <img
                  src={image.url}
                  alt={image.title || `Result ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {downloadingIndex === index && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                  <Download className="w-3 h-3 text-white mx-auto" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
