import { useState } from "react";
import { MessageSquare, Edit3, Check, X, FileAudio, Upload } from "lucide-react";
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

const TranscriptionView = ({ segments, getSpeakerInfo, onUpdateSegment, onUploadClick }) => {
  const { t, i18n } = useTranslation();
  const [editingId, setEditingId] = useState(null);

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

  return (
    <Card className="card-rpg">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-[var(--foreground)] font-serif flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          {t('components.transcriptionView.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {segments?.length > 0 ? (
          <ScrollArea className="h-[500px]">
            <div className="p-6 space-y-4">
              {sortedSegments.map((segment, index) => (
                <div key={segment.id} className={`animate-in-slide-up delay-${(index % 5) * 100}`}>
                  <SegmentItem 
                    segment={segment}
                    isEditing={editingId === segment.id}
                    setEditing={setEditingId}
                    getSpeakerInfo={getSpeakerInfo}
                    onUpdate={onUpdateSegment}
                    formatTimestamp={formatTimestamp}
                    formatAbsoluteTimestamp={formatAbsoluteTimestamp}
                  />
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
      </CardContent>
    </Card>
  );
};

const SegmentItem = ({ 
  segment, isEditing, setEditing, getSpeakerInfo, onUpdate, formatTimestamp, formatAbsoluteTimestamp 
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
        
        <span className="text-sm font-semibold text-primary">
          {characterName || speaker.discordName || t('components.transcriptionView.unknownSpeaker')}
          {characterName && speaker.discordName && <span className="text-[var(--muted-foreground)] font-normal"> | {speaker.discordName}</span>}
        </span>

        {segment.timestamp_start >= 0 && (
          <span className="text-xs text-[var(--muted-foreground)]">
            {formatTimestamp(segment.timestamp_start)}
            {segment.timestamp_absolute_start && (
              <span className="ml-1 text-primary">
                ({formatAbsoluteTimestamp(segment.timestamp_absolute_start)})
              </span>
            )}
          </span>
        )}
        
        <button
          onClick={() => setEditing(isEditing ? null : segment.id)}
          className="ml-auto text-[var(--muted-foreground)] hover:text-primary transition-colors"
          title={t('common.edit')}
        >
          <Edit3 className="w-4 h-4" />
        </button>
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
              <SelectContent className="bg-rpg-surface border-border">
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
        <p className={`text-base leading-relaxed tracking-wide ${segment.message_type === 'ooc' ? 'text-[var(--muted-foreground)]' : 'text-[var(--foreground)]'}`}>
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

