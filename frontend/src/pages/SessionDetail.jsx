import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Upload, 
  Wand2, 
  Save, 
  Clock,
  User,
  MapPin,
  Package,
  Star,
  Zap,
  MessageSquare,
  Edit3,
  Check,
  X,
  Loader2,
  FileAudio
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusLabels = {
  recording: "Gravando",
  transcribing: "Transcrevendo",
  processing: "Processando",
  awaiting_review: "Aguardando Revisão",
  completed: "Concluída"
};

const typeLabels = {
  ic: "In-Character",
  ooc: "Out-of-Character",
  narration: "Narração"
};

const categoryIcons = {
  npc: User,
  location: MapPin,
  item: Package,
  xp: Star,
  event: Zap
};

const categoryLabels = {
  npc: "NPC",
  location: "Local",
  item: "Item",
  xp: "XP",
  event: "Evento"
};

const SessionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingScript, setEditingScript] = useState(false);
  const [editedScript, setEditedScript] = useState("");
  const [editingSegment, setEditingSegment] = useState(null);
  const [editingSessionInfo, setEditingSessionInfo] = useState(false);
  const [editedSessionName, setEditedSessionName] = useState("");
  const [editedGameSystem, setEditedGameSystem] = useState("");
  const [characterMappings, setCharacterMappings] = useState([]);

  useEffect(() => {
    fetchSession();
    fetchCharacterMappings();
  }, [id]);

  const fetchCharacterMappings = async () => {
    try {
      const response = await axios.get(`${API}/character-mappings`);
      setCharacterMappings(response.data);
    } catch (error) {
      console.error("Error fetching character mappings:", error);
    }
  };

  const getSpeakerName = (speakerId) => {
    if (!speakerId) return { characterName: null, discordName: null };
    
    // Check if there's a character mapping for this Discord user
    const mapping = characterMappings.find(m => m.discord_user_id === speakerId);
    if (mapping) {
      return { 
        characterName: mapping.character_name, 
        discordName: mapping.discord_username 
      };
    }
    
    // If no mapping, return the ID
    return { 
      characterName: null, 
      discordName: `Usuário ${speakerId.substring(0, 8)}` 
    };
  };

  const fetchSession = async () => {
    try {
      const response = await axios.get(`${API}/sessions/${id}`);
      setSession(response.data);
      setEditedScript(response.data.review_script || "");
    } catch (error) {
      console.error("Error fetching session:", error);
      toast.error("Sessão não encontrada");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      await axios.post(`${API}/sessions/${id}/upload-audio`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Áudio enviado e transcrito com sucesso!");
      await fetchSession();
    } catch (error) {
      console.error("Error uploading audio:", error);
      toast.error(error.response?.data?.detail || "Erro ao processar áudio");
    } finally {
      setUploading(false);
    }
  };

  const processWithAI = async () => {
    setProcessing(true);
    try {
      await axios.post(`${API}/sessions/${id}/process`);
      toast.success("Sessão processada com IA!");
      await fetchSession();
    } catch (error) {
      console.error("Error processing session:", error);
      toast.error(error.response?.data?.detail || "Erro ao processar com IA");
    } finally {
      setProcessing(false);
    }
  };

  const saveReviewScript = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/sessions/${id}`, {
        review_script: editedScript
      });
      setSession({ ...session, review_script: editedScript });
      setEditingScript(false);
      toast.success("Roteiro salvo!");
    } catch (error) {
      console.error("Error saving script:", error);
      toast.error("Erro ao salvar roteiro");
    } finally {
      setSaving(false);
    }
  };

  const updateSegment = async (segmentId, updates) => {
    try {
      await axios.put(`${API}/sessions/${id}/segments/${segmentId}`, updates);
      await fetchSession();
      setEditingSegment(null);
      toast.success("Segmento atualizado!");
    } catch (error) {
      console.error("Error updating segment:", error);
      toast.error("Erro ao atualizar segmento");
    }
  };

  const saveSessionInfo = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/sessions/${id}`, {
        name: editedSessionName,
        game_system: editedGameSystem
      });
      setSession({ ...session, name: editedSessionName, game_system: editedGameSystem });
      setEditingSessionInfo(false);
      toast.success("Informações salvas!");
    } catch (error) {
      console.error("Error saving session info:", error);
      toast.error("Erro ao salvar informações");
    } finally {
      setSaving(false);
    }
  };

  const startEditingSessionInfo = () => {
    setEditedSessionName(session.name);
    setEditedGameSystem(session.game_system);
    setEditingSessionInfo(true);
  };

  const markAsCompleted = async () => {
    try {
      await axios.put(`${API}/sessions/${id}`, { status: "completed" });
      await fetchSession();
      toast.success("Sessão marcada como concluída!");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const formatTimestamp = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatAbsoluteTimestamp = (isoString) => {
    if (!isoString) return null;
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[#0B0C10]" data-testid="session-detail">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-[#A0A5B5] hover:text-[#EDEDED] transition-colors mb-4"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar às Sessões
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {editingSessionInfo ? (
                  <Input
                    value={editedSessionName}
                    onChange={(e) => setEditedSessionName(e.target.value)}
                    className="input-dark text-3xl sm:text-4xl font-bold bg-transparent border-[#D4AF37]/50"
                    placeholder="Nome da sessão"
                  />
                ) : (
                  <>
                    <h1 className="text-3xl sm:text-4xl font-bold text-[#EDEDED] font-['Playfair_Display']">
                      {session.name}
                    </h1>
                    <button
                      onClick={startEditingSessionInfo}
                      className="text-[#6C7280] hover:text-[#D4AF37] transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <Badge className={`status-${session.status}`}>
                  {statusLabels[session.status]}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-[#A0A5B5]">
                {editingSessionInfo ? (
                  <Select
                    value={editedGameSystem}
                    onValueChange={setEditedGameSystem}
                  >
                    <SelectTrigger className="input-dark w-40 bg-transparent border-[#D4AF37]/50">
                      <SelectValue placeholder="Sistema de jogo" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#13141A] border-white/10">
                      <SelectItem value="D&D 5e">D&D 5e</SelectItem>
                      <SelectItem value="Pathfinder 2e">Pathfinder 2e</SelectItem>
                      <SelectItem value="Call of Cthulhu">Call of Cthulhu</SelectItem>
                      <SelectItem value="Tormenta 20">Tormenta 20</SelectItem>
                      <SelectItem value="Vampiro: A Máscara">Vampiro: A Máscara</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className="border-white/10">
                    {session.game_system}
                  </Badge>
                )}
                {session.duration_minutes && (
                  <span className="flex items-center gap-1.5 text-sm">
                    <Clock className="w-4 h-4" />
                    {session.duration_minutes} min
                  </span>
                )}
                {editingSessionInfo && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={saveSessionInfo}
                      disabled={saving}
                      className="btn-gold"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingSessionInfo(false)}
                      className="border-white/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".mp3,.wav,.webm,.mp4,.m4a"
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="border-white/10 text-[#A0A5B5] hover:bg-[#1A1B23]"
                data-testid="upload-audio-btn"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Upload Áudio
              </Button>
              
              <Button
                onClick={processWithAI}
                disabled={processing || !session.raw_transcription}
                className="btn-gold"
                data-testid="process-ai-btn"
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                Processar com IA
              </Button>
              
              {session.status === "awaiting_review" && (
                <Button
                  onClick={markAsCompleted}
                  variant="outline"
                  className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                  data-testid="complete-btn"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Concluir
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="transcription" className="space-y-6">
          <TabsList className="bg-[#13141A] border border-white/10 p-1">
            <TabsTrigger 
              value="transcription"
              className="data-[state=active]:bg-[#D4AF37]/10 data-[state=active]:text-[#D4AF37]"
              data-testid="tab-transcription"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Transcrição
            </TabsTrigger>
            <TabsTrigger 
              value="diary"
              className="data-[state=active]:bg-[#D4AF37]/10 data-[state=active]:text-[#D4AF37]"
              data-testid="tab-diary"
            >
              <Package className="w-4 h-4 mr-2" />
              Diário Técnico
            </TabsTrigger>
            <TabsTrigger 
              value="script"
              className="data-[state=active]:bg-[#D4AF37]/10 data-[state=active]:text-[#D4AF37]"
              data-testid="tab-script"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Roteiro de Revisão
            </TabsTrigger>
          </TabsList>

          {/* Transcription Tab */}
          <TabsContent value="transcription" className="tab-content">
            <Card className="card-rpg">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="text-[#EDEDED] font-['Playfair_Display'] flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#D4AF37]" />
                  Transcrição da Sessão
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {session.transcription_segments?.length > 0 ? (
                  <ScrollArea className="h-[500px]">
                    <div className="p-6 space-y-4 transcript-container">
                      {session.transcription_segments.map((segment, index) => (
                        <div 
                          key={segment.id || index}
                          className={`transcript-entry ${
                            segment.message_type === 'ic' ? 'transcript-ic' :
                            segment.message_type === 'ooc' ? 'transcript-ooc' :
                            'transcript-narration'
                          }`}
                          data-testid={`segment-${segment.id || index}`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className={`badge-${segment.message_type}`}>
                              {typeLabels[segment.message_type]}
                            </Badge>
                            {(() => {
                              const speaker = getSpeakerName(segment.speaker_discord_id);
                              const characterName = segment.speaker_character_name || speaker.characterName;
                              const discordName = speaker.discordName;
                              
                              if (characterName || discordName) {
                                return (
                                  <span className="text-sm font-semibold text-[#D4AF37]">
                                    {characterName && <span>{characterName}</span>}
                                    {discordName && characterName && <span className="text-[#6C7280]"> | </span>}
                                    {discordName && <span className="text-[#6C7280]">{discordName}</span>}
                                  </span>
                                );
                              }
                              return (
                                <span className="text-sm text-[#6C7280]">Desconhecido</span>
                              );
                            })()}
                            {segment.timestamp_start > 0 && (
                              <span className="text-xs text-[#6C7280]">
                                {formatTimestamp(segment.timestamp_start)}
                                {segment.timestamp_absolute_start && (
                                  <span className="ml-1 text-[#D4AF37]" title="Hora real">
                                    ({formatAbsoluteTimestamp(segment.timestamp_absolute_start)})
                                  </span>
                                )}
                              </span>
                            )}
                            
                            <button
                              onClick={() => setEditingSegment(editingSegment === segment.id ? null : segment.id)}
                              className="ml-auto text-[#6C7280] hover:text-[#D4AF37] transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          {editingSegment === segment.id ? (
                            <div className="space-y-3">
                              <Textarea
                                defaultValue={segment.text}
                                className="input-dark"
                                id={`edit-text-${segment.id}`}
                              />
                              <div className="flex gap-2">
                                <Select
                                  defaultValue={segment.message_type}
                                  onValueChange={(value) => {
                                    document.getElementById(`segment-type-${segment.id}`).value = value;
                                  }}
                                >
                                  <SelectTrigger className="input-dark w-40">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#13141A] border-white/10">
                                    <SelectItem value="ic">In-Character</SelectItem>
                                    <SelectItem value="ooc">Out-of-Character</SelectItem>
                                    <SelectItem value="narration">Narração</SelectItem>
                                  </SelectContent>
                                </Select>
                                <input type="hidden" id={`segment-type-${segment.id}`} defaultValue={segment.message_type} />
                                
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const text = document.getElementById(`edit-text-${segment.id}`).value;
                                    const type = document.getElementById(`segment-type-${segment.id}`).value;
                                    updateSegment(segment.id, { text, message_type: type });
                                  }}
                                  className="btn-gold"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingSegment(null)}
                                  className="border-white/10"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className={`text-[${segment.message_type === 'ooc' ? '#6C7280' : '#EDEDED'}]`}>
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
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="p-12 text-center">
                    <FileAudio className="w-12 h-12 text-[#6C7280] mx-auto mb-4" />
                    <p className="text-[#A0A5B5] mb-4">
                      Nenhuma transcrição disponível ainda
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Fazer Upload de Áudio
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Technical Diary Tab */}
          <TabsContent value="diary" className="tab-content">
            <Card className="card-rpg">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="text-[#EDEDED] font-['Playfair_Display'] flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#D4AF37]" />
                  Diário Técnico
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {session.technical_diary?.length > 0 ? (
                  <div className="diary-grid">
                    {session.technical_diary.map((entry, index) => {
                      const Icon = categoryIcons[entry.category] || Zap;
                      return (
                        <Card 
                          key={entry.id || index}
                          className="bg-[#1A1B23] border-white/5"
                          data-testid={`diary-entry-${entry.id || index}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-[#D4AF37]/10">
                                <Icon className="w-4 h-4 text-[#D4AF37]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <Badge className="text-xs mb-2 bg-[#22242C] text-[#A0A5B5] border-0">
                                  {categoryLabels[entry.category]}
                                </Badge>
                                <h4 className="text-[#EDEDED] font-semibold truncate">
                                  {entry.name}
                                </h4>
                                {entry.description && (
                                  <p className="text-sm text-[#6C7280] mt-1 line-clamp-2">
                                    {entry.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-[#6C7280] mx-auto mb-4" />
                    <p className="text-[#A0A5B5]">
                      Nenhuma entrada no diário técnico ainda.
                    </p>
                    <p className="text-sm text-[#6C7280] mt-2">
                      Processe a transcrição com IA para gerar automaticamente.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Review Script Tab */}
          <TabsContent value="script" className="tab-content">
            <Card className="card-rpg">
              <CardHeader className="border-b border-white/10 flex flex-row items-center justify-between">
                <CardTitle className="text-[#EDEDED] font-['Playfair_Display'] flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-[#D4AF37]" />
                  Roteiro de Revisão
                </CardTitle>
                {!editingScript ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingScript(true)}
                    className="border-white/10 text-[#A0A5B5] hover:bg-[#1A1B23]"
                    data-testid="edit-script-btn"
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
                        setEditedScript(session.review_script || "");
                        setEditingScript(false);
                      }}
                      className="border-white/10 text-[#A0A5B5]"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveReviewScript}
                      disabled={saving}
                      className="btn-gold"
                      data-testid="save-script-btn"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Salvar
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-6">
                {editingScript ? (
                  <Textarea
                    value={editedScript}
                    onChange={(e) => setEditedScript(e.target.value)}
                    className="review-editor input-dark min-h-[400px]"
                    placeholder="Escreva ou edite o roteiro de revisão da sessão aqui..."
                    data-testid="script-textarea"
                  />
                ) : (
                  <div className="prose prose-invert max-w-none">
                    {session.review_script ? (
                      <p className="text-[#EDEDED] leading-relaxed font-['Playfair_Display'] text-lg whitespace-pre-wrap">
                        {session.review_script}
                      </p>
                    ) : (
                      <div className="text-center py-8">
                        <Edit3 className="w-12 h-12 text-[#6C7280] mx-auto mb-4" />
                        <p className="text-[#A0A5B5]">
                          Nenhum roteiro de revisão ainda.
                        </p>
                        <p className="text-sm text-[#6C7280] mt-2">
                          Processe com IA ou escreva manualmente.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SessionDetail;
