import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Upload, 
  Wand2, 
  Edit3, 
  Check, 
  X, 
  Loader2,
  Clock,
  Copy,
  Hash,
  RefreshCcw
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const statusLabels = {
  recording: "Gravando",
  transcribing: "Transcrevendo",
  processing: "Processando",
  awaiting_review: "Aguardando Revisão",
  completed: "Concluída"
};

const SessionHeader = ({ 
  session, 
  saving, 
  processing, 
  uploading, 
  onUpdate, 
  onUpload, 
  onProcess, 
  onComplete,
  onReprocess
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(session.name);
  const [editedSystem, setEditedSystem] = useState(session.game_system);
  const [editedChunkDuration, setEditedChunkDuration] = useState(session.chunk_duration_minutes || 20);

  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    await onUpdate({ 
      name: editedName, 
      game_system: editedSystem,
      chunk_duration_minutes: editedChunkDuration
    });
    setIsEditing(false);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(session.id);
    setCopied(true);
    toast.success("ID da sessão copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div className="mb-8">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 text-[#A0A5B5] hover:text-[#EDEDED] transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar às Sessões
      </button>
      
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {isEditing ? (
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="input-dark text-3xl sm:text-4xl font-bold bg-transparent border-rpg-gold/50 h-auto py-1"
                placeholder="Nome da sessão"
              />
            ) : (
              <>
                <h1 className="text-3xl sm:text-4xl font-bold text-[#EDEDED] font-serif">
                  {session.name}
                </h1>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-[#6C7280] hover:text-rpg-gold transition-colors p-1"
                    title="Editar"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCopyId}
                    className={`transition-colors p-1 ${copied ? 'text-green-500' : 'text-[#6C7280] hover:text-rpg-gold'}`}
                    title="Copiar ID da sessão"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </>
            )}
            <Badge className={`status-${session.status}`}>
              {statusLabels[session.status]}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-[#A0A5B5]">
            {isEditing ? (
              <Select value={editedSystem} onValueChange={setEditedSystem}>
                <SelectTrigger className="input-dark w-48 bg-transparent border-rpg-gold/50">
                  <SelectValue placeholder="Sistema" />
                </SelectTrigger>
                <SelectContent className="bg-rpg-surface border-white/10">
                  {["D&D 5e", "Pathfinder 2e", "Call of Cthulhu", "Tormenta 20", "Vampiro: A Máscara", "Outro"].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline" className="border-white/10">
                {session.game_system}
              </Badge>
            )}

            {isEditing ? (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <Input
                  type="number"
                  min="5"
                  max="30"
                  value={editedChunkDuration}
                  onChange={(e) => setEditedChunkDuration(parseInt(e.target.value) || 20)}
                  className="input-dark w-16 bg-transparent border-rpg-gold/50 h-8 text-xs"
                />
                <span className="text-xs">min/bloco</span>
              </div>
            ) : (
              session.chunk_duration_minutes && (
                <span className="flex items-center gap-1.5 text-xs text-[#A0A5B5]">
                  <Clock className="w-3.5 h-3.5" />
                  {session.chunk_duration_minutes} min/bloco
                </span>
              )
            )}

            {session.duration_minutes && (
              <span className="flex items-center gap-1.5 text-sm">
                <Clock className="w-4 h-4" />
                {session.duration_minutes} min
              </span>
            )}

            {isEditing && (
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving} className="btn-gold">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="border-white/10">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".mp3,.wav,.webm,.mp4,.m4a" className="hidden" />
          
          <Button
            variant="outline"
            size="icon"
            onClick={onReprocess}
            disabled={uploading || processing}
            className="border-white/10 text-[#A0A5B5] hover:bg-rpg-surface-hover"
            title="Reprocessar áudios originais"
          >
            {processing && session.status === 'transcribing' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCcw className="w-4 h-4" />
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="border-white/10 text-[#A0A5B5] hover:bg-rpg-surface-hover"
          >
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Upload Áudio
          </Button>
          
          <Button
            onClick={onProcess}
            disabled={processing || !session.raw_transcription}
            className="btn-gold"
          >
            {processing && session.status === 'processing' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
            Processar com IA
          </Button>
          
          {session.status === "awaiting_review" && (
            <Button
              onClick={onComplete}
              variant="outline"
              className="border-green-500/30 text-green-400 hover:bg-green-500/10"
            >
              <Check className="w-4 h-4 mr-2" />
              Concluir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionHeader;
