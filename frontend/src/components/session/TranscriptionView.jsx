import { useState } from "react";
import { MessageSquare, Edit3, Check, X, FileAudio, Upload, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { Textarea } from "../ui/textarea";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const TranscriptionView = ({ 
  segments, 
  getSpeakerInfo, 
  onUpdateSegment, 
  onDeleteSegment, 
  onBulkDeleteSegments, 
  onUploadClick 
}) => {
  const { t, i18n } = useTranslation();
  const [editingId, setEditingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const sortedSegments = [...(segments || [])].sort((a, b) => 
    (a.timestamp_start || 0) - (b.timestamp_start || 0)
  );

  const formatTimestamp = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatAbsoluteTimestamp = (isoString) => {
    if (!isoString) return null;
    try {
      return new Date(isoString).toLocaleTimeString(i18n.language, { 
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    } catch { return null; }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === sortedSegments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedSegments.map(s => s.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(t('components.transcriptionView.confirmBulkDelete', `Tem certeza que deseja excluir ${selectedIds.size} segmentos selecionados?`))) {
      await onBulkDeleteSegments(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleDeleteSingle = async (segmentId) => {
    if (window.confirm(t('components.transcriptionView.confirmSingleDelete', "Tem certeza que deseja excluir este segmento?"))) {
      await onDeleteSegment(segmentId);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(segmentId);
        return next;
      });
    }
  };

  return (
    <Card className="card-rpg relative">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-[var(--foreground)] font-serif flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          {t('components.transcriptionView.title')}
        </CardTitle>
      </CardHeader>
      
      {sortedSegments.length > 0 && (
        <div className="px-6 py-3 bg-rpg-surface border-b border-border/40 flex items-center gap-3">
          <input 
            type="checkbox" 
            checked={selectedIds.size === sortedSegments.length && sortedSegments.length > 0} 
            onChange={handleSelectAll} 
            className="w-4 h-4 rounded border-border bg-rpg-void text-primary focus:ring-primary/40 focus:ring-offset-rpg-void cursor-pointer"
          />
          <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
            {selectedIds.size === sortedSegments.length ? t('components.transcriptionView.deselectAll', 'Desmarcar todos') : t('components.transcriptionView.selectAll', 'Selecionar todos')} ({sortedSegments.length})
          </span>
        </div>
      )}

      <CardContent className="p-0 relative">
        {segments?.length > 0 ? (
          <ScrollArea className="h-[500px]">
            <div className="p-6 space-y-4">
              {sortedSegments.map((segment, index) => (
                <div key={segment.id} className={`flex items-start gap-3.5 group/row animate-in-slide-up delay-${(index % 5) * 100}`}>
                  <div className="pt-1.5 flex-shrink-0">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(segment.id)} 
                      onChange={() => toggleSelect(segment.id)} 
                      className="w-4 h-4 rounded border-border bg-rpg-void text-primary focus:ring-primary/40 focus:ring-offset-rpg-void cursor-pointer"
                    />
                  </div>
                  <div className="flex-grow min-w-0">
                    <SegmentItem 
                      segment={segment}
                      isEditing={editingId === segment.id}
                      setEditing={setEditingId}
                      getSpeakerInfo={getSpeakerInfo}
                      onUpdate={onUpdateSegment}
                      onDelete={() => handleDeleteSingle(segment.id)}
                      formatTimestamp={formatTimestamp}
                      formatAbsoluteTimestamp={formatAbsoluteTimestamp}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="p-12 text-center">
            <FileAudio className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
            <p className="text-[var(--muted-foreground)] mb-4">{t('components.transcriptionView.empty')}</p>
            <Button
              variant="outline"
              onClick={onUploadClick}
              className="border-primary/30 text-primary hover:bg-primary/10"
            >
              <Upload className="w-4 h-4 mr-2" />
              {t('components.transcriptionView.uploadAudio')}
            </Button>
          </div>
        )}

        {/* Bulk Action Floating Bar */}
        {selectedIds.size > 0 && (
          <div className="absolute bottom-6 left-0 right-0 mx-auto max-w-sm bg-rpg-surface/95 backdrop-blur border border-primary/30 rounded-xl p-4 shadow-xl z-20 flex items-center justify-between animate-in-fade slide-in-bottom-4">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[var(--foreground)] font-serif">
                {selectedIds.size} {selectedIds.size === 1 ? t('components.transcriptionView.selectedSingle', 'selecionado') : t('components.transcriptionView.selectedPlural', 'selecionados')}
              </span>
              <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider font-semibold">
                {t('components.transcriptionView.bulkActions', 'Ações em massa')}
              </span>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setSelectedIds(new Set())}
                className="border-border text-[var(--muted-foreground)] hover:bg-white/5 text-xs h-8"
              >
                {t('common.cancel', 'Cancelar')}
              </Button>
              <Button 
                size="sm" 
                onClick={handleBulkDelete}
                className="bg-red-600 hover:bg-red-500 text-white border-none flex items-center gap-1.5 text-xs h-8"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t('common.delete', 'Excluir')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const SegmentItem = ({ 
  segment, isEditing, setEditing, getSpeakerInfo, onUpdate, onDelete, formatTimestamp, formatAbsoluteTimestamp 
}) => {
  const { t } = useTranslation();
  const [text, setText] = useState(segment.text);
  const [type, setType] = useState(segment.message_type);
  const speaker = getSpeakerInfo(segment.speaker_discord_id);
  const characterName = segment.speaker_character_name || speaker.characterName;

  const handleSave = async () => {
    await onUpdate(segment.id, { text, message_type: type });
    setEditing(null);
  };

  return (
    <div className={`pl-4 border-l-2 transition-all duration-300 ${
      segment.message_type === 'ic' ? 'border-rpg-ic' :
      segment.message_type === 'ooc' ? 'border-rpg-ooc opacity-70' :
      'border-rpg-info italic'
    }`}>
      <div className="flex items-center gap-3 mb-2">
        <Badge className={`badge-${segment.message_type}`}>
          {t(`session.segmentType.${segment.message_type}`, { defaultValue: segment.message_type })}
        </Badge>
        
        <span className="text-sm font-semibold text-primary truncate max-w-[200px] sm:max-w-xs" title={characterName || speaker.discordName}>
          {characterName || speaker.discordName || t('components.transcriptionView.unknownSpeaker')}
          {characterName && speaker.discordName && <span className="text-[var(--muted-foreground)] font-normal"> | {speaker.discordName}</span>}
        </span>

        {segment.timestamp_start >= 0 && (
          <span className="text-xs text-[var(--muted-foreground)] flex-shrink-0">
            {formatTimestamp(segment.timestamp_start)}
            {segment.timestamp_absolute_start && (
              <span className="ml-1 text-primary hidden sm:inline">
                ({formatAbsoluteTimestamp(segment.timestamp_absolute_start)})
              </span>
            )}
          </span>
        )}
        
        <div className="ml-auto flex items-center gap-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <button
            onClick={() => setEditing(isEditing ? null : segment.id)}
            className="p-1 rounded hover:bg-white/5 text-[var(--muted-foreground)] hover:text-primary transition-colors"
            title={t('common.edit')}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-white/5 text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
            title={t('common.delete', 'Excluir')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {isEditing ? (
        <div className="space-y-3 animate-in-fade">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="input-dark min-h-[100px] leading-relaxed"
          />
          <div className="flex gap-2">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="input-dark w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-rpg-surface border-border text-[var(--foreground)]">
                <SelectItem value="ic">{t('session.segmentType.ic')}</SelectItem>
                <SelectItem value="ooc">{t('session.segmentType.ooc')}</SelectItem>
                <SelectItem value="narration">{t('session.segmentType.narration')}</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleSave} className="btn-gold" aria-label={t('common.save')}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(null)} className="border-border" aria-label={t('common.cancel')}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <p className={`text-base leading-relaxed tracking-wide break-words ${segment.message_type === 'ooc' ? 'text-[var(--muted-foreground)]' : 'text-[var(--foreground)]'}`}>
          {segment.text}
        </p>
      )}
      
      {segment.uncertain_terms?.length > 0 && (
        <div className="mt-2 flex gap-2 flex-wrap">
          {segment.uncertain_terms.map((term, i) => (
            <Badge key={i} variant="outline" className="text-yellow-500 border-yellow-500/30">
              [{t('components.transcriptionView.uncertain')}: {term}]
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default TranscriptionView;
