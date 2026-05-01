import { useState, useEffect } from "react";
import { Edit3, Save, X, Loader2, Mic, Volume2, FileCode, FileText, ExternalLink, Zap, Info } from "lucide-react";
import api from "../../lib/api";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { useTranslation } from "react-i18next";

const ReviewScript = ({ 
  initialScript, 
  narrationUrl, 
  metadata,
  onSave, 
  onGenerateNarration,
  onRegenerateScript,
  onExportMD,
  onExportPDF,
  onExportNotion,
  saving, 
  processing 
}) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [script, setScript] = useState(initialScript || "");
  const [selectedProvider, setSelectedProvider] = useState("elevenlabs");
  const [availableProviders, setAvailableProviders] = useState(["elevenlabs", "deepgram", "kokoro"]);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [loadingVoices, setLoadingVoices] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await api.get("/settings/tts/providers/");
        if (response.data && Array.isArray(response.data)) {
          setAvailableProviders(response.data);
          
          if (!response.data.includes(selectedProvider)) {
            setSelectedProvider(response.data[0]);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar provedores de TTS:", error);
      }
    };

    fetchProviders();
  }, [selectedProvider]);

  useEffect(() => {
    const fetchVoices = async () => {
      if (!selectedProvider) return;
      setLoadingVoices(true);
      try {
        const response = await api.get(`/settings/tts/voices/${selectedProvider}/`);
        if (response.data && Array.isArray(response.data)) {
          setAvailableVoices(response.data);
          if (response.data.length > 0) {
            const defaultVoice = response.data.find(v => 
              v.voice_id === "af_heart" || v.voice_id === "aura-asteria-en" || v.name.includes("Dora")
            );
            setSelectedVoice(defaultVoice ? defaultVoice.voice_id : response.data[0].voice_id);
          } else {
            setSelectedVoice("");
          }
        }
      } catch (error) {
        console.error(`Erro ao carregar vozes para ${selectedProvider}:`, error);
        setAvailableVoices([]);
      } finally {
        setLoadingVoices(false);
      }
    };

    fetchVoices();
  }, [selectedProvider]);

  const handleSave = async () => {
    await onSave({ review_script: script });
    setIsEditing(false);
  };

  const handleGenerate = () => {
    onGenerateNarration({ 
      provider: selectedProvider,
      voiceId: selectedVoice 
    });
  };

  const fullNarrationUrl = narrationUrl 
    ? (narrationUrl.startsWith('http') ? narrationUrl : `${API_BASE_URL}${narrationUrl}`)
    : null;

  return (
    <Card className="card-rpg">
      <CardHeader className="border-b border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-[var(--foreground)] font-serif flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-primary" />
            {t('components.reviewScript.title')}
          </CardTitle>
          {metadata && (
            <div className="flex items-center gap-2 ml-7">
              <span className="text-[10px] text-[var(--muted-foreground)] uppercase">{t('components.reviewScript.processedBy')}</span>
              <Badge variant="outline" className="text-[10px] bg-white/5 border-border text-[var(--muted-foreground)] capitalize">
                {metadata.provider} • {metadata.model}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!isEditing && initialScript && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerateScript}
              disabled={processing}
              className="border-primary/30 text-primary hover:bg-primary/5 h-8 bg-primary/5 transition-all duration-300 hover:shadow-[0_0_15px_rgba(197,160,89,0.2)] hover:border-primary/50"
              title={t('components.reviewScript.regenerateDesc')}
            >
              {processing ? (
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              ) : (
                <Edit3 className="w-3.5 h-3.5 mr-2" />
              )}
              {t('components.reviewScript.regenerateScript')}
            </Button>
          )}
          
          {!isEditing ? (
            <>
              {initialScript && !narrationUrl && (
                <div className="flex flex-wrap items-center gap-2 bg-rpg-surface/50 p-1.5 rounded-lg border border-white/5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[var(--muted-foreground)] uppercase ml-1">{t('components.reviewScript.provider')}</span>
                    <select 
                      value={selectedProvider}
                      onChange={(e) => setSelectedProvider(e.target.value)}
                      className="bg-rpg-surface border border-border rounded px-2 py-1 text-[11px] text-[var(--foreground)] outline-none capitalize min-w-[100px]"
                    >
                      {availableProviders.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[var(--muted-foreground)] uppercase ml-1">{t('components.reviewScript.voice')}</span>
                    <select 
                      value={selectedVoice}
                      onChange={(e) => setSelectedVoice(e.target.value)}
                      disabled={loadingVoices || availableVoices.length === 0}
                      className="bg-rpg-surface border border-border rounded px-2 py-1 text-[11px] text-[var(--foreground)] outline-none min-w-[150px]"
                    >
                      {loadingVoices ? (
                        <option>{t('common.loading')}</option>
                      ) : availableVoices.length > 0 ? (
                        availableVoices.map(v => (
                          <option key={v.voice_id} value={v.voice_id}>{v.name}</option>
                        ))
                      ) : (
                        <option>{t('components.reviewScript.noVoices')}</option>
                      )}
                    </select>
                  </div>

                  {selectedProvider === 'kokoro' && (
                    <div className="w-full mt-1 mb-1 p-2 rounded-md bg-green-500/5 border border-green-500/10 flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                      <Zap className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[9px] text-green-500 font-bold uppercase tracking-wider">
                          {t('components.reviewScript.unlimited')} • {t('components.reviewScript.offline')}
                        </p>
                        <p className="text-[9px] text-green-500/70 leading-tight">
                          {t('components.reviewScript.localProviderDesc')}
                        </p>
                      </div>
                    </div>
                  )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerate}
                      disabled={processing || loadingVoices || !selectedVoice}
                      className={`h-9 px-6 transition-all duration-300 relative overflow-hidden group ${
                        selectedProvider === 'kokoro' 
                          ? 'border-green-500/40 text-green-400 hover:bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.15)] hover:shadow-[0_0_30px_rgba(34,197,94,0.25)]' 
                          : 'border-primary/20 text-primary hover:bg-primary/10'
                      }`}
                    >
                      {processing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Mic className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                      )}
                      <span className="flex flex-col items-start leading-none">
                        <span className="text-[11px] font-bold uppercase tracking-wider">{t('components.reviewScript.generate')}</span>
                        {selectedProvider === 'kokoro' && (
                          <span className="text-[8px] opacity-70 uppercase tracking-tighter font-medium">{t('components.reviewScript.costFree')}</span>
                        )}
                      </span>
                      {selectedProvider === 'kokoro' && !processing && (
                        <span className="absolute inset-0 bg-green-500/5 animate-pulse pointer-events-none" />
                      )}
                    </Button>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="border-border text-[var(--muted-foreground)] hover:bg-rpg-surface-hover"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {t('common.edit')}
              </Button>
            </>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setScript(initialScript || "");
                  setIsEditing(false);
                }}
                className="border-border text-[var(--muted-foreground)]"
              >
                <X className="w-4 h-4 mr-2" />
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="btn-gold"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {t('common.save')}
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2 border-l border-border pl-3 ml-1">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onExportMD}
              className="h-8 border-border text-[var(--muted-foreground)] hover:text-primary hover:border-primary/50"
              title={t('components.technicalDiary.exportMD')}
            >
              <FileCode className="w-3.5 h-3.5" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onExportPDF}
              className="h-8 border-border text-[var(--muted-foreground)] hover:text-primary hover:border-primary/50"
              title={t('components.technicalDiary.exportPDF')}
            >
              <FileText className="w-3.5 h-3.5" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onExportNotion}
              className="h-8 border-border text-[var(--muted-foreground)] hover:text-primary hover:border-primary/50"
              title={t('components.technicalDiary.syncNotion')}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Narration Player */}
        {narrationUrl && !isEditing && (
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <Volume2 className="w-6 h-6" />
              </div>
              <div className="flex-1 w-full">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-primary font-medium uppercase tracking-wider">{t('components.reviewScript.epicNarration')}</p>
                  <span className="text-[10px] text-[var(--muted-foreground)] italic hidden sm:inline">
                    {t('components.reviewScript.epicNarrationDesc')}
                  </span>
                </div>
                <audio 
                  controls 
                  className="w-full h-10 accent-primary"
                  src={fullNarrationUrl}
                >
                  {t('components.reviewScript.audioError')}
                </audio>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-white/5">
              <span className="text-[10px] text-[var(--muted-foreground)] uppercase">{t('components.reviewScript.tryOther')}</span>
              <select 
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="bg-rpg-surface border border-border rounded px-2 py-1 text-[11px] text-[var(--muted-foreground)] outline-none capitalize"
              >
                {availableProviders.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <select 
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                disabled={loadingVoices || availableVoices.length === 0}
                className="bg-rpg-surface border border-border rounded px-2 py-1 text-[11px] text-[var(--muted-foreground)] outline-none min-w-[120px]"
              >
                {availableVoices.map(v => (
                  <option key={v.voice_id} value={v.voice_id}>{v.name}</option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={processing || loadingVoices}
                className={`h-8 px-3 transition-all duration-300 ${
                  selectedProvider === 'kokoro' 
                    ? 'border-green-500/30 text-green-400 hover:bg-green-500/10' 
                    : 'text-[var(--muted-foreground)] hover:text-primary hover:border-primary/30'
                }`}
              >
                {processing ? (
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                ) : (
                  <Mic className="w-3.5 h-3.5 mr-2" />
                )}
                <span className="flex flex-col items-start leading-none text-left">
                  <span className="text-[10px] font-bold">{t('components.reviewScript.regenerate')}</span>
                  {selectedProvider === 'kokoro' && (
                    <span className="text-[7px] opacity-70 uppercase tracking-tighter">{t('components.reviewScript.offline')}</span>
                  )}
                </span>
              </Button>
            </div>
          </div>
        )}

        {isEditing ? (
          <Textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            className="input-dark min-h-[400px] font-serif text-lg leading-relaxed"
            placeholder={t('components.reviewScript.placeholder')}
          />
        ) : (
          <div className="prose prose-invert max-w-none">
            {initialScript ? (
              <p className="text-[var(--foreground)] leading-relaxed font-serif text-lg whitespace-pre-wrap">
                {initialScript}
              </p>
            ) : (
              <div className="text-center py-8">
                <Edit3 className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
                <p className="text-[var(--muted-foreground)]">{t('components.reviewScript.empty')}</p>
                <p className="text-sm text-[var(--muted-foreground)] mt-2">
                  {t('components.reviewScript.emptyDesc')}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReviewScript;

