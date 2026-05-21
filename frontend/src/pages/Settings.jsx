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
  ShieldAlert,
  ExternalLink,
  AlertCircle,
  Cpu
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
import { useTranslation } from "react-i18next";

const llmModels = {
  openai: { label: 'settings.providerNames.openai', models: ['gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o1-mini'] },
  anthropic: { label: 'settings.providerNames.anthropic', models: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-20240229'] },
  gemini: { label: 'settings.providerNames.google', models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'] },
  groq: { label: 'settings.providerNames.groq', models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'] },
  openrouter: { label: 'settings.providerNames.openrouter', models: ['deepseek/deepseek-chat', 'anthropic/claude-3.5-sonnet', 'google/gemini-pro-1.5'] }
};

const Settings = () => {
  const { t, i18n } = useTranslation();
  const { settings, loading, saving, saveSettings } = useSettings();
  
  const [formData, setFormData] = useState({
    llm_provider: "gemini",
    llm_model: "gemini-1.5-flash",
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
    llm_primary_enabled: true,
    notion_api_key: "",
    notion_page_id: "",
    whisper_model: "medium",
    whisper_device: "auto",
    whisper_compute_type: "auto",
    whisper_cpu_threads: 0,
    visual_theme: "dark_fantasy",
    language: "pt-BR"
  });

  const [visibleFields, setVisibleFields] = useState({});
  const [voices, setVoices] = useState([]);
  const [fetchingVoices, setFetchingVoices] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [usage, setUsage] = useState(null);
  const [usageError, setUsageError] = useState(null);
  const [dgUsage, setDgUsage] = useState(null);
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
        llm_model: settings.llm_model || "gemini-1.5-flash",
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
        llm_primary_enabled: settings.llm_primary_enabled ?? true,
        notion_api_key: settings.notion_api_key || "",
        notion_page_id: settings.notion_page_id || "",
        whisper_model: settings.whisper_model || "medium",
        whisper_device: settings.whisper_device || "auto",
        whisper_compute_type: settings.whisper_compute_type || "auto",
        whisper_cpu_threads: settings.whisper_cpu_threads ?? 0,
        visual_theme: settings.visual_theme || "dark_fantasy",
        language: settings.language || i18n.language || "en-US"
      });
    }
  }, [settings, i18n]);

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
          fetch(`${baseUrl}/api/settings/elevenlabs/voices/?api_key=${formData.elevenlabs_api_key}`),
          fetch(`${baseUrl}/api/settings/elevenlabs/usage/?api_key=${formData.elevenlabs_api_key}`)
        ]);

        if (vRes.ok) {
          const data = await vRes.json();
          setVoices(data);
        } else {
          const errorData = await vRes.json();
          setVoiceError(errorData.detail || "Error fetching voices");
          setVoices([]);
        }

        if (uRes.ok) {
          const data = await uRes.json();
          setUsage(data);
        } else {
          const errorData = await uRes.json();
          setUsageError(errorData.detail || "Error fetching usage");
          setUsage(null);
        }
      } catch (error) {
        console.error("Erro ao buscar dados do ElevenLabs:", error);
        setVoiceError(t('settings.voiceError'));
      } finally {
        setFetchingVoices(false);
      }
    };

    const fetchDgVoicesAndUsage = async () => {
      if (!formData.deepgram_api_key) return;
      setFetchingDgVoices(true);
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const [vRes, uRes] = await Promise.all([
          fetch(`${baseUrl}/api/settings/deepgram/voices/?api_key=${formData.deepgram_api_key}`),
          fetch(`${baseUrl}/api/settings/deepgram/usage/?api_key=${formData.deepgram_api_key}`)
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
      }
    };

    const fetchKoVoices = async () => {
      if (!formData.kokoro_base_url) return;
      setFetchingKoVoices(true);
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${baseUrl}/api/settings/kokoro/voices/?base_url=${formData.kokoro_base_url}`);
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
  }, [formData.elevenlabs_api_key, formData.deepgram_api_key, formData.kokoro_base_url, t]);

  useEffect(() => {
    const fetchModels = async (provider) => {
      if (!['openai', 'gemini', 'groq', 'openrouter'].includes(provider)) return;
      
      setFetchingModels(true);
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${baseUrl}/api/settings/llm/${provider}/models/`);
        if (res.ok) {
          const data = await res.json();
          setDynamicModels(prev => ({ ...prev, [provider]: data }));
        }
      } catch (error) {
        console.error(`Erro ao buscar modelos para ${provider}:`, error);
      } finally {
        setFetchingModels(false);
      }
    };

    fetchModels(formData.llm_provider);
    
    // Also check if any fallbacks need model fetching
    formData.llm_fallbacks.forEach(fb => {
      if (fb.provider && !dynamicModels[fb.provider]) {
        fetchModels(fb.provider);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.llm_provider, formData.llm_fallbacks, formData.openai_api_key, formData.google_api_key, formData.groq_api_key, formData.openrouter_api_key]);

  const addFallback = () => {
    setFormData({
      ...formData,
      llm_fallbacks: [
        ...formData.llm_fallbacks,
        { provider: "groq", model: "llama-3.1-8b-instant", api_key: "", enabled: true }
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
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rpg-void bg-pattern">
      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] font-serif">
            {t('settings.title')}
          </h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            {t('settings.subtitle')}
          </p>
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            saveSettings(formData);
          }}
        >

        {/* LLM Provider Settings */}
        <Card className="card-rpg mb-6 animate-in-slide-up">
          <CardHeader className="border-b border-border flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[var(--foreground)] font-serif flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                {t('settings.llmPrimary')}
              </CardTitle>
              <CardDescription className="text-[var(--muted-foreground)]">
                {t('settings.apiSettingsDesc')}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <Switch 
                  id="primary-llm-enable"
                  checked={formData.llm_primary_enabled}
                  onCheckedChange={(val) => setFormData({...formData, llm_primary_enabled: val})}
                />
                <Label htmlFor="primary-llm-enable" className="text-xs font-bold text-[var(--muted-foreground)] uppercase cursor-pointer">
                  {t('settings.enablePrimary')}
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {!formData.llm_primary_enabled && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3 mb-4">
                <span className="text-amber-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" />
                  {t('settings.noPrimaryWarning')}
                </span>
              </div>
            )}
            
            <div className={`space-y-6 transition-all duration-200 ${!formData.llm_primary_enabled ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="primary-provider" className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">{t('settings.provider')}</Label>
                  <Select 
                    value={formData.llm_provider} 
                    onValueChange={(val) => setFormData({...formData, llm_provider: val})}
                  >
                    <SelectTrigger id="primary-provider" className="bg-rpg-onyx/50 border-border text-[var(--foreground)] font-mono text-sm">
                      <SelectValue placeholder={t('settings.selectProvider')} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1C23] border-border text-[var(--foreground)] shadow-xl z-[100]">
                      {Object.keys(llmModels).map((provider) => (
                        <SelectItem key={provider} value={provider}>{t(llmModels[provider].label)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primary-model" className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">{t('settings.model')}</Label>
                  <Select 
                    value={formData.llm_model} 
                    onValueChange={(val) => setFormData({...formData, llm_model: val})}
                  >
                    <SelectTrigger id="primary-model" className="bg-rpg-onyx/50 border-border text-[var(--foreground)] font-mono text-sm">
                      <SelectValue placeholder={fetchingModels ? t('settings.loading') : t('settings.model')} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1C23] border-border text-[var(--foreground)] shadow-xl z-[100]">
                      {formData.llm_provider && (dynamicModels[formData.llm_provider] || (llmModels[formData.llm_provider] && llmModels[formData.llm_provider].models)) ? (
                        (dynamicModels[formData.llm_provider] || llmModels[formData.llm_provider].models).map((m) => {
                          const val = typeof m === 'string' ? m : m.value;
                          const lab = typeof m === 'string' ? m : m.label;
                          return <SelectItem key={val} value={val}>{lab}</SelectItem>;
                        })
                      ) : (
                        <SelectItem value="none" disabled>{t('settings.noModelsFound')}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primary-api-key" className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">{t('settings.apiKey')}</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                  <Input 
                    id="primary-api-key"
                    type={visibleFields.primary_api_key ? "text" : "password"}
                    value={formData[`${formData.llm_provider === 'gemini' ? 'google' : formData.llm_provider}_api_key`] || ""}
                    onChange={(e) => {
                      const providerKey = `${formData.llm_provider === 'gemini' ? 'google' : formData.llm_provider}_api_key`;
                      setFormData({...formData, [providerKey]: e.target.value});
                    }}
                    className="pl-10 pr-10 input-dark font-mono text-sm"
                    placeholder={t('settings.apiKeyPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility("primary_api_key")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-white transition-colors"
                  >
                    {visibleFields.primary_api_key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LLM Fallback Chain */}
        <Card className="card-rpg mb-6 border-amber-500/20">
          <CardHeader className="border-b border-border flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[var(--foreground)] font-serif flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                {t('settings.llmFallbacks')}
              </CardTitle>
              <CardDescription className="text-[var(--muted-foreground)]">
                {t('settings.llmFallbacksDesc')}
              </CardDescription>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={addFallback}
              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            >
              <Plus className="w-4 h-4 mr-1" /> {t('settings.addFallback')}
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {formData.llm_fallbacks.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-border rounded-lg">
                  <p className="text-sm text-[var(--muted-foreground)]">{t('settings.noFallbacks')}</p>
                </div>
              ) : (
                formData.llm_fallbacks.map((fb, index) => (
                  <div key={index} className="p-4 rounded-lg bg-rpg-surface border border-border space-y-4 relative group">
                    <button 
                      type="button"
                      onClick={() => removeFallback(index)}
                      className="absolute top-2 right-2 text-[var(--muted-foreground)] hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-[var(--muted-foreground)] uppercase">{t('settings.provider')}</Label>
                        <Select 
                          value={fb.provider} 
                          onValueChange={(val) => updateFallback(index, "provider", val)}
                        >
                          <SelectTrigger className="bg-rpg-onyx/50 border-border text-[var(--foreground)] font-mono text-xs h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1A1C23] border-border text-[var(--foreground)] shadow-xl z-[100]">
                            {Object.keys(llmModels).map((provider) => (
                              <SelectItem key={provider} value={provider}>{t(llmModels[provider].label)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-[var(--muted-foreground)] uppercase">{t('settings.model')}</Label>
                        <Select 
                          value={fb.model} 
                          onValueChange={(val) => updateFallback(index, "model", val)}
                        >
                          <SelectTrigger className="bg-rpg-onyx/50 border-border text-[var(--foreground)] font-mono text-xs h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1A1C23] border-border text-[var(--foreground)] shadow-xl z-[100]">
                            {(dynamicModels[fb.provider] || (llmModels[fb.provider] && llmModels[fb.provider].models)) ? (
                              (dynamicModels[fb.provider] || llmModels[fb.provider].models).map((m) => {
                                const val = typeof m === 'string' ? m : m.value;
                                const lab = typeof m === 'string' ? m : m.label;
                                return <SelectItem key={val} value={val}>{lab}</SelectItem>;
                              })
                            ) : (
                              <SelectItem value="none" disabled>{t('settings.noModelsFound')}</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-[var(--muted-foreground)] uppercase">{t('settings.apiKey')}</Label>
                      <div className="relative">
                        <Key className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--muted-foreground)]" />
                        <Input 
                          type={visibleFields[`fb_${index}`] ? "text" : "password"}
                          value={fb.api_key || ""}
                          onChange={(e) => updateFallback(index, "api_key", e.target.value)}
                          className="pl-8 pr-10 input-dark font-mono text-xs h-9"
                          placeholder={t('settings.apiKeyPlaceholder')}
                        />
                        <button
                          type="button"
                          onClick={() => toggleVisibility(`fb_${index}`)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-white transition-colors"
                        >
                          {visibleFields[`fb_${index}`] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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
          <CardHeader className="border-b border-border">
            <CardTitle className="text-[var(--foreground)] font-serif flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-indigo-400" />
              {t('settings.voiceBridge')}
            </CardTitle>
            <CardDescription className="text-[var(--muted-foreground)]">
              {t('settings.voiceBridgeDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="discord-app-id" className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">{t('settings.discordAppIdLabel')}</Label>
                <Input
                  id="discord-app-id"
                  value={formData.discord_app_id}
                  onChange={(e) => setFormData({ ...formData, discord_app_id: e.target.value })}
                  placeholder={t('settings.discordAppIdPlaceholder')}
                  className="input-dark text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discord-public-key" className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">{t('settings.discordPublicKeyLabel')}</Label>
                <Input
                  id="discord-public-key"
                  value={formData.discord_public_key}
                  onChange={(e) => setFormData({ ...formData, discord_public_key: e.target.value })}
                  placeholder={t('settings.discordPublicKeyPlaceholder')}
                  className="input-dark text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="discord-guild-id" className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">{t('settings.discordGuildIdLabel')}</Label>
                <Input
                  id="discord-guild-id"
                  value={formData.discord_guild_id}
                  onChange={(e) => setFormData({ ...formData, discord_guild_id: e.target.value })}
                  placeholder={t('settings.discordGuildIdPlaceholder')}
                  className="input-dark text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discord-bot-token" className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">{t('settings.discordBotTokenLabel')}</Label>
                <div className="relative">
                  <Input
                    id="discord-bot-token"
                    type={visibleFields.discord_bot_token ? "text" : "password"}
                    value={formData.discord_bot_token}
                    onChange={(e) => setFormData({ ...formData, discord_bot_token: e.target.value })}
                    placeholder={t('settings.discordBotTokenPlaceholder')}
                    className="input-dark pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility('discord_bot_token')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-white transition-colors"
                  >
                    {visibleFields.discord_bot_token ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ElevenLabs Settings */}
        <Card className={`card-rpg mb-6 border-primary/30 ${formData.tts_provider === 'elevenlabs' ? 'ring-1 ring-primary/50' : ''}`}>
          <CardHeader className="border-b border-border flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-[var(--foreground)] font-serif flex items-center gap-2">
                <Music className="w-5 h-5 text-primary" />
                {t('settings.elevenLabsTitle')}
              </CardTitle>
              <CardDescription className="text-[var(--muted-foreground)]">
                {t('settings.elevenLabsDesc')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="use-elevenlabs" className="text-[10px] text-[var(--muted-foreground)] uppercase font-bold cursor-pointer">{t('settings.useThis')}</Label>
              <input 
                id="use-elevenlabs"
                type="radio" 
                name="tts_provider" 
                checked={formData.tts_provider === 'elevenlabs'} 
                onChange={() => setFormData({...formData, tts_provider: 'elevenlabs'})}
                className="w-4 h-4 accent-primary"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="eleven-key" className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">{t('settings.elevenLabsKeyLabel')}</Label>
              <div className="relative">
                <Input 
                  id="eleven-key"
                  type={visibleFields.elevenlabs_api_key ? "text" : "password"}
                  value={formData.elevenlabs_api_key}
                  onChange={(e) => setFormData({...formData, elevenlabs_api_key: e.target.value})}
                  className="input-dark font-mono text-sm pr-10"
                  placeholder={t('settings.apiKeyPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility("elevenlabs_api_key")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-white transition-colors"
                >
                  {visibleFields.elevenlabs_api_key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="voice-id" className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">{t('settings.voiceIdLabel')}</Label>
                <Select 
                  value={formData.elevenlabs_voice_id} 
                  onValueChange={(val) => setFormData({...formData, elevenlabs_voice_id: val})}
                >
                  <SelectTrigger id="voice-id" className="bg-rpg-onyx/50 border-border text-[var(--foreground)] font-mono text-sm">
                    <SelectValue placeholder={t('settings.voiceIdPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1C23] border-border text-[var(--foreground)] shadow-xl z-[100]">
                    {fetchingVoices ? (
                      <SelectItem value="loading" disabled>{t('settings.loadingVoices')}</SelectItem>
                    ) : voiceError ? (
                      <SelectItem value="error" disabled className="text-red-400 text-xs">
                        {voiceError}
                      </SelectItem>
                    ) : voices.length > 0 ? (
                      voices
                        .filter(v => v && v.voice_id)
                        .filter(v => {
                          // Se for PT-BR, prioriza vozes com label 'portuguese' ou 'brazilian'
                          // If language is English, prioritize voices with 'english' or 'american'
                          // Multilingual voices appear in both languages
                          const isPt = i18n.language === 'pt-BR';
                          if (!v.labels) return true; // If no label, always show
                          const labels = Object.values(v.labels).join(' ').toLowerCase();
                          if (isPt) return labels.includes('portuguese') || labels.includes('multilingual') || labels.includes('brazil');
                          return labels.includes('english') || labels.includes('multilingual') || labels.includes('american') || labels.includes('british');
                        })
                        .map((v, idx) => (
                          <SelectItem key={`el-voice-${v.voice_id}-${idx}`} value={v.voice_id}>
                            {v.name} {v.labels?.language && `(${v.labels.language})`}
                          </SelectItem>
                        ))
                    ) : (
                      <SelectItem value="none" disabled>{t('settings.insertKeyForVoices')}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-voice-id" className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">ID Manual</Label>
                <Input 
                  id="manual-voice-id"
                  value={formData.elevenlabs_voice_id}
                  onChange={(e) => setFormData({...formData, elevenlabs_voice_id: e.target.value})}
                  className="input-dark text-sm font-mono"
                  placeholder={t('settings.manualVoiceIdPlaceholder')}
                />
              </div>
            </div>

            {usageError && (
              <div className="pt-2">
                <p className="text-[10px] text-red-400">
                  <strong>{t('settings.subscriptionError')}:</strong> {usageError}
                </p>
              </div>
            )}
            {usage && (
              <div className="pt-2 space-y-2">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-[var(--muted-foreground)]">{t('settings.characterUsage')}</span>
                  <span className="text-[var(--foreground)]">
                    {usage.character_count?.toLocaleString()} / {usage.character_limit?.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-rpg-void rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (usage.character_count / usage.character_limit) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kokoro Settings */}
        <Card className={`card-rpg mb-6 border-emerald-500/30 ${formData.tts_provider === 'kokoro' ? 'ring-1 ring-emerald-500/50' : ''}`}>
          <CardHeader className="border-b border-border flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-[var(--foreground)] font-serif flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-400" />
                {t('settings.kokoroTitle')}
              </CardTitle>
              <CardDescription className="text-[var(--muted-foreground)]">
                {t('settings.kokoroDesc')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="use-kokoro" className="text-[10px] text-[var(--muted-foreground)] uppercase font-bold cursor-pointer">{t('settings.useThis')}</Label>
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
                <Label htmlFor="kokoro-url" className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">{t('settings.kokoroBaseUrlLabel')}</Label>
                <Input 
                  id="kokoro-url"
                  value={formData.kokoro_base_url}
                  onChange={(e) => setFormData({...formData, kokoro_base_url: e.target.value})}
                  className="input-dark text-sm"
                  placeholder={t('settings.kokoroBaseUrlPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kokoro-key" className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">{t('settings.kokoroApiKeyLabel')}</Label>
                <div className="relative">
                  <Input 
                    id="kokoro-key"
                    type={visibleFields.kokoro_api_key ? "text" : "password"}
                    value={formData.kokoro_api_key}
                    onChange={(e) => setFormData({...formData, kokoro_api_key: e.target.value})}
                    className="input-dark font-mono text-sm pr-10"
                    placeholder={t('settings.kokoroApiKeyPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility("kokoro_api_key")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-white transition-colors"
                  >
                    {visibleFields.kokoro_api_key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kokoro-model" className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">{t('settings.kokoroModelLabel')}</Label>
                <Input 
                  id="kokoro-model"
                  value={formData.kokoro_model}
                  onChange={(e) => setFormData({...formData, kokoro_model: e.target.value})}
                  className="input-dark text-sm"
                  placeholder="model_q8f16"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kokoro-voice" className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">{t('settings.kokoroVoiceLabel')}</Label>
                <Select 
                  value={formData.kokoro_voice} 
                  onValueChange={(val) => setFormData({...formData, kokoro_voice: val})}
                >
                  <SelectTrigger id="kokoro-voice" className="bg-rpg-onyx/50 border-border text-[var(--foreground)] font-mono text-sm">
                    <SelectValue placeholder={t('settings.kokoroVoicePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1C23] border-border text-[var(--foreground)] shadow-xl z-[100]">
                    {fetchingKoVoices ? (
                      <SelectItem value="loading" disabled>{t('settings.loading')}</SelectItem>
                    ) : koVoices.length > 0 ? (
                      koVoices
                        .filter(v => v && v.voice_id)
                        .filter(v => {
                          const isPt = i18n.language === 'pt-BR';
                          const id = v.voice_id.toLowerCase();
                          if (isPt) return id.startsWith('p');
                          return id.startsWith('a') || id.startsWith('b');
                        })
                        .map((v, idx) => (
                          <SelectItem key={`ko-voice-${v.voice_id}-${idx}`} value={v.voice_id}>
                            {v.name}
                          </SelectItem>
                        ))
                    ) : (
                      <SelectItem value="none" disabled>{t('settings.noneFound')}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deepgram Settings */}
        <Card className={`card-rpg mb-6 border-cyan-500/30 ${formData.tts_provider === 'deepgram' ? 'ring-1 ring-cyan-500/50' : ''}`}>
          <CardHeader className="border-b border-border flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-[var(--foreground)] font-serif flex items-center gap-2">
                <Mic2 className="w-5 h-5 text-cyan-400" />
                {t('settings.deepgramTitle')}
              </CardTitle>
              <CardDescription className="text-[var(--muted-foreground)]">
                {t('settings.deepgramDesc')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="use-deepgram" className="text-[10px] text-[var(--muted-foreground)] uppercase font-bold cursor-pointer">{t('settings.useThis')}</Label>
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
                <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                  <span>{t('settings.deepgramStatus')}</span>
                  <span className="text-cyan-400 font-bold">{dgUsage.tier}</span>
                </div>
                {dgUsage.balance !== undefined && (
                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="text-[11px] text-[var(--muted-foreground)]">{t('settings.availableBalance')}</span>
                    <span className="text-sm font-mono text-emerald-400 font-bold">
                      {dgUsage.balance.toLocaleString('en-US', { 
                         style: 'currency', 
                         currency: dgUsage.units || 'USD' 
                       })}
                    </span>
                  </div>
                )}
                {dgUsage.project_name && (
                  <div className="text-[9px] text-[var(--muted-foreground)] italic">
                    {t('settings.deepgramProject')} {dgUsage.project_name}
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="deepgram-key" className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">{t('settings.deepgramKeyLabel')}</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                <Input 
                  id="deepgram-key"
                  type={visibleFields.deepgram_api_key ? "text" : "password"}
                  value={formData.deepgram_api_key}
                  onChange={(e) => setFormData({...formData, deepgram_api_key: e.target.value})}
                  className="pl-10 pr-10 input-dark font-mono text-sm"
                  placeholder={t('settings.deepgramKeyPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility("deepgram_api_key")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-white transition-colors"
                >
                  {visibleFields.deepgram_api_key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deepgram-model" className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">{t('settings.deepgramModelLabel')}</Label>
              <Select 
                value={formData.deepgram_model} 
                onValueChange={(val) => setFormData({...formData, deepgram_model: val})}
              >
                <SelectTrigger id="deepgram-model" className="bg-rpg-onyx/50 border-border text-[var(--foreground)] font-mono text-sm">
                  <SelectValue placeholder={t('settings.deepgramModelPlaceholder')} />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1C23] border-border text-[var(--foreground)] shadow-xl z-[100]">
                  {fetchingDgVoices ? (
                    <SelectItem value="loading" disabled>{t('settings.loading')}</SelectItem>
                  ) : dgVoices.length > 0 ? (
                    dgVoices
                      .filter(v => v && v.voice_id)
                      .filter(v => {
                        const isPt = i18n.language === 'pt-BR';
                        const id = v.voice_id.toLowerCase();
                        if (isPt) return id.includes('-pt');
                        return id.includes('-en');
                      })
                      .map((v, idx) => (
                        <SelectItem key={`dg-voice-${v.voice_id}-${idx}`} value={v.voice_id}>
                          {v.name}
                        </SelectItem>
                      ))
                  ) : (
                    <SelectItem value="none" disabled>{t('settings.noneFound')}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notion Integration Settings */}
        <Card className="card-rpg mb-6 border-zinc-500/30">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-[var(--foreground)] font-serif flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-zinc-400" />
              {t('settings.notionTitle')}
            </CardTitle>
            <CardDescription className="text-[var(--muted-foreground)]">
              {t('settings.notionDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notion-key">{t('settings.notionKeyLabel')}</Label>
                <div className="relative">
                  <Input
                    id="notion-key"
                    type={visibleFields.notion_api_key ? "text" : "password"}
                    value={formData.notion_api_key}
                    onChange={(e) => setFormData({ ...formData, notion_api_key: e.target.value })}
                    placeholder={t('settings.notionKeyPlaceholder')}
                    className="input-dark font-mono text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility('notion_api_key')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-white transition-colors"
                  >
                    {visibleFields.notion_api_key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notion-page-id">{t('settings.notionPageIdLabel')}</Label>
                <Input
                  id="notion-page-id"
                  value={formData.notion_page_id}
                  onChange={(e) => setFormData({ ...formData, notion_page_id: e.target.value })}
                  placeholder={t('settings.notionPageIdPlaceholder')}
                  className="input-dark text-sm"
                />
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  {t('settings.notionHint')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Local Transcription Settings (Whisper) */}
        <Card className="card-rpg mb-6 border-amber-500/30">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-[var(--foreground)] font-serif flex items-center gap-2">
              <Cpu className="w-5 h-5 text-amber-400" />
              {t('settings.whisperTitle')}
            </CardTitle>
            <CardDescription className="text-[var(--muted-foreground)]">
              {t('settings.whisperDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Model Size */}
              <div className="space-y-2">
                <Label htmlFor="whisper-model" className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                  {t('settings.whisperModelLabel')}
                </Label>
                <Select
                  value={formData.whisper_model}
                  onValueChange={(val) => setFormData({ ...formData, whisper_model: val })}
                >
                  <SelectTrigger id="whisper-model" className="input-dark">
                    <SelectValue placeholder={t('settings.whisperModelPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1C23] border-border text-[var(--foreground)] shadow-xl z-[100]">
                    <SelectItem value="tiny">tiny (~75MB) - {t('settings.whisperModelTiny')}</SelectItem>
                    <SelectItem value="base">base (~145MB) - {t('settings.whisperModelBase')}</SelectItem>
                    <SelectItem value="small">small (~460MB) - {t('settings.whisperModelSmall')}</SelectItem>
                    <SelectItem value="medium">medium (~1.5GB) - {t('settings.whisperModelMedium')}</SelectItem>
                    <SelectItem value="large-v3-turbo">large-v3-turbo (~1.6GB) - {t('settings.whisperModelLargeTurbo')}</SelectItem>
                    <SelectItem value="large-v3">large-v3 (~3GB) - {t('settings.whisperModelLarge')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  {t('settings.whisperModelHint')}
                </p>
              </div>

              {/* Execution Device */}
              <div className="space-y-2">
                <Label htmlFor="whisper-device" className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                  {t('settings.whisperDeviceLabel')}
                </Label>
                <Select
                  value={formData.whisper_device}
                  onValueChange={(val) => setFormData({ ...formData, whisper_device: val })}
                >
                  <SelectTrigger id="whisper-device" className="input-dark">
                    <SelectValue placeholder={t('settings.whisperDevicePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1C23] border-border text-[var(--foreground)] shadow-xl z-[100]">
                    <SelectItem value="auto">auto - {t('settings.whisperDeviceAuto')}</SelectItem>
                    <SelectItem value="cpu">cpu - {t('settings.whisperDeviceCpu')}</SelectItem>
                    <SelectItem value="cuda">cuda - {t('settings.whisperDeviceCuda')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  {t('settings.whisperDeviceHint')}
                </p>
              </div>

              {/* Compute Type */}
              <div className="space-y-2">
                <Label htmlFor="whisper-compute-type" className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                  {t('settings.whisperComputeTypeLabel')}
                </Label>
                <Select
                  value={formData.whisper_compute_type}
                  onValueChange={(val) => setFormData({ ...formData, whisper_compute_type: val })}
                >
                  <SelectTrigger id="whisper-compute-type" className="input-dark">
                    <SelectValue placeholder={t('settings.whisperComputeTypePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1C23] border-border text-[var(--foreground)] shadow-xl z-[100]">
                    <SelectItem value="auto">auto - {t('settings.whisperComputeAuto')}</SelectItem>
                    <SelectItem value="int8">int8 - {t('settings.whisperComputeInt8')}</SelectItem>
                    <SelectItem value="int8_float16">int8_float16 - {t('settings.whisperComputeInt8Float16')}</SelectItem>
                    <SelectItem value="float16">float16 - {t('settings.whisperComputeFloat16')}</SelectItem>
                    <SelectItem value="float32">float32 - {t('settings.whisperComputeFloat32')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  {t('settings.whisperComputeHint')}
                </p>
              </div>

              {/* CPU Threads */}
              <div className="space-y-2">
                <Label htmlFor="whisper-cpu-threads" className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                  {t('settings.whisperCpuThreadsLabel')}
                </Label>
                <Input
                  id="whisper-cpu-threads"
                  type="number"
                  min="0"
                  max="32"
                  value={formData.whisper_cpu_threads}
                  onChange={(e) => setFormData({ ...formData, whisper_cpu_threads: parseInt(e.target.value) || 0 })}
                  className="input-dark text-sm"
                  placeholder="0 (auto)"
                />
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  {t('settings.whisperCpuThreadsHint')}
                </p>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card className="card-rpg mb-6 border-blue-500/30">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-[var(--foreground)] font-serif flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              {t('settings.appearance')}
            </CardTitle>
            <CardDescription className="text-[var(--muted-foreground)]">
              {t('settings.appearanceDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="visual-theme" className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                {t('settings.visualTheme')}
              </Label>
              <Select
                value={formData.visual_theme}
                onValueChange={(val) => setFormData({ ...formData, visual_theme: val })}
              >
                <SelectTrigger id="visual-theme" className="input-dark">
                  <SelectValue placeholder={t('settings.visualTheme')} />
                </SelectTrigger>
                <SelectContent className="bg-card border-primary/30 text-foreground">
                  <SelectItem value="dark_fantasy">{t('settings.themes.dark_fantasy')}</SelectItem>
                  <SelectItem value="cyberpunk">{t('settings.themes.cyberpunk')}</SelectItem>
                  <SelectItem value="science_fiction">{t('settings.themes.science_fiction')}</SelectItem>
                  <SelectItem value="wild_west">{t('settings.themes.wild_west')}</SelectItem>
                  <SelectItem value="high_fantasy">{t('settings.themes.high_fantasy')}</SelectItem>
                  <SelectItem value="horror">{t('settings.themes.horror')}</SelectItem>
                  <SelectItem value="cosmic_horror">{t('settings.themes.cosmic_horror')}</SelectItem>
                  <SelectItem value="post_apocalyptic">{t('settings.themes.post_apocalyptic')}</SelectItem>
                  <SelectItem value="steampunk">{t('settings.themes.steampunk')}</SelectItem>
                  <SelectItem value="superheroes">{t('settings.themes.superheroes')}</SelectItem>
                  <SelectItem value="weird_west">{t('settings.themes.weird_west')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language" className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                {t('settings.language')}
              </Label>
              <Select
                value={formData.language}
                onValueChange={(val) => {
                  setFormData({ ...formData, language: val });
                  i18n.changeLanguage(val);
                }}
              >
                <SelectTrigger id="language" className="input-dark">
                  <SelectValue placeholder={t('settings.language')} />
                </SelectTrigger>
                <SelectContent className="bg-card border-primary/30 text-foreground">
                  <SelectItem value="pt-BR">
                    <div className="flex items-center gap-2">
                      <img src="https://flagcdn.com/w40/br.png" alt="BR" className="w-4 h-3 rounded-sm object-cover" />
                      {t('header.languages.ptBR')}
                    </div>
                  </SelectItem>
                  <SelectItem value="en-US">
                    <div className="flex items-center gap-2">
                      <img src="https://flagcdn.com/w40/us.png" alt="US" className="w-4 h-3 rounded-sm object-cover" />
                      {t('header.languages.enUS')}
                    </div>
                  </SelectItem>
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
            {t('settings.save')}
          </Button>
        </div>
      </form>
    </div>
  </div>
);
};

export default Settings;

