import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Settings as SettingsIcon, 
  Save,
  Key,
  Brain,
  Loader2,
  Check,
  AlertTriangle
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Badge } from "../components/ui/badge";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const llmModels = {
  gemini: [
    { value: "gemini-3-flash-preview", label: "Gemini 3 Flash (Recomendado)" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  ],
  openai: [
    { value: "gpt-5.2", label: "GPT-5.2" },
    { value: "gpt-5.1", label: "GPT-5.1" },
    { value: "gpt-4.1", label: "GPT-4.1" },
    { value: "gpt-4o", label: "GPT-4o" },
  ],
  anthropic: [
    { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
    { value: "claude-4-sonnet-20250514", label: "Claude 4 Sonnet" },
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  ]
};

const providerLabels = {
  gemini: "Google Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic Claude"
};

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    llm_provider: "gemini",
    llm_model: "gemini-3-flash-preview",
    use_emergent_key: true,
    custom_api_key: "",
    discord_bot_token: "",
    discord_guild_id: ""
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
      setFormData({
        llm_provider: response.data.llm_provider || "gemini",
        llm_model: response.data.llm_model || "gemini-3-flash-preview",
        use_emergent_key: response.data.use_emergent_key !== false,
        custom_api_key: response.data.custom_api_key || "",
        discord_bot_token: response.data.discord_bot_token || "",
        discord_guild_id: response.data.discord_guild_id || ""
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (provider) => {
    const defaultModel = llmModels[provider]?.[0]?.value || "";
    setFormData({
      ...formData,
      llm_provider: provider,
      llm_model: defaultModel
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings`, formData);
      toast.success("Configurações salvas!");
      await fetchSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0C10] bg-pattern" data-testid="settings-page">
      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#EDEDED] font-['Playfair_Display']">
            Configurações
          </h1>
          <p className="text-[#A0A5B5] mt-1">
            Configure os provedores de IA e chaves de API
          </p>
        </div>

        {/* LLM Provider Settings */}
        <Card className="card-rpg mb-6">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-[#EDEDED] font-['Playfair_Display'] flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#D4AF37]" />
              Provedor de IA
            </CardTitle>
            <CardDescription className="text-[#A0A5B5]">
              Escolha qual LLM será usado para processar as transcrições
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label className="text-[#EDEDED]">Provedor</Label>
              <Select
                value={formData.llm_provider}
                onValueChange={handleProviderChange}
              >
                <SelectTrigger 
                  className="input-dark"
                  data-testid="provider-select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#13141A] border-white/10">
                  <SelectItem value="gemini">
                    <div className="flex items-center gap-2">
                      <span>Google Gemini</span>
                      <Badge className="bg-[#D4AF37]/10 text-[#D4AF37] text-xs">Recomendado</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <Label className="text-[#EDEDED]">Modelo</Label>
              <Select
                value={formData.llm_model}
                onValueChange={(value) => setFormData({...formData, llm_model: value})}
              >
                <SelectTrigger 
                  className="input-dark"
                  data-testid="model-select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#13141A] border-white/10">
                  {llmModels[formData.llm_provider]?.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* API Key Settings */}
        <Card className="card-rpg mb-6">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-[#EDEDED] font-['Playfair_Display'] flex items-center gap-2">
              <Key className="w-5 h-5 text-[#D4AF37]" />
              Chave de API
            </CardTitle>
            <CardDescription className="text-[#A0A5B5]">
              Configure a chave de autenticação para os serviços de IA
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Emergent Key Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-[#EDEDED]">Usar Emergent Universal Key</Label>
                <p className="text-sm text-[#6C7280]">
                  Chave compartilhada que funciona com OpenAI, Gemini e Claude
                </p>
              </div>
              <Switch
                checked={formData.use_emergent_key}
                onCheckedChange={(checked) => setFormData({...formData, use_emergent_key: checked})}
                data-testid="emergent-key-switch"
              />
            </div>

            {formData.use_emergent_key ? (
              <div className="p-4 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[#EDEDED] font-medium">Emergent Key Ativa</p>
                    <p className="text-sm text-[#A0A5B5] mt-1">
                      Você está usando a chave universal que suporta múltiplos provedores.
                      Os créditos são debitados do seu saldo Emergent.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-[#8C1C13]/10 border border-[#8C1C13]/30">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-[#8C1C13] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[#EDEDED] font-medium">Chave Personalizada</p>
                      <p className="text-sm text-[#A0A5B5] mt-1">
                        Você precisará fornecer sua própria chave de API do provedor selecionado ({providerLabels[formData.llm_provider]}).
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="api-key" className="text-[#EDEDED]">
                    Chave de API ({providerLabels[formData.llm_provider]})
                  </Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={formData.custom_api_key}
                    onChange={(e) => setFormData({...formData, custom_api_key: e.target.value})}
                    placeholder="sk-..."
                    className="input-dark font-mono"
                    data-testid="custom-api-key-input"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Discord Bot Settings */}
        <Card className="card-rpg mb-6 border-[#5865F2]/30">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-[#EDEDED] font-['Playfair_Display'] flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-[#5865F2]" />
              Configuração do Bot Discord
            </CardTitle>
            <CardDescription className="text-[#A0A5B5]">
              Vincule seu bot do Discord para permitir captura automática no futuro
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bot-token" className="text-[#EDEDED]">Token do Bot</Label>
              <Input
                id="bot-token"
                type="password"
                value={formData.discord_bot_token}
                onChange={(e) => setFormData({...formData, discord_bot_token: e.target.value})}
                placeholder="MTIz..."
                className="input-dark font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="guild-id" className="text-[#EDEDED]">ID do Servidor (Guild ID)</Label>
              <Input
                id="guild-id"
                value={formData.discord_guild_id}
                onChange={(e) => setFormData({...formData, discord_guild_id: e.target.value})}
                placeholder="123456789..."
                className="input-dark"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="btn-gold"
            data-testid="save-settings-btn"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Configurações
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
