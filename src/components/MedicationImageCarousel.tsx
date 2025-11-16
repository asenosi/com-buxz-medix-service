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
  onImageClick?: () => void;
}

export function MedicationImageCarousel({
  images,
  fallbackImage,
  className,
  imageClassName,
  alt = "Medication",
  onImageClick,
}: MedicationImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [api, setApi] = useState<any>(null);
  
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
          className={cn("w-full h-full object-cover", onImageClick && "cursor-pointer", imageClassName)}
          onClick={onImageClick}
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
        setApi={(carouselApi) => {
          setApi(carouselApi);
          carouselApi?.on("select", () => {
            setCurrentIndex(carouselApi.selectedScrollSnap());
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
                  className={cn("w-full h-full object-cover", onImageClick && "cursor-pointer", imageClassName)}
                  onClick={onImageClick}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/90 backdrop-blur-sm hover:bg-background border-2 disabled:opacity-100" />
        <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/90 backdrop-blur-sm hover:bg-background border-2 disabled:opacity-100" />
      </Carousel>
      
      {/* Pagination dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {displayImages.map((_, index) => (
          <button
            key={index}
            onClick={() => api?.scrollTo(index)}
            className={cn(
              "transition-all rounded-full w-2.5 h-2.5",
              index === currentIndex 
                ? "bg-primary scale-110 shadow-md" 
                : "bg-white/70 hover:bg-white/90 shadow-sm"
            )}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
