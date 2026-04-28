import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { toast } from "sonner";

export const useCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/campaigns/");
      setCampaigns(response.data);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast.error("Erro ao carregar campanhas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const createCampaign = async (campaignData) => {
    try {
      const response = await api.post("/campaigns/", campaignData);
      setCampaigns(prev => [response.data, ...prev]);
      toast.success("Campanha criada com sucesso!");
      return response.data;
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast.error("Erro ao criar campanha");
      throw error;
    }
  };

  const deleteCampaign = async (id) => {
    try {
      await api.delete(`/campaigns/${id}/`);
      setCampaigns(prev => prev.filter(c => c.id !== id));
      toast.success("Campanha excluída");
    } catch (error) {
      console.error("Error deleting campaign:", error);
      toast.error("Erro ao excluir campanha");
      throw error;
    }
  };

  return {
    campaigns,
    loading,
    createCampaign,
    deleteCampaign,
    refresh: fetchCampaigns
  };
};

export const useCampaignDetails = (campaignId) => {
  const [campaign, setCampaign] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [technicalDiary, setTechnicalDiary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = useCallback(async () => {
    if (!campaignId) return;
    try {
      setLoading(true);
      const [campRes, sessRes, diaryRes] = await Promise.all([
        api.get(`/campaigns/${campaignId}`),
        api.get(`/campaigns/${campaignId}/sessions`),
        api.get(`/campaigns/${campaignId}/technical_diary`)
      ]);
      setCampaign(campRes.data);
      setSessions(sessRes.data);
      setTechnicalDiary(diaryRes.data.technical_diary);
    } catch (error) {
      console.error("Error fetching campaign details:", error);
      toast.error("Erro ao carregar detalhes da campanha");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const updateCampaign = async (updates) => {
    try {
      const response = await api.put(`/campaigns/${campaignId}`, updates);
      setCampaign(response.data);
      toast.success("Campanha atualizada com sucesso");
      return response.data;
    } catch (error) {
      console.error("Error updating campaign:", error);
      toast.error("Erro ao atualizar campanha");
      throw error;
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return {
    campaign,
    sessions,
    technicalDiary,
    loading,
    updateCampaign,
    refresh: fetchDetails
  };
};
