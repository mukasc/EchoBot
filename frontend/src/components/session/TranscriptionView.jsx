import { useState } from "react";
import { MessageSquare, Edit3, Check, X, FileAudio, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const typeLabels = {
  ic: "In-Character",
  ooc: "Out-of-Character",
  narration: "Narração"
};

const TranscriptionView = ({ segments, getSpeakerInfo, onUpdateSegment, onUploadClick }) => {
  const [editingId, setEditingId] = useState(null);

  const formatTimestamp = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatAbsoluteTimestamp = (isoString) => {
    if (!isoString) return null;
    try {
      return new Date(isoString).toLocaleTimeString('pt-BR', { 
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    } catch { return null; }
  };

  return (
    <Card className="card-rpg">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-[#EDEDED] font-serif flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-rpg-gold" />
          Transcrição da Sessão
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {segments?.length > 0 ? (
          <ScrollArea className="h-[500px]">
            <div className="p-6 space-y-4">
              {segments.map((segment) => (
                <SegmentItem 
                  key={segment.id} 
                  segment={segment}
                  isEditing={editingId === segment.id}
                  setEditing={setEditingId}
                  getSpeakerInfo={getSpeakerInfo}
                  onUpdate={onUpdateSegment}
                  formatTimestamp={formatTimestamp}
                  formatAbsoluteTimestamp={formatAbsoluteTimestamp}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="p-12 text-center">
            <FileAudio className="w-12 h-12 text-[#6C7280] mx-auto mb-4" />
            <p className="text-[#A0A5B5] mb-4">Nenhuma transcrição disponível ainda</p>
            <Button
              variant="outline"
              onClick={onUploadClick}
              className="border-rpg-gold/30 text-rpg-gold hover:bg-rpg-gold/10"
            >
              <Upload className="w-4 h-4 mr-2" />
              Fazer Upload de Áudio
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
  const [text, setText] = useState(segment.text);
  const [type, setType] = useState(segment.message_type);
  const speaker = getSpeakerInfo(segment.speaker_discord_id);
  const characterName = segment.speaker_character_name || speaker.characterName;

  const handleSave = async () => {
    await onUpdate(segment.id, { text, message_type: type });
    setEditing(null);
  };

  return (
    <div className={`pl-4 border-l-2 transition-opacity ${
      segment.message_type === 'ic' ? 'border-rpg-ic' :
      segment.message_type === 'ooc' ? 'border-rpg-ooc opacity-70' :
      'border-rpg-info italic'
    }`}>
      <div className="flex items-center gap-3 mb-2">
        <Badge className={`badge-${segment.message_type}`}>
          {typeLabels[segment.message_type]}
        </Badge>
        
        <span className="text-sm font-semibold text-rpg-gold">
          {characterName || speaker.discordName || "Desconhecido"}
          {characterName && speaker.discordName && <span className="text-[#6C7280] font-normal"> | {speaker.discordName}</span>}
        </span>

        {segment.timestamp_start > 0 && (
          <span className="text-xs text-[#6C7280]">
            {formatTimestamp(segment.timestamp_start)}
            {segment.timestamp_absolute_start && (
              <span className="ml-1 text-rpg-gold">
                ({formatAbsoluteTimestamp(segment.timestamp_absolute_start)})
              </span>
            )}
          </span>
        )}
        
        <button
          onClick={() => setEditing(isEditing ? null : segment.id)}
          className="ml-auto text-[#6C7280] hover:text-rpg-gold transition-colors"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      </div>
      
      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="input-dark"
          />
          <div className="flex gap-2">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="input-dark w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-rpg-surface border-white/10">
                <SelectItem value="ic">In-Character</SelectItem>
                <SelectItem value="ooc">Out-of-Character</SelectItem>
                <SelectItem value="narration">Narração</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleSave} className="btn-gold">
              <Check className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(null)} className="border-white/10">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <p className={`text-${segment.message_type === 'ooc' ? '[#6C7280]' : '[#EDEDED]'}`}>
          {segment.text}
        </p>
      )}
      
      {segment.uncertain_terms?.length > 0 && (
        <div className="mt-2 flex gap-2 flex-wrap">
          {segment.uncertain_terms.map((term, i) => (
            <Badge key={i} variant="outline" className="text-yellow-500 border-yellow-500/30">
              [Incerto: {term}]
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default TranscriptionView;
