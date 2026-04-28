import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Scroll, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";

// Custom Hooks
import { useCampaigns } from "../hooks/useCampaigns";

// Components
import CampaignCard from "../components/dashboard/CampaignCard";
import CreateCampaignDialog from "../components/dashboard/CreateCampaignDialog";

const CampaignsPage = () => {
  const navigate = useNavigate();
  const { 
    campaigns, 
    loading, 
    createCampaign, 
    deleteCampaign,
  } = useCampaigns();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleCreateSubmit = async (formData) => {
    const campaign = await createCampaign(formData);
    setCreateDialogOpen(false);
    navigate(`/campaign/${campaign.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-rpg-void flex items-center justify-center">
        <div className="text-center">
          <Scroll className="w-12 h-12 text-rpg-gold mx-auto animate-pulse" />
          <p className="text-[#6C7280] mt-4">Carregando campanhas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rpg-void bg-pattern">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-in-slide-up">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#EDEDED] font-serif">
              Minhas Campanhas
            </h1>
            <p className="text-[#A0A5B5] mt-1">
              Gerencie suas crônicas e universos
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button onClick={() => setCreateDialogOpen(true)} className="btn-gold">
              <Plus className="w-4 h-4 mr-2" />
              Nova Campanha
            </Button>
          </div>
        </div>

        {/* Campaigns Grid */}
        {campaigns.length === 0 ? (
          <div className="bg-rpg-surface border border-white/5 rounded-xl p-12 text-center">
            <Scroll className="w-16 h-16 text-rpg-gold/50 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#EDEDED] font-serif mb-2">
              Nenhuma campanha ainda
            </h2>
            <p className="text-[#A0A5B5] mb-6 max-w-md mx-auto">
              Crie sua primeira campanha para agrupar suas sessões e diários técnicos de RPG.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setCreateDialogOpen(true)} className="btn-gold">
                <Plus className="w-4 h-4 mr-2" />
                Nova Campanha
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in-fade delay-200">
            {campaigns.map((campaign, index) => (
              <div key={campaign.id} className={`animate-in-slide-up delay-${(index % 5 + 1) * 100}`}>
                <CampaignCard 
                  campaign={campaign} 
                  onDelete={deleteCampaign} 
                />
              </div>
            ))}
          </div>
        )}

        <CreateCampaignDialog 
          open={createDialogOpen} 
          onOpenChange={setCreateDialogOpen} 
          onSubmit={handleCreateSubmit} 
        />
      </div>
    </div>
  );
};

export default CampaignsPage;
