import { useState, useEffect } from "react";
import { 
  Settings as SettingsIcon, 
  Save,
  Key,
  Brain,
  Loader2,
  Check,
  AlertTriangle,
  Mic2,
  Music,
  Globe
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

// Custom Hooks
import { useSettings } from "../hooks/useSettings";

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
  const { settings, loading, saving, saveSettings } = useSettings();
  
  const [formData, setFormData] = useState({
    llm_provider: "gemini",
    llm_model: "gemini-3-flash-preview",
    custom_api_key: "",
    discord_bot_token: "",
    discord_guild_id: "",
    elevenlabs_voice_id: "pNInz6obpgmqS2C9NfX",
    kokoro_base_url: "http://localhost:3000/api/v1",
    kokoro_model: "model_q8f16",
    kokoro_voice: "af_heart"
  });

  const [voices, setVoices] = useState([]);
  const [fetchingVoices, setFetchingVoices] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [usage, setUsage] = useState(null);
  const [usageError, setUsageError] = useState(null);
  const [dgUsage, setDgUsage] = useState(null);
  const [fetchingDgUsage, setFetchingDgUsage] = useState(false);
  const [dgVoices, setDgVoices] = useState([]);
  const [fetchingDgVoices, setFetchingDgVoices] = useState(false);
  const [koVoices, setKoVoices] = useState([]);
  const [fetchingKoVoices, setFetchingKoVoices] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        llm_provider: settings.llm_provider || "gemini",
        llm_model: settings.llm_model || "gemini-3-flash-preview",
        custom_api_key: settings.custom_api_key || "",
        discord_bot_token: settings.discord_bot_token || "",
        discord_guild_id: settings.discord_guild_id || "",
        elevenlabs_api_key: settings.elevenlabs_api_key || "",
        elevenlabs_voice_id: settings.elevenlabs_voice_id || "pNInz6obpgmqS2C9NfX",
        deepgram_api_key: settings.deepgram_api_key || "",
        deepgram_model: settings.deepgram_model || "aura-asteria-en",
        kokoro_api_key: settings.kokoro_api_key || "",
        kokoro_base_url: settings.kokoro_base_url || "http://localhost:3000/api/v1",
        kokoro_model: settings.kokoro_model || "model_q8f16",
        kokoro_voice: settings.kokoro_voice || "af_heart",
        tts_provider: settings.tts_provider || "elevenlabs"
      });
    }
  }, [settings]);

  useEffect(() => {
    const fetchVoicesAndUsage = async () => {
      if (!formData.elevenlabs_api_key) {
        setVoices([]);
        setUsage(null);
        return;
      }
      
      setFetchingVoices(true);
      setVoiceError(null);
      setUsageError(null);
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const [vRes, uRes] = await Promise.all([
          fetch(`${baseUrl}/api/settings/elevenlabs/voices?api_key=${formData.elevenlabs_api_key}`),
          fetch(`${baseUrl}/api/settings/elevenlabs/usage?api_key=${formData.elevenlabs_api_key}`)
        ]);

        if (vRes.ok) {
          const data = await vRes.json();
          setVoices(data);
        } else {
          const errorData = await vRes.json();
          setVoiceError(errorData.detail);
          setVoices([]);
        }

        if (uRes.ok) {
          const data = await uRes.json();
          setUsage(data);
        } else {
          const errorData = await uRes.json();
          setUsageError(errorData.detail);
          setUsage(null);
        }
      } catch (error) {
        console.error("Erro ao buscar dados do ElevenLabs:", error);
        setVoiceError("Erro de conexão com o servidor");
      } finally {
        setFetchingVoices(false);
      }
    };

    const fetchDgVoicesAndUsage = async () => {
      if (!formData.deepgram_api_key) return;
      setFetchingDgVoices(true);
      setFetchingDgUsage(true);
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const vRes = await fetch(`${baseUrl}/api/settings/deepgram/voices?api_key=${formData.deepgram_api_key}`);
        if (vRes.ok) {
          const data = await vRes.json();
          setDgVoices(data);
        }

        const uRes = await fetch(`${baseUrl}/api/settings/deepgram/usage?api_key=${formData.deepgram_api_key}`);
        if (uRes.ok) {
          const data = await uRes.json();
          setDgUsage(data);
        }
      } catch (error) {
        console.error("Erro ao buscar dados Deepgram:", error);
      } finally {
        setFetchingDgVoices(false);
        setFetchingDgUsage(false);
      }
    };

    const fetchKoVoices = async () => {
      setFetchingKoVoices(true);
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const vRes = await fetch(`${baseUrl}/api/settings/kokoro/voices`);
        if (vRes.ok) {
          const data = await vRes.json();
          setKoVoices(data);
        }
      } catch (error) {
        console.error("Erro ao buscar vozes Kokoro:", error);
      } finally {
        setFetchingKoVoices(false);
      }
    };

    fetchVoicesAndUsage();
    fetchDgVoicesAndUsage();
    fetchKoVoices();
  }, [formData.elevenlabs_api_key, formData.deepgram_api_key, formData.kokoro_base_url]);

  const handleProviderChange = (provider) => {
    const defaultModel = llmModels[provider]?.[0]?.value || "";
    setFormData({
      ...formData,
      llm_provider: provider,
      llm_model: defaultModel
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-rpg-void flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-rpg-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rpg-void bg-pattern">
      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#EDEDED] font-serif">
            Configurações
          </h1>
          <p className="text-[#A0A5B5] mt-1">
            Configure os provedores de IA e chaves de API
          </p>
        </div>

        {/* LLM Provider Settings */}
        <Card className="card-rpg mb-6">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-[#EDEDED] font-serif flex items-center gap-2">
              <Brain className="w-5 h-5 text-rpg-gold" />
              Provedor de IA
            </CardTitle>
            <CardDescription className="text-[#A0A5B5]">
              Escolha qual LLM será usado para processar as transcrições
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-[#EDEDED]">Provedor</Label>
              <Select value={formData.llm_provider} onValueChange={handleProviderChange}>
                <SelectTrigger className="input-dark">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-rpg-surface border-white/10">
                  <SelectItem value="gemini">
                    <div className="flex items-center gap-2">
                      <span>Google Gemini</span>
                      <Badge className="bg-rpg-gold/10 text-rpg-gold text-[10px]">Recomendado</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[#EDEDED]">Modelo</Label>
              <Select 
                value={formData.llm_model} 
                onValueChange={(value) => setFormData({...formData, llm_model: value})}
              >
                <SelectTrigger className="input-dark">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-rpg-surface border-white/10">
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
            <CardTitle className="text-[#EDEDED] font-serif flex items-center gap-2">
              <Key className="w-5 h-5 text-rpg-gold" />
              Chave de API
            </CardTitle>
            <CardDescription className="text-[#A0A5B5]">
              Configure a chave de autenticação para o serviço de IA selecionado
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-rpg-gold/5 border border-rpg-gold/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rpg-gold flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[#EDEDED] font-medium text-sm">Chave Necessária</p>
                    <p className="text-xs text-[#A0A5B5] mt-1">
                      Forneça sua própria chave de API para {providerLabels[formData.llm_provider]}. 
                      Esta chave será usada exclusivamente para processar as crônicas deste servidor.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="api-key">Chave de API ({providerLabels[formData.llm_provider]})</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={formData.custom_api_key}
                  onChange={(e) => setFormData({...formData, custom_api_key: e.target.value})}
                  placeholder="Insira sua chave aqui..."
                  className="input-dark font-mono text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* ElevenLabs Settings */}
        <Card className="card-rpg mb-6">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-[#EDEDED] font-serif flex items-center gap-2">
              <div className="w-5 h-5 flex items-center justify-center bg-rpg-gold/20 rounded text-[10px] text-rpg-gold font-bold">11</div>
              ElevenLabs (Narração)
            </CardTitle>
            <CardDescription className="text-[#A0A5B5]">
              Configure a API para geração de áudio épico a partir do roteiro
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eleven-key">Chave de API ElevenLabs</Label>
              <Input
                id="eleven-key"
                type="password"
                value={formData.elevenlabs_api_key}
                onChange={(e) => setFormData({...formData, elevenlabs_api_key: e.target.value})}
                placeholder="Insira sua chave aqui..."
                className="input-dark font-mono text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="voice-id" className="text-[#A0A5B5] font-medium">Voz (Voice ID)</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    value={formData.elevenlabs_voice_id}
                    onValueChange={(val) => setFormData({...formData, elevenlabs_voice_id: val})}
                  >
                    <SelectTrigger className="bg-rpg-onyx/50 border-white/10 text-[#EDEDED] font-mono text-sm">
                      <SelectValue placeholder="Selecione uma voz..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1C23] border-white/10 text-[#EDEDED] shadow-xl z-[100]">
                    {fetchingVoices ? (
                      <SelectItem value="loading" disabled>Carregando vozes...</SelectItem>
                    ) : voiceError ? (
                      <SelectItem value="error" disabled className="text-red-400 text-xs">
                        {voiceError}
                      </SelectItem>
                    ) : voices.length > 0 ? (
                      voices.map((v) => (
                        <SelectItem key={v.voice_id} value={v.voice_id}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <span>{v.name}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                              v.category === 'premade' 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                : 'bg-rpg-gold/20 text-rpg-gold border border-rpg-gold/30'
                            }`}>
                              {v.category === 'premade' ? 'FREE' : 'PRO'}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>Insira sua API Key para ver as vozes</SelectItem>
                    )}
                  </SelectContent>
                  </Select>
                </div>
                <Input 
                  value={formData.elevenlabs_voice_id}
                  onChange={(e) => setFormData({...formData, elevenlabs_voice_id: e.target.value})}
                  className="w-40 input-dark font-mono text-xs"
                  placeholder="Ou ID manual"
                />
              </div>
              <p className="text-[10px] text-rpg-gold/70 italic">
                <strong>Nota:</strong> No plano <strong>Free</strong>, use apenas vozes '(Nativa)'.
              </p>
            </div>

            {usageError && (
              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] text-red-400">
                  <strong>Erro de Assinatura:</strong> {usageError}
                </p>
                <p className="text-[9px] text-[#6C7280] mt-1 italic">
                  Dica: Verifique se sua API Key possui a permissão 'user_read'.
                </p>
              </div>
            )}
            {usage && (
              <div className="pt-4 border-t border-white/5 space-y-2">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-[#A0A5B5]">Uso de Caracteres</span>
                  <span className="text-[#EDEDED]">
                    {usage.character_count?.toLocaleString()} / {usage.character_limit?.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-rpg-void rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-rpg-gold h-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (usage.character_count / usage.character_limit) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#6C7280]">
                  Plano: <span className="text-[#A0A5B5] capitalize">{usage.tier}</span> • 
                  Reinicia em: <span className="text-[#A0A5B5]">
                    {usage.next_character_count_reset_unix ? new Date(usage.next_character_count_reset_unix * 1000).toLocaleDateString() : 'N/A'}
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kokoro Settings */}
        <Card className={`card-rpg mb-6 border-emerald-500/30 ${formData.tts_provider === 'kokoro' ? 'ring-1 ring-emerald-500/50' : ''}`}>
          <CardHeader className="border-b border-white/10 flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-[#EDEDED] font-serif flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-400" />
                Kokoro Web (Self-Hosted)
              </CardTitle>
              <CardDescription className="text-[#A0A5B5]">
                IA de TTS gratuita e open-source (Local ou API).
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#A0A5B5] uppercase font-bold">Usar este?</span>
              <input 
                type="radio" 
                name="tts_provider" 
                checked={formData.tts_provider === 'kokoro'} 
                onChange={() => setFormData({...formData, tts_provider: 'kokoro'})}
                className="w-4 h-4 accent-emerald-400"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#A0A5B5] uppercase tracking-wider">Base URL</label>
                <Input 
                  value={formData.kokoro_base_url}
                  onChange={(e) => setFormData({...formData, kokoro_base_url: e.target.value})}
                  className="input-dark text-sm"
                  placeholder="http://localhost:3000/api/v1"
                />
                <p className="text-[9px] text-[#6C7280]">
                  URL da sua instância (ex: http://ip:3000/api/v1)
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#A0A5B5] uppercase tracking-wider">API Key (Opcional)</label>
                <Input 
                  type="password"
                  value={formData.kokoro_api_key}
                  onChange={(e) => setFormData({...formData, kokoro_api_key: e.target.value})}
                  className="input-dark font-mono text-sm"
                  placeholder="Sua chave secreta"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#A0A5B5] uppercase tracking-wider">Modelo</label>
                <Input 
                  value={formData.kokoro_model}
                  onChange={(e) => setFormData({...formData, kokoro_model: e.target.value})}
                  className="input-dark text-sm"
                  placeholder="model_q8f16"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#A0A5B5] uppercase tracking-wider">Voz</label>
                <Select 
                  value={formData.kokoro_voice} 
                  onValueChange={(val) => setFormData({...formData, kokoro_voice: val})}
                >
                  <SelectTrigger className="bg-rpg-onyx/50 border-white/10 text-[#EDEDED] font-mono text-sm">
                    <SelectValue placeholder="Selecione uma voz..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1C23] border-white/10 text-[#EDEDED] shadow-xl z-[100]">
                    {fetchingKoVoices ? (
                      <SelectItem value="loading" disabled>Carregando...</SelectItem>
                    ) : koVoices.length > 0 ? (
                      koVoices.map((v) => (
                        <SelectItem key={v.voice_id} value={v.voice_id}>
                          {v.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>Nenhuma voz encontrada</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-[10px] text-emerald-400/70 italic">
              <strong>Dica:</strong> Use o Kokoro para narrações gratuitas e ilimitadas com qualidade ElevenLabs.
            </p>
          </CardContent>
        </Card>

        {/* Deepgram Settings */}
        <Card className={`card-rpg mb-6 border-cyan-500/30 ${formData.tts_provider === 'deepgram' ? 'ring-1 ring-cyan-500/50' : ''}`}>
          <CardHeader className="border-b border-white/10 flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-[#EDEDED] font-serif flex items-center gap-2">
                <Mic2 className="w-5 h-5 text-cyan-400" />
                Narração Deepgram (Aura)
              </CardTitle>
              <CardDescription className="text-[#A0A5B5]">
                Opção de TTS ultra-rápida e econômica.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#A0A5B5] uppercase font-bold">Usar este?</span>
              <input 
                type="radio" 
                name="tts_provider" 
                checked={formData.tts_provider === 'deepgram'} 
                onChange={() => setFormData({...formData, tts_provider: 'deepgram'})}
                className="w-4 h-4 accent-cyan-400"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {dgUsage && (
              <div className="bg-rpg-surface p-3 rounded border border-white/5 space-y-2 mb-4">
                <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-[#A0A5B5]">
                  <span>Status da Conta Deepgram</span>
                  <span className="text-cyan-400 font-bold">{dgUsage.tier}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#EDEDED]">Saldo Disponível:</span>
                  <span className="text-sm font-mono text-cyan-400">
                    {dgUsage.balance?.toLocaleString('en-US', { style: 'currency', currency: dgUsage.units || 'USD' })}
                  </span>
                </div>
                <div className="text-[10px] text-[#A0A5B5]">
                  Projeto: <span className="text-[#EDEDED]">{dgUsage.project_name}</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#A0A5B5] uppercase tracking-wider">Deepgram API Key</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C7280]" />
                <Input 
                  type="password"
                  value={formData.deepgram_api_key}
                  onChange={(e) => setFormData({...formData, deepgram_api_key: e.target.value})}
                  className="pl-10 input-dark font-mono text-sm"
                  placeholder="dg_..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#A0A5B5] uppercase tracking-wider">Modelo Aura</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select 
                    value={formData.deepgram_model} 
                    onValueChange={(val) => setFormData({...formData, deepgram_model: val})}
                  >
                    <SelectTrigger className="bg-rpg-onyx/50 border-white/10 text-[#EDEDED] font-mono text-sm">
                      <SelectValue placeholder="Selecione um modelo..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1C23] border-white/10 text-[#EDEDED] shadow-xl z-[100]">
                      {fetchingDgVoices ? (
                        <SelectItem value="loading" disabled>Carregando...</SelectItem>
                      ) : dgVoices.map((v) => (
                        <SelectItem key={v.voice_id} value={v.voice_id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-[10px] text-cyan-400/70 italic">
                <strong>Vantagem:</strong> Latência quase zero e custo muito baixo.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-rpg mb-6 border-indigo-500/30">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-[#EDEDED] font-serif flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-indigo-400" />
              Configuração do Bot Discord
            </CardTitle>
            <CardDescription className="text-[#A0A5B5]">
              Vincule seu bot do Discord para permitir captura automática no futuro
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bot-token">Token do Bot</Label>
              <Input
                id="bot-token"
                type="password"
                value={formData.discord_bot_token}
                onChange={(e) => setFormData({...formData, discord_bot_token: e.target.value})}
                placeholder="MTIz..."
                className="input-dark font-mono text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="guild-id">ID do Servidor (Guild ID)</Label>
              <Input
                id="guild-id"
                value={formData.discord_guild_id}
                onChange={(e) => setFormData({...formData, discord_guild_id: e.target.value})}
                placeholder="123456789..."
                className="input-dark text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={() => saveSettings(formData)}
            disabled={saving}
            className="btn-gold"
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
