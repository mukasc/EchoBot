import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Bot, 
  ExternalLink,
  Copy,
  Check,
  ChevronRight,
  Shield,
  Mic,
  Link2,
  Key,
  Loader2
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BotSetup = () => {
  const [instructions, setInstructions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedStep, setCopiedStep] = useState(null);

  useEffect(() => {
    fetchInstructions();
  }, []);

  const fetchInstructions = async () => {
    try {
      const response = await axios.get(`${API}/bot-setup-instructions`);
      setInstructions(response.data);
    } catch (error) {
      console.error("Error fetching instructions:", error);
      toast.error("Erro ao carregar instruções");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text, stepIndex) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStep(stepIndex);
      toast.success("Copiado!");
      setTimeout(() => setCopiedStep(null), 2000);
    } catch (error) {
      toast.error("Erro ao copiar");
    }
  };

  const stepIcons = {
    1: Bot,
    2: Shield,
    3: Mic,
    4: Link2,
    5: Key
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0C10] bg-pattern" data-testid="bot-setup">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-[#D4AF37]/10">
              <Bot className="w-8 h-8 text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#EDEDED] font-['Playfair_Display']">
                {instructions?.title || "Configurar Bot Discord"}
              </h1>
              <p className="text-[#A0A5B5] mt-1">
                Siga os passos abaixo para criar e configurar seu bot
              </p>
            </div>
          </div>
        </div>

        {/* Important Note */}
        <Card className="card-rpg mb-8 border-[#D4AF37]/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-[#D4AF37]/10">
                <Mic className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <h3 className="text-[#EDEDED] font-semibold mb-2">
                  Nota sobre Captura de Áudio
                </h3>
                <p className="text-[#A0A5B5] text-sm">
                  {instructions?.note || "A captura de áudio do Discord requer uma implementação separada com discord.py[voice]. Por enquanto, você pode fazer upload manual de arquivos de áudio gravados."}
                </p>
                <div className="mt-4">
                  <Badge className="bg-[#3A6C97]/20 text-[#3A6C97] border-[#3A6C97]/30">
                    Upload manual disponível
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <div className="space-y-4">
          {instructions?.steps?.map((step, index) => {
            const Icon = stepIcons[step.step] || ChevronRight;
            return (
              <Card 
                key={step.step} 
                className="card-rpg"
                data-testid={`setup-step-${step.step}`}
              >
                <CardHeader className="border-b border-white/10 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] font-bold">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg text-[#EDEDED] font-['Playfair_Display']">
                        {step.title}
                      </CardTitle>
                    </div>
                    <Icon className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <ul className="space-y-3">
                    {step.instructions?.map((instruction, i) => (
                      <li key={i} className="flex items-start gap-3 text-[#A0A5B5]">
                        <ChevronRight className="w-4 h-4 text-[#D4AF37] flex-shrink-0 mt-1" />
                        <span>{instruction}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {step.step === 1 && (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                        onClick={() => window.open("https://discord.com/developers/applications", "_blank")}
                        data-testid="open-discord-portal-btn"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Abrir Discord Developer Portal
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Permissions Reference */}
        <Card className="card-rpg mt-8">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-[#EDEDED] font-['Playfair_Display'] flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#D4AF37]" />
              Permissões Necessárias
            </CardTitle>
            <CardDescription className="text-[#A0A5B5]">
              Lista de permissões que o bot precisa para funcionar
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-[#1A1B23] border border-white/5">
                <h4 className="text-[#EDEDED] font-semibold mb-2">Permissões de Voz</h4>
                <ul className="space-y-2 text-sm text-[#A0A5B5]">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2D7A4D]" />
                    Connect (Conectar)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2D7A4D]" />
                    Speak (Falar)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2D7A4D]" />
                    Use Voice Activity
                  </li>
                </ul>
              </div>
              
              <div className="p-4 rounded-lg bg-[#1A1B23] border border-white/5">
                <h4 className="text-[#EDEDED] font-semibold mb-2">Intents Necessários</h4>
                <ul className="space-y-2 text-sm text-[#A0A5B5]">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2D7A4D]" />
                    Message Content Intent
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2D7A4D]" />
                    Server Members Intent
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2D7A4D]" />
                    Presence Intent (Opcional)
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integration Status */}
        <Card className="card-rpg mt-8 border-[#3A6C97]/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-[#3A6C97]/10">
                  <Bot className="w-6 h-6 text-[#3A6C97]" />
                </div>
                <div>
                  <h3 className="text-[#EDEDED] font-semibold">
                    Integração em Desenvolvimento
                  </h3>
                  <p className="text-sm text-[#A0A5B5]">
                    A captura automática de áudio do Discord está planejada para uma versão futura.
                  </p>
                </div>
              </div>
              <Badge className="bg-[#3A6C97]/20 text-[#3A6C97] border-[#3A6C97]/30">
                Em breve
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BotSetup;
