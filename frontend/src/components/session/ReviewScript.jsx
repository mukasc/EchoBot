import { useState } from "react";
import { Edit3, Save, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

const ReviewScript = ({ initialScript, onSave, saving }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [script, setScript] = useState(initialScript || "");

  const handleSave = async () => {
    await onSave({ review_script: script });
    setIsEditing(false);
  };

  return (
    <Card className="card-rpg">
      <CardHeader className="border-b border-white/10 flex flex-row items-center justify-between">
        <CardTitle className="text-[#EDEDED] font-serif flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-rpg-gold" />
          Roteiro de Revisão
        </CardTitle>
        {!isEditing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="border-white/10 text-[#A0A5B5] hover:bg-rpg-surface-hover"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Editar
          </Button>
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
      </CardHeader>
      <CardContent className="p-6">
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
