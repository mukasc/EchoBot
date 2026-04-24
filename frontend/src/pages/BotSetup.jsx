import { useState, useEffect } from "react";
import { Bot, Shield, Mic, Check, Loader2, Save, Key, Server, Hash, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

// Custom Hooks
import { useBotSetup } from "../hooks/useBotSetup";
import { useSettings } from "../hooks/useSettings";

// Components
import StepCard from "../components/setup/StepCard";

const BotSetup = () => {
  const { instructions, loading: instructionsLoading } = useBotSetup();
  const { settings, loading: settingsLoading, saving, saveSettings } = useSettings();

  const [showToken, setShowToken] = useState(false);
  const [formData, setFormData] = useState({
    discord_bot_token: "",
    discord_app_id: "",
    discord_guild_id: ""
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        discord_bot_token: settings.discord_bot_token || "",
        discord_app_id: settings.discord_app_id || "",
        discord_guild_id: settings.discord_guild_id || ""
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await saveSettings({
        ...settings,
        discord_bot_token: formData.discord_bot_token,
        discord_app_id: formData.discord_app_id,
        discord_guild_id: formData.discord_guild_id
      });
    } catch (error) {
      console.error("Erro ao salvar configurações do bot:", error);
    }
  };

  if (instructionsLoading || settingsLoading) {
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

        {/* Configuration Section */}
        <Card className="card-rpg mb-8 border-indigo-500/40 bg-indigo-500/5">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-[#EDEDED] font-serif flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-400" />
              Configuração do Bot Discord
            </CardTitle>
            <CardDescription className="text-[#A0A5B5]">
              Vincule seu bot do Discord aqui para permitir a captura automática
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="bot-token" className="text-xs uppercase tracking-wider text-[#A0A5B5]">Token do Bot</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C7280]" />
                  <Input
                    id="bot-token"
                    type={showToken ? "text" : "password"}
                    value={formData.discord_bot_token}
                    onChange={(e) => setFormData({...formData, discord_bot_token: e.target.value})}
                    placeholder="MTIz..."
                    className="pl-10 pr-10 input-dark font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6C7280] hover:text-white transition-colors"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-[#6C7280]">Token secreto obtido na aba 'Bot' do portal</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="app-id" className="text-xs uppercase tracking-wider text-[#A0A5B5]">ID da Aplicação (App ID)</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C7280]" />
                    <Input
                      id="app-id"
                      value={formData.discord_app_id}
                      onChange={(e) => setFormData({...formData, discord_app_id: e.target.value})}
                      placeholder="1486..."
                      className="pl-10 input-dark text-sm"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="guild-id" className="text-xs uppercase tracking-wider text-[#A0A5B5]">ID do Servidor (Guild ID)</Label>
                  <div className="relative">
                    <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C7280]" />
                    <Input
                      id="guild-id"
                      value={formData.discord_guild_id}
                      onChange={(e) => setFormData({...formData, discord_guild_id: e.target.value})}
                      placeholder="123456789..."
                      className="pl-10 input-dark text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-500 text-white border-none"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Configuração
              </Button>
            </div>
          </CardContent>
        </Card>

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
