import { useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

interface MedicationImageCarouselProps {
  images: string[];
  fallbackImage?: string | null;
  className?: string;
  imageClassName?: string;
  alt?: string;
}

export function MedicationImageCarousel({
  images,
  fallbackImage,
  className,
  imageClassName,
  alt = "Medication",
}: MedicationImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Filter out empty/null images and use fallback if needed
  const validImages = images?.filter(img => img && img.trim() !== "") || [];
  const displayImages = validImages.length > 0 ? validImages : (fallbackImage ? [fallbackImage] : []);
  
  if (displayImages.length === 0) {
    return null;
  }

  // Single image - no carousel needed
  if (displayImages.length === 1) {
    return (
      <div className={cn("relative w-full", className)}>
        <img
          src={displayImages[0]}
          alt={alt}
          className={cn("w-full h-full object-cover", imageClassName)}
        />
      </div>
    );
  }

  // Multiple images - show carousel
  return (
    <div className={cn("relative w-full", className)}>
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
        setApi={(api) => {
          api?.on("select", () => {
            setCurrentIndex(api.selectedScrollSnap());
          });
        }}
      >
        <CarouselContent>
          {displayImages.map((image, index) => (
            <CarouselItem key={index}>
              <div className="relative w-full h-full">
                <img
                  src={image}
                  alt={`${alt} ${index + 1}`}
                  className={cn("w-full h-full object-cover", imageClassName)}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2" />
        <CarouselNext className="right-2" />
      </Carousel>
      
      {/* Image counter */}
      <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm text-xs px-2 py-1 rounded-full">
        {currentIndex + 1} / {displayImages.length}
      </div>
    </div>
  );
}
