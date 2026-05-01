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
  RefreshCcw,
  Download,
  FileText,
  FileCode,
  ExternalLink
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
    toast.success(t('common.idCopied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div className="mb-8 space-y-6">
      {/* Navigation and Identity */}
      <div className="space-y-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('components.sessionHeader.backToSessions')}
        </button>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {isEditing ? (
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="input-dark text-3xl sm:text-4xl font-bold bg-transparent border-primary/50 h-auto py-1"
                  placeholder={t('components.sessionHeader.sessionNamePlaceholder')}
                />
              ) : (
                <>
                  <h1 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] font-serif">
                    {session.name}
                  </h1>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-[var(--muted-foreground)] hover:text-primary transition-colors p-1"
                      title={t('components.sessionHeader.edit')}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCopyId}
                      className={`transition-colors p-1 ${copied ? 'text-green-500' : 'text-[var(--muted-foreground)] hover:text-primary'}`}
                      title={t('components.sessionHeader.copyId')}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </>
              )}
              <Badge className={`status-${session.status} ml-2`}>
                {t(`session.status.${session.status}`, { defaultValue: session.status })}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[var(--muted-foreground)]">
              {isEditing ? (
                <Select value={editedSystem} onValueChange={setEditedSystem}>
                  <SelectTrigger className="input-dark w-48 bg-transparent border-primary/50">
                    <SelectValue placeholder={t('components.sessionHeader.system')} />
                  </SelectTrigger>
                  <SelectContent className="bg-rpg-surface border-border">
                    {["dnd5e", "pf2e", "cthulhu", "t20", "vtm", "other"].map(s => (
                      <SelectItem key={s} value={t(`common.systems.${s}`)}>{t(`common.systems.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className="border-border bg-white/5 text-xs font-normal">
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
                    className="input-dark w-16 bg-transparent border-primary/50 h-8 text-xs"
                  />
                  <span className="text-xs">{t('components.sessionHeader.minPerBlock')}</span>
                </div>
              ) : (
                session.chunk_duration_minutes && (
                  <span className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                    <Clock className="w-3.5 h-3.5 text-primary/70" />
                    {session.chunk_duration_minutes} {t('components.sessionHeader.minPerBlock')}
                  </span>
                )
              )}

              {session.duration_minutes && (
                <span className="flex items-center gap-1.5 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  {session.duration_minutes} {t('components.sessionHeader.totalDuration')}
                </span>
              )}

              {isEditing && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={saving} className="btn-gold">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="border-border">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Operations Bar (Toolbar) */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-3 sm:p-4 rounded-xl bg-rpg-surface/40 border border-white/5 backdrop-blur-sm shadow-rpg-glow">
        
        {/* Left: AI Processing Config */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-bold sm:mr-1">{t('components.sessionHeader.aiConfig')}</span>
          <div className="flex items-center gap-2">
            <Select value={selectedDensity} onValueChange={setSelectedDensity}>
              <SelectTrigger className="input-dark w-full sm:w-32 bg-transparent border-border h-9 text-xs">
                <SelectValue placeholder={t('components.sessionHeader.density')} />
              </SelectTrigger>
              <SelectContent className="bg-rpg-surface border-border">
                {['short', 'standard', 'alternative', 'detailed'].map(d => (
                  <SelectItem key={d} value={d}>{t(`components.sessionHeader.densities.${d}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPerspective} onValueChange={setSelectedPerspective}>
              <SelectTrigger className="input-dark w-full sm:w-40 bg-transparent border-border h-9 text-xs">
                <SelectValue placeholder={t('components.sessionHeader.perspective')} />
              </SelectTrigger>
              <SelectContent className="bg-rpg-surface border-border">
                {['1p', '2p', '3p_epic', 'tactical'].map(p => (
                  <SelectItem key={p} value={p}>{t(`components.sessionHeader.perspectives.${p}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right: Main Actions and Utilities */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:justify-end">
          
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".mp3,.wav,.webm,.mp4,.m4a" className="hidden" />
          
          {/* Technical Utilities (Grouped and subtle) */}
          <div className="flex items-center gap-1.5 border-r border-border pr-2 mr-1 sm:pr-3 sm:mr-1">
            <Button
              variant="outline"
              size="icon"
              onClick={onReprocess}
              disabled={uploading || processing}
              className="w-9 h-9 border-border text-[var(--muted-foreground)] hover:bg-rpg-surface-hover hover:text-primary transition-all"
              title={t('components.sessionHeader.reprocessOriginal')}
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
              className="h-9 border-border text-[var(--muted-foreground)] hover:bg-rpg-surface-hover transition-all"
            >
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              <span className="hidden sm:inline">{t('components.sessionHeader.uploadAudio')}</span>
              <span className="sm:hidden">{t('components.sessionHeader.upload')}</span>
            </Button>
          </div>
          
          {/* Flow Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={handleProcess}
              disabled={uploading || !session.raw_transcription}
              className="btn-gold flex-1 sm:flex-none shadow-primary/20"
            >
              {processing && session.status === 'processing' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
              {session.status === 'processing' ? t('components.sessionHeader.reprocess') : t('components.sessionHeader.processWithAI')}
            </Button>
            
            {session.status === "awaiting_review" && (
              <Button
                onClick={onComplete}
                variant="outline"
                className="border-green-500/30 text-green-400 hover:bg-green-500/10 transition-all"
              >
                <Check className="w-4 h-4 mr-2" />
                {t('components.sessionHeader.complete')}
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 transition-all">
                  <Download className="w-4 h-4 mr-2" />
                  {t('components.sessionHeader.export')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-rpg-surface border-border text-[var(--foreground)] w-48">
                <DropdownMenuLabel>{t('components.sessionHeader.formats')}</DropdownMenuLabel>
                <DropdownMenuItem onClick={onExportMD} className="cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors">
                  <FileCode className="w-4 h-4 mr-2" />
                  Markdown (.md)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportPDF} className="cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors">
                  <FileText className="w-4 h-4 mr-2" />
                  {t('components.sessionHeader.pdfStylized')}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuLabel>{t('components.sessionHeader.integrations')}</DropdownMenuLabel>
                <DropdownMenuItem onClick={onExportNotion} className="cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors">
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

