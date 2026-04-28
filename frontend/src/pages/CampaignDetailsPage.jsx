import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Scroll, Book, Edit3 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

import { useCampaignDetails } from "../hooks/useCampaigns";
import { useSessions } from "../hooks/useSessions";
import SessionCard from "../components/dashboard/SessionCard";
import CreateSessionDialog from "../components/dashboard/CreateSessionDialog";
import EditCampaignDialog from "../components/dashboard/EditCampaignDialog";

const CampaignDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { campaign, sessions: campaignSessions, technicalDiary, loading, refresh, updateCampaign } = useCampaignDetails(id);
  const { createSession, deleteSession } = useSessions();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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
          <Scroll className="w-12 h-12 text-rpg-gold mx-auto animate-pulse" />
          <p className="text-[#6C7280] mt-4">Carregando campanha...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-rpg-void flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#EDEDED] font-serif mb-2">Campanha não encontrada</h2>
          <Button onClick={() => navigate("/")} className="btn-gold mt-4">Voltar para Home</Button>
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
            className="flex items-center text-[#A0A5B5] hover:text-rpg-gold transition-colors mb-4 text-sm"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Voltar para Campanhas
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#EDEDED] font-serif flex items-center gap-3">
                {campaign.name}
                <button 
                  onClick={() => setEditDialogOpen(true)}
                  className="p-2 rounded-full hover:bg-white/5 text-[#A0A5B5] hover:text-rpg-gold transition-colors"
                  title="Editar Campanha"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
              </h1>
              <p className="text-[#A0A5B5] mt-1">{campaign.game_system} • {campaign.description || "Sem descrição"}</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setCreateDialogOpen(true)} className="btn-gold">
                <Plus className="w-4 h-4 mr-2" />
                Nova Sessão
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sessions" className="w-full">
          <TabsList className="bg-rpg-surface border border-white/10 p-1 mb-6">
            <TabsTrigger value="sessions" className="data-[state=active]:bg-rpg-void data-[state=active]:text-rpg-gold">
              Sessões
            </TabsTrigger>
            <TabsTrigger value="diary" className="data-[state=active]:bg-rpg-void data-[state=active]:text-rpg-gold">
              Diário Técnico Geral
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="sessions">
            {campaignSessions.length === 0 ? (
              <div className="bg-rpg-surface border border-white/5 rounded-xl p-12 text-center">
                <Scroll className="w-16 h-16 text-rpg-gold/50 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-[#EDEDED] font-serif mb-2">Nenhuma sessão ainda</h2>
                <p className="text-[#A0A5B5] mb-6 max-w-md mx-auto">Crie sua primeira sessão para esta campanha.</p>
                <Button onClick={() => setCreateDialogOpen(true)} className="btn-gold">
                  <Plus className="w-4 h-4 mr-2" /> Nova Sessão
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
                <Book className="w-16 h-16 text-rpg-gold/50 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-[#EDEDED] font-serif mb-2">Diário Vazio</h2>
                <p className="text-[#A0A5B5] mb-6 max-w-md mx-auto">
                  Grave e processe sessões para que as informações (NPCs, Locais, Itens) apareçam aqui agrupadas.
                </p>
              </div>
            ) : (
              <div className="space-y-8 animate-in-fade">
                {Object.entries(technicalDiary).map(([category, entries]) => (
                  <div key={category} className="bg-rpg-surface border border-white/10 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-rpg-gold font-serif mb-4 capitalize">
                      {category === "npc" ? "NPCs" : category}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {entries.map((entry) => (
                        <div key={entry.id} className="bg-rpg-void border border-white/5 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-[#EDEDED]">{entry.name}</h4>
                            <span className="text-xs text-[#6C7280] bg-white/5 px-2 py-1 rounded">
                              Visto em: {entry.session_name}
                            </span>
                          </div>
                          {entry.description && (
                            <p className="text-sm text-[#A0A5B5] mt-2 whitespace-pre-wrap">
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
