import { Bot, Shield, Mic, Link2, Key, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { useTranslation } from "react-i18next";

const stepIcons = {
  1: Bot,
  2: Shield,
  3: Mic,
  4: Link2,
  5: Key
};

const StepCard = ({ step }) => {
  const { t } = useTranslation();
  const Icon = stepIcons[step.step] || ChevronRight;
  
  return (
    <Card className="card-rpg">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
            {step.step}
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg text-[var(--foreground)] font-serif">
              {step.title}
            </CardTitle>
          </div>
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <ul className="space-y-3">
          {step.instructions?.map((instruction, i) => (
            <li key={i} className="flex items-start gap-3 text-[var(--muted-foreground)]">
              <ChevronRight className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
              <span>{instruction}</span>
            </li>
          ))}
        </ul>
        
        {step.step === 1 && (
          <div className="mt-4">
            <Button
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => window.open("https://discord.com/developers/applications", "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {t('botSetup.openPortal')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StepCard;

