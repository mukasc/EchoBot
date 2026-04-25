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
  Globe,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Layers,
  ShieldAlert
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
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
  ],
  openrouter: [
    { value: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash (OpenRouter)" },
    { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet (OpenRouter)" },
    { value: "meta-llama/llama-3.1-405b-instruct", label: "Llama 3.1 405B (OpenRouter)" },
    { value: "mistralai/mistral-large-2407", label: "Mistral Large 2 (OpenRouter)" },
  ],
  groq: [
    { value: "llama3-70b-8192", label: "Llama 3 70B (Groq)" },
    { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B (Groq)" },
  ]
};

const providerLabels = {
  gemini: "Google Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
  openrouter: "OpenRouter",
  groq: "Groq"
};

const Settings = () => {
  const { settings, loading, saving, saveSettings } = useSettings();
  
  const [formData, setFormData] = useState({
    llm_provider: "gemini",
    llm_model: "gemini-3-flash-preview",
    openai_api_key: "",
    google_api_key: "",
    anthropic_api_key: "",
    custom_api_key: "",
    openrouter_api_key: "",
    groq_api_key: "",
    discord_bot_token: "",
    discord_app_id: "",
    discord_public_key: "",
    discord_guild_id: "",
    elevenlabs_api_key: "",
    elevenlabs_voice_id: "pNInz6obpgmqS2C9NfX",
    deepgram_api_key: "",
    deepgram_model: "aura-asteria-en",
    kokoro_api_key: "",
    kokoro_base_url: "http://localhost:8000/api/v1/audio",
    kokoro_model: "model_q8f16",
    kokoro_voice: "af_heart",
    tts_provider: "elevenlabs",
    llm_fallbacks: [],
    llm_primary_enabled: true
  });

  const [visibleFields, setVisibleFields] = useState({});
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
  const [dynamicModels, setDynamicModels] = useState({});
  const [fetchingModels, setFetchingModels] = useState(false);

  const toggleVisibility = (field) => {
    setVisibleFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  useEffect(() => {
    if (settings) {
      setFormData({
        llm_provider: settings.llm_provider || "gemini",
        llm_model: settings.llm_model || "gemini-3-flash-preview",
        openai_api_key: settings.openai_api_key || "",
        google_api_key: settings.google_api_key || "",
        anthropic_api_key: settings.anthropic_api_key || "",
        custom_api_key: settings.custom_api_key || "",
        openrouter_api_key: settings.openrouter_api_key || "",
        groq_api_key: settings.groq_api_key || "",
        discord_bot_token: settings.discord_bot_token || "",
        discord_app_id: settings.discord_app_id || "",
        discord_public_key: settings.discord_public_key || "",
        discord_guild_id: settings.discord_guild_id || "",
        elevenlabs_api_key: settings.elevenlabs_api_key || "",
        elevenlabs_voice_id: settings.elevenlabs_voice_id || "pNInz6obpgmqS2C9NfX",
        deepgram_api_key: settings.deepgram_api_key || "",
        deepgram_model: settings.deepgram_model || "aura-asteria-en",
        kokoro_api_key: settings.kokoro_api_key || "",
        kokoro_base_url: settings.kokoro_base_url || "http://localhost:8000/api/v1/audio",
        kokoro_model: settings.kokoro_model || "model_q8f16",
        kokoro_voice: settings.kokoro_voice || "af_heart",
        tts_provider: settings.tts_provider || "elevenlabs",
        llm_fallbacks: Array.isArray(settings.llm_fallbacks) ? settings.llm_fallbacks : [],
        llm_primary_enabled: settings.llm_primary_enabled ?? true
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
        const [vRes, uRes] = await Promise.all([
          fetch(`${baseUrl}/api/settings/deepgram/voices?api_key=${formData.deepgram_api_key}`),
          fetch(`${baseUrl}/api/settings/deepgram/usage?api_key=${formData.deepgram_api_key}`)
        ]);
        if (vRes.ok) {
          const data = await vRes.json();
          setDgVoices(data);
        }

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
        const res = await fetch(`${baseUrl}/api/settings/kokoro/voices`);
        if (res.ok) {
          const data = await res.json();
          setKoVoices(data);
        }
      } catch (error) {
        console.error("Erro ao buscar vozes do Kokoro:", error);
      } finally {
        setFetchingKoVoices(false);
      }
    };

    fetchVoicesAndUsage();
    fetchDgVoicesAndUsage();
    fetchKoVoices();
  }, [formData.elevenlabs_api_key, formData.deepgram_api_key, formData.kokoro_base_url]);

  useEffect(() => {
    const providersNeeded = new Set([formData.llm_provider, ...formData.llm_fallbacks.map(f => f.provider)]);

    const fetchOpenRouterModels = async () => {
      if (!providersNeeded.has('openrouter') || dynamicModels.openrouter) return;
      
      setFetchingModels(true);
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${baseUrl}/api/settings/llm/openrouter/models`);
        if (res.ok) {
          const data = await res.json();
          setDynamicModels(prev => ({ ...prev, openrouter: data }));
        }
      } catch (error) {
        console.error("Error fetching OpenRouter models:", error);
      } finally {
        setFetchingModels(false);
      }
    };

    const fetchGroqModels = async () => {
      if (!providersNeeded.has('groq') || dynamicModels.groq) return;
      
      setFetchingModels(true);
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${baseUrl}/api/settings/llm/groq/models`);
        if (res.ok) {
          const data = await res.json();
          setDynamicModels(prev => ({ ...prev, groq: data }));
        }
      } catch (error) {
        console.error("Error fetching Groq models:", error);
      } finally {
        setFetchingModels(false);
      }
    };

    fetchOpenRouterModels();
    fetchGroqModels();
  }, [formData.llm_provider, formData.llm_fallbacks, dynamicModels.openrouter, dynamicModels.groq]);

  const getLLMKeyField = () => {
    switch (formData.llm_provider) {
      case 'openai': return 'openai_api_key';
      case 'gemini': return 'google_api_key';
      case 'anthropic': return 'anthropic_api_key';
      case 'openrouter': return 'openrouter_api_key';
      case 'groq': return 'groq_api_key';
      default: return 'custom_api_key';
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

  const addFallback = () => {
    setFormData({
      ...formData,
      llm_fallbacks: [
        ...formData.llm_fallbacks,
        { provider: "groq", model: "llama3-70b-8192", label: "Novo Fallback", api_key: "", enabled: true }
      ]
    });
  };

  const removeFallback = (index) => {
    const newList = [...formData.llm_fallbacks];
    newList.splice(index, 1);
    setFormData({ ...formData, llm_fallbacks: newList });
  };

  const updateFallback = (index, field, value) => {
    const newList = [...formData.llm_fallbacks];
    newList[index] = { ...newList[index], [field]: value };
    setFormData({ ...formData, llm_fallbacks: newList });
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
        {/* Header - Outside form for better semantics */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#EDEDED] font-serif">
            Configurações
          </h1>
          <p className="text-[#A0A5B5] mt-1">
            Configure os provedores de IA e chaves de API
          </p>
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            saveSettings(formData);
          }}
        >

        {/* LLM Provider Settings */}
        <Card className="card-rpg mb-6">
          <CardHeader className="border-b border-white/10 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[#EDEDED] font-serif flex items-center gap-2">
                <Brain className="w-5 h-5 text-rpg-gold" />
                Provedor de IA
              </CardTitle>
              <CardDescription className="text-[#A0A5B5]">
                Escolha qual LLM será usado para processar as transcrições
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <Label htmlFor="primary-llm-toggle" className="text-[10px] text-[#A0A5B5] uppercase font-bold tracking-wider cursor-pointer">
                  {formData.llm_primary_enabled ? 'Provedor Principal: ATIVO' : 'Provedor Principal: DESATIVADO'}
                </Label>
                <Switch 
                  id="primary-llm-toggle"
                  name="llm_primary_enabled"
                  checked={formData.llm_primary_enabled} 
                  onCheckedChange={(val) => setFormData({ ...formData, llm_primary_enabled: val })}
                  className="scale-90 data-[state=checked]:bg-emerald-500"
                />
              </div>
              {!formData.llm_primary_enabled && (
                <span className="text-[9px] text-amber-400 font-medium animate-pulse">
                  O sistema usará apenas os fallbacks abaixo
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className={`p-6 space-y-6 transition-opacity duration-200 ${!formData.llm_primary_enabled ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
            <div className="space-y-2">
              <Label htmlFor="llm-provider" className="text-[#EDEDED]">Provedor</Label>
              <Select value={formData.llm_provider} onValueChange={handleProviderChange}>
                <SelectTrigger id="llm-provider" name="llm_provider" className="input-dark">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-rpg-surface border-white/10">
                  <SelectItem value="gemini" textValue="Google Gemini">
                    <div className="flex items-center gap-2">
                      <span key="txt">Google Gemini</span>
                      <Badge key="badge" className="bg-rpg-gold/10 text-rpg-gold text-[10px]">Recomendado</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                  <SelectItem value="groq">Groq</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="llm-model" className="text-[#EDEDED]">Modelo</Label>
              <Select 
                value={formData.llm_model} 
                onValueChange={(value) => setFormData({...formData, llm_model: value})}
              >
                <SelectTrigger id="llm-model" className="input-dark">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-rpg-surface border-white/10 max-h-[300px]">
                  {fetchingModels ? (
                    <SelectItem value="loading" disabled>Carregando modelos...</SelectItem>
                  ) : (
                    (dynamicModels[formData.llm_provider] || llmModels[formData.llm_provider] || [])
                      .filter(m => m && m.value)
                      .map((model, idx) => (
                        <SelectItem key={`primary-${model.value}-${idx}`} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))
                  )}
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
                <div className="relative">
                  <Input
                    id="api-key"
                    type={visibleFields[getLLMKeyField()] ? "text" : "password"}
                    value={formData[getLLMKeyField()]}
                    onChange={(e) => setFormData({
                      ...formData, 
                      [getLLMKeyField()]: e.target.value
                    })}
                    placeholder="Insira sua chave aqui..."
                    className="input-dark font-mono text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility(getLLMKeyField())}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6C7280] hover:text-white transition-colors"
                  >
                    {visibleFields[getLLMKeyField()] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LLM Fallback Chain */}
        <Card className="card-rpg mb-6 border-amber-500/20">
          <CardHeader className="border-b border-white/10 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[#EDEDED] font-serif flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                Plano de Contingência (Fallbacks)
              </CardTitle>
              <CardDescription className="text-[#A0A5B5]">
                Se o provedor principal falhar, o bot tentará estes em ordem
              </CardDescription>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={addFallback}
              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Fallback
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {formData.llm_fallbacks?.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-white/5 rounded-lg">
                  <p className="text-sm text-[#6C7280]">Nenhum fallback configurado.</p>
                </div>
              ) : (
                formData.llm_fallbacks?.map((fb, index) => (
                  <div key={index} className={`p-4 rounded-lg bg-white/5 border border-white/10 space-y-4 transition-all duration-200 ${fb.enabled === false ? 'border-dashed opacity-60' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={`border-amber-500/20 ${fb.enabled !== false ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-500/10 text-gray-400 opacity-50'}`}>
                          Prioridade #{index + 1}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Switch 
                            id={`fb-enabled-${index}`}
                            name={`fallback_enabled_${index}`}
                            checked={fb.enabled !== false} 
                            onCheckedChange={(val) => updateFallback(index, "enabled", val)}
                            className="scale-75"
                          />
                          <Label htmlFor={`fb-enabled-${index}`} className="text-[10px] text-[#A0A5B5] uppercase font-semibold cursor-pointer">
                            {fb.enabled !== false ? 'Ativo' : 'Inativo'}
                          </Label>
                        </div>
                      </div>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeFallback(index)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-200 ${fb.enabled === false ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                      <div className="space-y-2">
                        <Label htmlFor={`fb-provider-${index}`} className="text-xs text-[#A0A5B5]">Provedor</Label>
                        <Select 
                          value={fb.provider} 
                          onValueChange={(val) => updateFallback(index, "provider", val)}
                        >
                          <SelectTrigger id={`fb-provider-${index}`} className="input-dark h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-rpg-surface border-white/10">
                            <SelectItem value="gemini">Google Gemini</SelectItem>
                            <SelectItem value="openai">OpenAI</SelectItem>
                            <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                            <SelectItem value="openrouter">OpenRouter</SelectItem>
                            <SelectItem value="groq">Groq</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`fb-model-${index}`} className="text-xs text-[#A0A5B5]">Modelo</Label>
                        <Select 
                          value={fb.model} 
                          onValueChange={(val) => updateFallback(index, "model", val)}
                        >
                          <SelectTrigger id={`fb-model-${index}`} className="input-dark h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-rpg-surface border-white/10">
                            {fetchingModels && !dynamicModels[fb.provider] && (fb.provider === 'openrouter' || fb.provider === 'groq') ? (
                              <SelectItem value="loading" disabled>Carregando modelos...</SelectItem>
                            ) : (
                              (dynamicModels[fb.provider] || llmModels[fb.provider] || [])?.map((m, idx) => (
                                <SelectItem key={`${m.value}-${idx}`} value={m.value}>{m.label}</SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className={`space-y-2 transition-all duration-200 ${fb.enabled === false ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                      <Label htmlFor={`fb-key-${index}`} className="text-xs text-[#A0A5B5]">API Key Específica (Opcional)</Label>
                      <div className="relative">
                        <Input
                          id={`fb-key-${index}`}
                          type={visibleFields[`fallback_${index}`] ? "text" : "password"}
                          value={fb.api_key || ""}
                          onChange={(e) => updateFallback(index, "api_key", e.target.value)}
                          placeholder="Deixe em branco para usar a chave global"
                          className="input-dark h-9 font-mono text-xs pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => toggleVisibility(`fallback_${index}`)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6C7280] hover:text-white transition-colors"
                        >
                          {visibleFields[`fallback_${index}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Discord Bot Settings */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="discord-app-id">Application ID</Label>
                <Input
                  id="discord-app-id"
                  value={formData.discord_app_id}
                  onChange={(e) => setFormData({ ...formData, discord_app_id: e.target.value })}
                  placeholder="ID da aplicação Discord"
                  className="input-dark text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discord-public-key">Public Key</Label>
                <Input
                  id="discord-public-key"
                  value={formData.discord_public_key}
                  onChange={(e) => setFormData({ ...formData, discord_public_key: e.target.value })}
                  placeholder="Chave pública da aplicação"
                  className="input-dark text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discord-guild-id">Guild ID (Opcional)</Label>
                <Input
                  id="discord-guild-id"
                  value={formData.discord_guild_id}
                  onChange={(e) => setFormData({ ...formData, discord_guild_id: e.target.value })}
                  placeholder="ID do servidor principal"
                  className="input-dark text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discord-bot-token">Bot Token</Label>
                <div className="relative">
                  <Input
                    id="discord-bot-token"
                    type={visibleFields.discord_bot_token ? "text" : "password"}
                    value={formData.discord_bot_token}
                    onChange={(e) => setFormData({ ...formData, discord_bot_token: e.target.value })}
                    placeholder="Token do bot (MTQ4...)"
                    className="input-dark pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility('discord_bot_token')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6C7280] hover:text-white transition-colors"
                  >
                    {visibleFields.discord_bot_token ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`card-rpg mb-6 border-rpg-gold/30 ${formData.tts_provider === 'elevenlabs' ? 'ring-1 ring-rpg-gold/50' : ''}`}>
          <CardHeader className="border-b border-white/10 flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-[#EDEDED] font-serif flex items-center gap-2">
                <div className="w-5 h-5 flex items-center justify-center bg-rpg-gold/20 rounded text-[10px] text-rpg-gold font-bold">11</div>
                ElevenLabs (Narração)
              </CardTitle>
              <CardDescription className="text-[#A0A5B5]">
                Configure a API para geração de áudio épico a partir do roteiro
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="use-elevenlabs" className="text-[10px] text-[#A0A5B5] uppercase font-bold cursor-pointer">Usar este?</Label>
              <input 
                id="use-elevenlabs"
                type="radio" 
                name="tts_provider" 
                checked={formData.tts_provider === 'elevenlabs'} 
                onChange={() => setFormData({...formData, tts_provider: 'elevenlabs'})}
                className="w-4 h-4 accent-rpg-gold"
              />
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eleven-key">Chave de API ElevenLabs</Label>
              <div className="relative">
                <Input
                  id="eleven-key"
                  type={visibleFields.elevenlabs_api_key ? "text" : "password"}
                  value={formData.elevenlabs_api_key}
                  onChange={(e) => setFormData({...formData, elevenlabs_api_key: e.target.value})}
                  placeholder="Insira sua chave aqui..."
                  className="input-dark font-mono text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility("elevenlabs_api_key")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6C7280] hover:text-white transition-colors"
                >
                  {visibleFields.elevenlabs_api_key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="voice-id" className="text-[#A0A5B5] font-medium">Voz (Voice ID)</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    value={formData.elevenlabs_voice_id}
                    onValueChange={(val) => setFormData({...formData, elevenlabs_voice_id: val})}
                  >
                    <SelectTrigger id="voice-id" className="bg-rpg-onyx/50 border-white/10 text-[#EDEDED] font-mono text-sm">
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
                      voices.filter(v => v && v.voice_id).map((v, idx) => (
                        <SelectItem key={`el-voice-${v.voice_id}-${idx}`} value={v.voice_id} textValue={v.name}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <span key="name">{v.name}</span>
                            <span key="cat" className={`text-[9px] px-1.5 py-0.5 rounded ${
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
                  id="voice-id-manual"
                  name="elevenlabs_voice_id_manual"
                  value={formData.elevenlabs_voice_id}
                  onChange={(e) => setFormData({...formData, elevenlabs_voice_id: e.target.value})}
                  className="w-40 input-dark font-mono text-xs"
                  placeholder="Ou ID manual"
                  aria-label="ID da voz manual"
                />
              </div>
            </div>

            {usageError && (
              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] text-red-400">
                  <strong>Erro de Assinatura:</strong> {usageError}
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
              <Label htmlFor="use-kokoro" className="text-[10px] text-[#A0A5B5] uppercase font-bold cursor-pointer">Usar este?</Label>
              <input 
                id="use-kokoro"
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
                <Label htmlFor="kokoro-url" className="text-xs font-bold text-[#A0A5B5] uppercase tracking-wider">Base URL</Label>
                <Input 
                  id="kokoro-url"
                  value={formData.kokoro_base_url}
                  onChange={(e) => setFormData({...formData, kokoro_base_url: e.target.value})}
                  className="input-dark text-sm"
                  placeholder="http://localhost:3000/api/v1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kokoro-key" className="text-xs font-bold text-[#A0A5B5] uppercase tracking-wider">API Key (Opcional)</Label>
                <div className="relative">
                  <Input 
                    id="kokoro-key"
                    type={visibleFields.kokoro_api_key ? "text" : "password"}
                    value={formData.kokoro_api_key}
                    onChange={(e) => setFormData({...formData, kokoro_api_key: e.target.value})}
                    className="input-dark font-mono text-sm pr-10"
                    placeholder="Sua chave secreta"
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility("kokoro_api_key")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6C7280] hover:text-white transition-colors"
                  >
                    {visibleFields.kokoro_api_key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kokoro-model" className="text-xs font-bold text-[#A0A5B5] uppercase tracking-wider">Modelo</Label>
                <Input 
                  id="kokoro-model"
                  value={formData.kokoro_model}
                  onChange={(e) => setFormData({...formData, kokoro_model: e.target.value})}
                  className="input-dark text-sm"
                  placeholder="model_q8f16"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kokoro-voice" className="text-xs font-bold text-[#A0A5B5] uppercase tracking-wider">Voz</Label>
                <Select 
                  value={formData.kokoro_voice} 
                  onValueChange={(val) => setFormData({...formData, kokoro_voice: val})}
                >
                  <SelectTrigger id="kokoro-voice" className="bg-rpg-onyx/50 border-white/10 text-[#EDEDED] font-mono text-sm">
                    <SelectValue placeholder="Selecione uma voz..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1C23] border-white/10 text-[#EDEDED] shadow-xl z-[100]">
                    {fetchingKoVoices ? (
                      <SelectItem value="loading" disabled>Carregando...</SelectItem>
                    ) : koVoices.length > 0 ? (
                      koVoices.filter(v => v && v.voice_id).map((v, idx) => (
                        <SelectItem key={`ko-voice-${v.voice_id}-${idx}`} value={v.voice_id}>
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
              <Label htmlFor="use-deepgram" className="text-[10px] text-[#A0A5B5] uppercase font-bold cursor-pointer">Usar este?</Label>
              <input 
                id="use-deepgram"
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
              <div className="bg-rpg-surface p-3 rounded border border-white/5 space-y-3 mb-4">
                <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-[#A0A5B5]">
                  <span>Status Deepgram</span>
                  <span className="text-cyan-400 font-bold">{dgUsage.tier}</span>
                </div>
                {dgUsage.balance !== undefined && (
                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="text-[11px] text-[#A0A5B5]">Saldo Disponível</span>
                    <span className="text-sm font-mono text-emerald-400 font-bold">
                      {dgUsage.balance.toLocaleString('en-US', { 
                        style: 'currency', 
                        currency: dgUsage.units || 'USD' 
                      })}
                    </span>
                  </div>
                )}
                {dgUsage.project_name && (
                  <div className="text-[9px] text-[#6C7280] italic">
                    Projeto: {dgUsage.project_name}
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="deepgram-key" className="text-xs font-bold text-[#A0A5B5] uppercase tracking-wider">Deepgram API Key</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C7280]" />
                <Input 
                  id="deepgram-key"
                  type={visibleFields.deepgram_api_key ? "text" : "password"}
                  value={formData.deepgram_api_key}
                  onChange={(e) => setFormData({...formData, deepgram_api_key: e.target.value})}
                  className="pl-10 pr-10 input-dark font-mono text-sm"
                  placeholder="dg_..."
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility("deepgram_api_key")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6C7280] hover:text-white transition-colors"
                >
                  {visibleFields.deepgram_api_key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deepgram-model" className="text-xs font-bold text-[#A0A5B5] uppercase tracking-wider">Modelo Aura</Label>
              <Select 
                value={formData.deepgram_model} 
                onValueChange={(val) => setFormData({...formData, deepgram_model: val})}
              >
                <SelectTrigger id="deepgram-model" className="bg-rpg-onyx/50 border-white/10 text-[#EDEDED] font-mono text-sm">
                  <SelectValue placeholder="Selecione um modelo..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1C23] border-white/10 text-[#EDEDED] shadow-xl z-[100]">
                  {fetchingDgVoices ? (
                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                  ) : dgVoices.length > 0 ? (
                    dgVoices.filter(v => v && v.voice_id).map((v, idx) => (
                      <SelectItem key={`dg-voice-${v.voice_id}-${idx}`} value={v.voice_id}>
                        {v.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>Nenhum modelo encontrado</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end mt-8">
          <Button
            type="submit"
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
      </form>
    </div>
  </div>
);
};

export default Settings;
