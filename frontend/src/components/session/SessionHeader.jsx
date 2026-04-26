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
  RefreshCcw,
  Download,
  Share,
  FileText,
  FileCode,
  ExternalLink
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

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
  onReprocess,
  onExportMD,
  onExportPDF,
  onExportNotion
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(session.name);
  const [editedSystem, setEditedSystem] = useState(session.game_system);
  const [editedChunkDuration, setEditedChunkDuration] = useState(session.chunk_duration_minutes || 20);

  const [copied, setCopied] = useState(false);
  const [selectedDensity, setSelectedDensity] = useState(session.script_density || "standard");
  const [selectedPerspective, setSelectedPerspective] = useState(session.narrative_perspective || "3p_epic");

  const handleProcess = () => {
    onProcess({
      script_density: selectedDensity,
      narrative_perspective: selectedPerspective
    });
  };

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
    <div className="mb-8 space-y-6">
      {/* Navegação e Identidade */}
      <div className="space-y-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-[#A0A5B5] hover:text-[#EDEDED] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar às Sessões
        </button>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
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
              <Badge className={`status-${session.status} ml-2`}>
                {statusLabels[session.status]}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[#A0A5B5]">
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
                <Badge variant="outline" className="border-white/10 bg-white/5 text-xs font-normal">
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
                    <Clock className="w-3.5 h-3.5 text-rpg-gold/70" />
                    {session.chunk_duration_minutes} min / bloco
                  </span>
                )
              )}

              {session.duration_minutes && (
                <span className="flex items-center gap-1.5 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  {session.duration_minutes} min total
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
        </div>
      </div>
      
      {/* Barra de Operações (Toolbar) */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-3 sm:p-4 rounded-xl bg-rpg-surface/40 border border-white/5 backdrop-blur-sm shadow-rpg-glow">
        
        {/* Esquerda: Configuração do Processamento */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-[10px] uppercase tracking-wider text-[#6C7280] font-bold sm:mr-1">Configuração IA:</span>
          <div className="flex items-center gap-2">
            <Select value={selectedDensity} onValueChange={setSelectedDensity}>
              <SelectTrigger className="input-dark w-full sm:w-32 bg-transparent border-white/10 h-9 text-xs">
                <SelectValue placeholder="Densidade" />
              </SelectTrigger>
              <SelectContent className="bg-rpg-surface border-white/10">
                <SelectItem value="short">Curto</SelectItem>
                <SelectItem value="standard">Padrão</SelectItem>
                <SelectItem value="alternative">Alternativo</SelectItem>
                <SelectItem value="detailed">Detalhado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedPerspective} onValueChange={setSelectedPerspective}>
              <SelectTrigger className="input-dark w-full sm:w-40 bg-transparent border-white/10 h-9 text-xs">
                <SelectValue placeholder="Perspectiva" />
              </SelectTrigger>
              <SelectContent className="bg-rpg-surface border-white/10">
                <SelectItem value="1p">1ª Pessoa</SelectItem>
                <SelectItem value="2p">2ª Pessoa (Você)</SelectItem>
                <SelectItem value="3p_epic">3ª Pessoa Épica</SelectItem>
                <SelectItem value="tactical">Relatório Tático</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Direita: Ações Principais e Utilitários */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:justify-end">
          
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".mp3,.wav,.webm,.mp4,.m4a" className="hidden" />
          
          {/* Utilitários Técnicos (Agrupados e sutis) */}
          <div className="flex items-center gap-1.5 border-r border-white/10 pr-2 mr-1 sm:pr-3 sm:mr-1">
            <Button
              variant="outline"
              size="icon"
              onClick={onReprocess}
              disabled={uploading || processing}
              className="w-9 h-9 border-white/10 text-[#A0A5B5] hover:bg-rpg-surface-hover hover:text-rpg-gold transition-all"
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
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-9 border-white/10 text-[#A0A5B5] hover:bg-rpg-surface-hover transition-all"
            >
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              <span className="hidden sm:inline">Upload Áudio</span>
              <span className="sm:hidden">Upload</span>
            </Button>
          </div>
          
          {/* Ações de Fluxo */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={handleProcess}
              disabled={uploading || !session.raw_transcription}
              className="btn-gold flex-1 sm:flex-none shadow-rpg-gold/20"
            >
              {processing && session.status === 'processing' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
              {session.status === 'processing' ? 'Reprocessar' : 'Processar com IA'}
            </Button>
            
            {session.status === "awaiting_review" && (
              <Button
                onClick={onComplete}
                variant="outline"
                className="border-green-500/30 text-green-400 hover:bg-green-500/10 transition-all"
              >
                <Check className="w-4 h-4 mr-2" />
                Concluir
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-rpg-gold/30 text-rpg-gold hover:bg-rpg-gold/10 transition-all">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-rpg-surface border-white/10 text-[#EDEDED] w-48">
                <DropdownMenuLabel>Formatos</DropdownMenuLabel>
                <DropdownMenuItem onClick={onExportMD} className="cursor-pointer hover:bg-rpg-gold/10 hover:text-rpg-gold transition-colors">
                  <FileCode className="w-4 h-4 mr-2" />
                  Markdown (.md)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportPDF} className="cursor-pointer hover:bg-rpg-gold/10 hover:text-rpg-gold transition-colors">
                  <FileText className="w-4 h-4 mr-2" />
                  PDF Estilizado
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuLabel>Integrações</DropdownMenuLabel>
                <DropdownMenuItem onClick={onExportNotion} className="cursor-pointer hover:bg-rpg-gold/10 hover:text-rpg-gold transition-colors">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Notion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionHeader;
