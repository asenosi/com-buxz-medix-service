import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Step3RouteProps {
  route: string;
  setRoute: (value: string) => void;
}

const routeOptions = [
  { value: "by_mouth", label: "By mouth" },
  { value: "nose_eyes_ear", label: "In the nose/eyes/ear" },
  { value: "topical", label: "Topical (on skin)" },
  { value: "rectum_vagina", label: "Rectum / Vagina" },
  { value: "inhaled", label: "Inhaled" },
];

export const Step3Route = ({ route, setRoute }: Step3RouteProps) => {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">How do you take it?</h2>
          <p className="text-muted-foreground">Select the route of administration</p>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {routeOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={route === option.value ? "default" : "outline"}
              onClick={() => setRoute(option.value)}
              className="h-16 text-lg"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
