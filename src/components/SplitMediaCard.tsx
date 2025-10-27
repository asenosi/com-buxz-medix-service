import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SplitMediaCardProps {
  imageSrc: string;
  imageAlt?: string;
  title: ReactNode;
  description?: ReactNode;
  buttonLabel?: string;
  onButtonClick?: () => void;
  href?: string;
  buttonVariant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
  orientation?: "imageLeft" | "imageRight";
  className?: string;
  contentClassName?: string;
  imageClassName?: string;
  children?: ReactNode; // Optional extra actions/content under description
}

export function SplitMediaCard({
  imageSrc,
  imageAlt,
  title,
  description,
  buttonLabel,
  onButtonClick,
  href,
  buttonVariant = "default",
  orientation = "imageLeft",
  className,
  contentClassName,
  imageClassName,
  children,
}: SplitMediaCardProps) {
  const imageFirst = orientation === "imageLeft";

  const ActionButton = (
    buttonLabel ? (
      href ? (
        <Button asChild variant={buttonVariant} className="mt-4">
          <a href={href} aria-label={typeof title === "string" ? title : undefined}>
            {buttonLabel}
          </a>
        </Button>
      ) : (
        <Button onClick={onButtonClick} variant={buttonVariant} className="mt-4">
          {buttonLabel}
        </Button>
      )
    ) : null
  );

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Media side */}
        <div
          className={cn(
            "relative h-56 md:h-full md:min-h-[220px]",
            imageFirst ? "md:order-1" : "md:order-2"
          )}
        >
          <img
            src={imageSrc}
            alt={imageAlt || (typeof title === "string" ? title : "Product image")}
            className={cn("absolute inset-0 w-full h-full object-cover", imageClassName)}
          />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t md:bg-gradient-to-r from-black/30 via-black/0 to-transparent" />
        </div>

        {/* Content side */}
        <CardContent
          className={cn(
            "p-6 md:p-8 flex flex-col justify-center gap-2 bg-card",
            imageFirst ? "md:order-2" : "md:order-1",
            contentClassName
          )}
        >
          <h3 className="text-2xl font-bold leading-tight">{title}</h3>
          {description && (
            <p className="text-muted-foreground text-base leading-relaxed">{description}</p>
          )}
          {children}
          {ActionButton}
        </CardContent>
      </div>
    </Card>
  );
}

