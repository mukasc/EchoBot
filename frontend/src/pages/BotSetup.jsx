import { Bot, Shield, Mic, Check, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

// Custom Hooks
import { useBotSetup } from "../hooks/useBotSetup";

// Components
import StepCard from "../components/setup/StepCard";

const BotSetup = () => {
  const { instructions, loading } = useBotSetup();

  if (loading) {
    return (
      <div className="min-h-screen bg-rpg-void flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-rpg-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rpg-void bg-pattern">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-rpg-gold/10">
              <Bot className="w-8 h-8 text-rpg-gold" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#EDEDED] font-serif">
                {instructions?.title || "Configurar Bot Discord"}
              </h1>
              <p className="text-[#A0A5B5] mt-1">
                Siga os passos abaixo para criar e configurar seu bot
              </p>
            </div>
          </div>
        </div>

        {/* Important Note */}
        <Card className="card-rpg mb-8 border-rpg-gold/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-rpg-gold/10">
                <Mic className="w-5 h-5 text-rpg-gold" />
              </div>
              <div>
                <h3 className="text-[#EDEDED] font-semibold mb-2">
                  Nota sobre Captura de Áudio
                </h3>
                <p className="text-[#A0A5B5] text-sm">
                  {instructions?.note || "A captura de áudio do Discord requer uma implementação separada. Por enquanto, utilize o upload manual."}
                </p>
                <div className="mt-4">
                  <Badge className="bg-rpg-gold/10 text-rpg-gold border-rpg-gold/20">
                    Upload manual disponível
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <div className="space-y-4">
          {instructions?.steps?.map((step) => (
            <StepCard key={step.step} step={step} />
          ))}
        </div>

        {/* Permissions Reference */}
        <Card className="card-rpg mt-8">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-[#EDEDED] font-serif flex items-center gap-2">
              <Shield className="w-5 h-5 text-rpg-gold" />
              Permissões Necessárias
            </CardTitle>
            <CardDescription className="text-[#A0A5B5]">
              Lista de permissões que o bot precisa para funcionar
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-rpg-void border border-white/5">
                <h4 className="text-[#EDEDED] font-semibold mb-2">Permissões de Voz</h4>
                <ul className="space-y-2 text-sm text-[#A0A5B5]">
                  {["Connect (Conectar)", "Speak (Falar)", "Use Voice Activity"].map(p => (
                    <li key={p} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="p-4 rounded-lg bg-rpg-void border border-white/5">
                <h4 className="text-[#EDEDED] font-semibold mb-2">Intents Necessários</h4>
                <ul className="space-y-2 text-sm text-[#A0A5B5]">
                  {["Message Content Intent", "Server Members Intent", "Presence Intent (Opcional)"].map(i => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BotSetup;
