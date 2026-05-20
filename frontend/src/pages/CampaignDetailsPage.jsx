import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  Plus, 
  Scroll, 
  Book, 
  Edit3, 
  Brain, 
  Zap, 
  Search, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle 
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api from "../lib/api";

import { useCampaignDetails } from "../hooks/useCampaigns";
import { useSessions } from "../hooks/useSessions";
import SessionCard from "../components/dashboard/SessionCard";
import CreateSessionDialog from "../components/dashboard/CreateSessionDialog";
import EditCampaignDialog from "../components/dashboard/EditCampaignDialog";
import WebRtcRecorder from "../components/session/WebRtcRecorder";

const CampaignDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { campaign, sessions: campaignSessions, technicalDiary, loading, refresh, updateCampaign } = useCampaignDetails(id);
  const { createSession, deleteSession } = useSessions();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [ragStatus, setRagStatus] = useState(null);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragQuery, setRagQuery] = useState("");
  const [ragResults, setRagResults] = useState([]);
  const [queryLoading, setQueryLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);

  const fetchRagStatus = async () => {
    try {
      setRagLoading(true);
      const response = await api.get(`/rag/status/${id}`);
      setRagStatus(response.data);
    } catch (error) {
      console.error("Error fetching RAG status:", error);
    } finally {
      setRagLoading(false);
    }
  };

  const handleSelectCampaignRag = async () => {
    try {
      await api.post(`/rag/select/${id}`);
      fetchRagStatus();
    } catch (error) {
      console.error("Error selecting campaign RAG:", error);
    }
  };

  const handleReindexRag = async () => {
    try {
      setIndexing(true);
      const response = await api.post(`/rag/reindex/${id}`);
      setRagStatus(response.data);
      toast.success(t('campaigns.ragIndexedSuccess', 'Memória RAG reindexada com sucesso!'));
    } catch (error) {
      console.error("Error reindexing RAG:", error);
      toast.error(t('campaigns.ragIndexedError', 'Erro ao reindexar memória RAG'));
    } finally {
      setIndexing(false);
    }
  };

  const handleSearchRag = async (e) => {
    e.preventDefault();
    if (!ragQuery.trim()) return;
    try {
      setQueryLoading(true);
      const response = await api.post(`/rag/query`, {
        campaign_id: id,
        query: ragQuery,
        top_k: 5
      });
      setRagResults(response.data.results || []);
    } catch (error) {
      console.error("Error querying RAG:", error);
      toast.error(t('campaigns.ragQueryError', 'Erro ao realizar busca semântica'));
    } finally {
      setQueryLoading(false);
    }
  };

  const handleCreateSubmit = async (formData) => {
    const sessionData = { ...formData, campaign_id: id };
    const session = await createSession(sessionData);
    setCreateDialogOpen(false);
    navigate(`/session/${session.id}`);
  };

  const handleDeleteSession = async (sessionId) => {
    await deleteSession(sessionId);
    refresh();
  };

  const handleEditCampaignSubmit = async (formData) => {
    await updateCampaign(formData);
    setEditDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-rpg-void flex items-center justify-center">
        <div className="text-center">
          <Scroll className="w-12 h-12 text-primary mx-auto animate-pulse" />
          <p className="text-[var(--muted-foreground)] mt-4">{t('campaigns.loadingCampaign')}</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-rpg-void flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[var(--foreground)] font-serif mb-2">{t('campaigns.notFound')}</h2>
          <Button onClick={() => navigate("/")} className="btn-gold mt-4">{t('session.backToHome')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rpg-void bg-pattern">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        
        {/* Header / Breadcrumb */}
        <div className="mb-8">
          <button 
            onClick={() => navigate("/")}
            className="flex items-center text-[var(--muted-foreground)] hover:text-primary transition-colors mb-4 text-sm"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> {t('campaigns.backToCampaigns')}
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] font-serif flex items-center gap-3">
                {campaign.name}
                <button 
                  onClick={() => setEditDialogOpen(true)}
                  className="p-2 rounded-full hover:bg-white/5 text-[var(--muted-foreground)] hover:text-primary transition-colors"
                  title={t('campaigns.editCampaign')}
                >
                  <Edit3 className="w-5 h-5" />
                </button>
              </h1>
              <p className="text-[var(--muted-foreground)] mt-1">{campaign.game_system} • {campaign.description || ""}</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setCreateDialogOpen(true)} className="btn-gold">
                <Plus className="w-4 h-4 mr-2" />
                {t('dashboard.newSession')}
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs 
          defaultValue="sessions" 
          className="w-full"
          onValueChange={(value) => {
            if (value === "rag") {
              handleSelectCampaignRag();
            }
          }}
        >
          <TabsList className="bg-rpg-surface border border-border p-1 mb-6">
            <TabsTrigger value="sessions" className="data-[state=active]:bg-rpg-void data-[state=active]:text-primary">
              {t('common.sessions')}
            </TabsTrigger>
            <TabsTrigger value="diary" className="data-[state=active]:bg-rpg-void data-[state=active]:text-primary">
              {t('session.technicalDiary')}
            </TabsTrigger>
            <TabsTrigger value="rag" className="data-[state=active]:bg-rpg-void data-[state=active]:text-primary">
              {t('campaigns.memoryRag', 'Memória (RAG)')}
            </TabsTrigger>
            <TabsTrigger value="webrtc" className="data-[state=active]:bg-rpg-void data-[state=active]:text-primary">
              {t('common.webrtcRecorder', 'Gravador WebRTC')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="sessions">
            {campaignSessions.length === 0 ? (
              <div className="bg-rpg-surface border border-white/5 rounded-xl p-12 text-center">
                <Scroll className="w-16 h-16 text-primary/50 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-[var(--foreground)] font-serif mb-2">{t('campaigns.noSessions')}</h2>
                <p className="text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">{t('campaigns.noSessionsDesc')}</p>
                <Button onClick={() => setCreateDialogOpen(true)} className="btn-gold">
                  <Plus className="w-4 h-4 mr-2" /> {t('dashboard.newSession')}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in-fade">
                {campaignSessions.map((session) => (
                  <SessionCard key={session.id} session={session} onDelete={handleDeleteSession} />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="diary">
            {!technicalDiary || Object.keys(technicalDiary).length === 0 ? (
              <div className="bg-rpg-surface border border-white/5 rounded-xl p-12 text-center">
                <Book className="w-16 h-16 text-primary/50 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-[var(--foreground)] font-serif mb-2">{t('session.diary.empty')}</h2>
                <p className="text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
                  {t('session.diary.empty')}
                </p>
              </div>
            ) : (
              <div className="space-y-8 animate-in-fade">
                {Object.entries(technicalDiary).map(([category, entries]) => (
                  <div key={category} className="bg-rpg-surface border border-border rounded-xl p-6">
                    <h3 className="text-xl font-bold text-primary font-serif mb-4 capitalize">
                      {category === "npc" ? "NPCs" : category}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {entries.map((entry) => (
                        <div key={entry.id} className="bg-rpg-void border border-white/5 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-[var(--foreground)]">{entry.name}</h4>
                            <span className="text-xs text-[var(--muted-foreground)] bg-white/5 px-2 py-1 rounded">
                              {entry.session_name}
                            </span>
                          </div>
                          {entry.description && (
                            <p className="text-sm text-[var(--muted-foreground)] mt-2 whitespace-pre-wrap">
                              {entry.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rag">
            <div className="space-y-6 animate-in-slide-up">
              {/* RAG Status Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Card 1: RAM Cache Status */}
                <div className="bg-rpg-surface border border-border rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">RAM Cache</span>
                      <h4 className="text-lg font-bold font-serif text-[var(--foreground)] mt-1 flex items-center gap-2">
                        <Brain className="w-5 h-5 text-primary" />
                        {t('campaigns.ragStatusCache', 'Estado do Cache')}
                      </h4>
                    </div>
                  </div>
                  <div className="mt-2 flex-grow">
                    {ragStatus?.exists ? (
                      <div className="flex items-center gap-3">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="font-semibold text-green-400 text-sm">
                          {t('campaigns.ragCacheActive', 'Ativo & Pronto')}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="relative flex h-3 w-3">
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                        </span>
                        <span className="font-semibold text-yellow-400 text-sm">
                          {t('campaigns.ragCacheInactive', 'Não Inicializado')}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-[var(--muted-foreground)] mt-3">
                      {ragStatus?.exists 
                        ? t('campaigns.ragCacheDescActive', 'O cérebro do RAG está ativo em memória. Consultas locais executam em milissegundos.')
                        : t('campaigns.ragCacheDescInactive', 'O índice vetorial para esta campanha ainda não foi criado. Reindexe a lore para ativá-lo.')
                      }
                    </p>
                  </div>
                </div>

                {/* Card 2: Disk Index Metadata */}
                <div className="bg-rpg-surface border border-border rounded-xl p-6 flex flex-col justify-between hover:border-primary/30 transition-all duration-300">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Disk Index</span>
                    <h4 className="text-lg font-bold font-serif text-[var(--foreground)] mt-1 flex items-center gap-2">
                      <Database className="w-5 h-5 text-primary" />
                      {t('campaigns.ragDiskMetadata', 'Metadados do Índice')}
                    </h4>
                  </div>
                  <div className="mt-4 flex-grow text-xs space-y-2">
                    {ragLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                      </div>
                    ) : ragStatus?.exists ? (
                      <>
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span className="text-[var(--muted-foreground)]">{t('campaigns.ragDiskChunks', 'Segmentos de Lore')}:</span>
                          <span className="font-semibold text-[var(--foreground)]">{ragStatus.chunk_count}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span className="text-[var(--muted-foreground)]">{t('campaigns.ragDiskModel', 'Modelo')}:</span>
                          <span className="font-semibold text-[var(--foreground)] truncate max-w-[150px]">{ragStatus.embedding_model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--muted-foreground)]">{t('campaigns.ragDiskUpdated', 'Atualizado em')}:</span>
                          <span className="font-semibold text-[var(--foreground)]">
                            {ragStatus.updated_at ? new Date(ragStatus.updated_at).toLocaleString() : "-"}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-[var(--muted-foreground)] italic">
                        {t('campaigns.ragDiskNoIndex', 'Nenhum arquivo de índice encontrado no disco.')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card 3: Action Controls */}
                <div className="bg-rpg-surface border border-border rounded-xl p-6 flex flex-col justify-between hover:border-primary/30 transition-all duration-300">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Controles</span>
                    <h4 className="text-lg font-bold font-serif text-[var(--foreground)] mt-1 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      {t('campaigns.ragActions', 'Ações da Memória')}
                    </h4>
                  </div>
                  <div className="mt-2 flex-grow">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {t('campaigns.ragActionsDesc', 'A indexação ocorre automaticamente ao consolidar sessões. Use o botão abaixo para reindexação manual total.')}
                    </p>
                    <Button 
                      onClick={handleReindexRag} 
                      disabled={indexing || ragLoading}
                      className="btn-gold w-full mt-4 flex items-center justify-center"
                    >
                      {indexing ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          {t('campaigns.ragReindexingButton', 'Reindexando...')}
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          {t('campaigns.ragReindexButton', 'Reindexar Memória')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

              </div>

              {/* Oracle (Query Sandbox) */}
              <div className="bg-rpg-surface border border-border rounded-xl p-6 glow-gold-subtle relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="mb-6 relative z-10">
                  <h3 className="text-2xl font-bold text-primary font-serif mb-2 flex items-center gap-2">
                    <Search className="w-6 h-6" />
                    {t('campaigns.oracleTitle', 'O Oráculo Semântico')}
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)] max-w-2xl">
                    {t('campaigns.oracleDesc', 'Consulte a memória contínua da campanha usando linguagem natural. O RAG buscará os fragmentos mais relevantes do diário técnico e resumos históricos instantaneamente.')}
                  </p>
                </div>

                <form onSubmit={handleSearchRag} className="flex gap-2 mb-6 relative z-10">
                  <input
                    type="text"
                    value={ragQuery}
                    onChange={(e) => setRagQuery(e.target.value)}
                    placeholder={t('campaigns.oraclePlaceholder', 'Ex: Como Alucard reagiu ao ver o grimório? ou Quem é o líder dos rebeldes?')}
                    className="input-dark flex-grow py-3 px-4 rounded-lg outline-none text-sm placeholder-[var(--muted-foreground)]/60"
                  />
                  <Button 
                    type="submit" 
                    disabled={queryLoading || !ragQuery.trim()}
                    className="btn-gold px-6"
                  >
                    {queryLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        {t('campaigns.oracleQueryingButton', 'Consultando...')}
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        {t('campaigns.oracleQueryButton', 'Consultar')}
                      </>
                    )}
                  </Button>
                </form>

                {/* Query Results */}
                <div className="relative z-10">
                  {queryLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Brain className="w-12 h-12 text-primary animate-pulse mb-3" />
                      <p className="text-sm text-[var(--muted-foreground)] animate-pulse">
                        {t('campaigns.oracleConsultingDesc', 'Consultando as teias da memória da campanha...')}
                      </p>
                    </div>
                  ) : ragResults.length > 0 ? (
                    <div className="space-y-4 animate-in-fade">
                      <h4 className="text-sm font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                        {t('campaigns.oracleResultsTitle', 'Fragmentos Recuperados')}
                      </h4>
                      {ragResults.map((result, idx) => {
                        const scorePercent = (result.score * 100).toFixed(1);
                        const isHighRelevance = result.score >= 0.7;
                        
                        return (
                          <div 
                            key={result.chunk.id || idx} 
                            className="bg-rpg-void border border-white/5 rounded-lg p-5 hover:border-primary/30 transition-all duration-300 relative group flex flex-col md:flex-row md:items-start justify-between gap-4"
                          >
                            <div className="space-y-2 flex-grow pr-12">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-primary font-serif">
                                  {result.chunk.title}
                                </span>
                                <span className="text-[10px] text-[var(--muted-foreground)] bg-white/5 px-2 py-0.5 rounded uppercase">
                                  {result.chunk.source_type}
                                </span>
                              </div>
                              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed italic whitespace-pre-line">
                                "{result.chunk.text}"
                              </p>
                            </div>
                            <div className="flex-shrink-0 flex items-center md:items-start">
                              <span className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                                isHighRelevance 
                                  ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                  : 'bg-primary/10 text-primary border-primary/20'
                              }`}>
                                {scorePercent}% {t('campaigns.oracleRelevance', 'Relevância')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : ragQuery && !queryLoading ? (
                    <div className="bg-rpg-void border border-white/5 rounded-lg p-8 text-center">
                      <AlertTriangle className="w-8 h-8 text-yellow-500/50 mx-auto mb-2" />
                      <p className="text-sm text-[var(--muted-foreground)] italic">
                        {t('campaigns.oracleEmpty', 'O Oráculo permanece em silêncio. Nenhum fragmento relevante encontrado para a consulta.')}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="webrtc" className="py-6">
            <WebRtcRecorder />
          </TabsContent>
        </Tabs>

        <CreateSessionDialog 
          open={createDialogOpen} 
          onOpenChange={setCreateDialogOpen} 
          onSubmit={handleCreateSubmit} 
        />

        <EditCampaignDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          campaign={campaign}
          onSubmit={handleEditCampaignSubmit}
        />
      </div>
    </div>
  );
};

export default CampaignDetailsPage;

