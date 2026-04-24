import { useState } from "react";
import { Edit3, Save, X, Loader2, Mic, Volume2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

const ReviewScript = ({ 
  initialScript, 
  narrationUrl, 
  onSave, 
  onGenerateNarration, 
  saving, 
  processing 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [script, setScript] = useState(initialScript || "");
  const [selectedProvider, setSelectedProvider] = useState("elevenlabs");

  const handleSave = async () => {
    await onSave({ review_script: script });
    setIsEditing(false);
  };

  const handleGenerate = () => {
    onGenerateNarration({ provider: selectedProvider });
  };

  // Construct absolute URL if it's relative
  const fullNarrationUrl = narrationUrl 
    ? (narrationUrl.startsWith('http') ? narrationUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${narrationUrl}`)
    : null;

  return (
    <Card className="card-rpg">
      <CardHeader className="border-b border-white/10 flex flex-row items-center justify-between">
        <CardTitle className="text-[#EDEDED] font-serif flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-rpg-gold" />
          Roteiro de Revisão
        </CardTitle>
        <div className="flex items-center gap-3">
          {!isEditing ? (
            <>
              {initialScript && !narrationUrl && (
                <div className="flex items-center gap-2">
                  <select 
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="bg-rpg-surface border border-white/10 rounded px-2 py-1 text-[11px] text-[#A0A5B5] outline-none"
                  >
                    <option value="elevenlabs">ElevenLabs</option>
                    <option value="deepgram">Deepgram</option>
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerate}
                    disabled={processing}
                    className="border-rpg-gold/20 text-rpg-gold hover:bg-rpg-gold/10"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Mic className="w-4 h-4 mr-2" />
                    )}
                    Gerar Narração Épica
                  </Button>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="border-white/10 text-[#A0A5B5] hover:bg-rpg-surface-hover"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Editar
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
                className="border-white/10 text-[#A0A5B5]"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="btn-gold"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Narration Player */}
        {narrationUrl && !isEditing && (
          <div className="p-4 rounded-xl bg-rpg-gold/5 border border-rpg-gold/20 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rpg-gold/10 flex items-center justify-center text-rpg-gold flex-shrink-0">
              <Volume2 className="w-6 h-6" />
            </div>
            <div className="flex-1 w-full">
              <p className="text-xs text-rpg-gold font-medium mb-2 uppercase tracking-wider">Narração Épica Disponível</p>
              <audio 
                controls 
                className="w-full h-10 accent-rpg-gold"
                src={fullNarrationUrl}
              >
                Seu navegador não suporta o elemento de áudio.
              </audio>
            </div>
            <div className="flex items-center gap-2">
              <select 
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="bg-rpg-surface border border-white/10 rounded px-2 py-1 text-[11px] text-[#A0A5B5] outline-none"
              >
                <option value="elevenlabs">ElevenLabs</option>
                <option value="deepgram">Deepgram</option>
              </select>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerate}
                disabled={processing}
                className="text-[#A0A5B5] hover:text-rpg-gold"
              >
                Regerar
              </Button>
            </div>
          </div>
        )}

        {isEditing ? (
          <Textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            className="input-dark min-h-[400px] font-serif text-lg leading-relaxed"
            placeholder="Escreva ou edite o roteiro de revisão da sessão aqui..."
          />
        ) : (
          <div className="prose prose-invert max-w-none">
            {initialScript ? (
              <p className="text-[#EDEDED] leading-relaxed font-serif text-lg whitespace-pre-wrap">
                {initialScript}
              </p>
            ) : (
              <div className="text-center py-8">
                <Edit3 className="w-12 h-12 text-[#6C7280] mx-auto mb-4" />
                <p className="text-[#A0A5B5]">Nenhum roteiro de revisão ainda.</p>
                <p className="text-sm text-[#6C7280] mt-2">
                  Processe com IA ou escreva manualmente.
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
