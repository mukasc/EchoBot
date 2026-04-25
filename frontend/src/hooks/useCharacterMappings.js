import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { toast } from "sonner";

export const useCharacterMappings = () => {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMappings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/character-mappings/");
      setMappings(response.data);
    } catch (error) {
      console.error("Error fetching character mappings:", error);
      toast.error("Erro ao carregar mapeamentos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  const getSpeakerInfo = useCallback((speakerId) => {
    if (!speakerId) return { characterName: null, discordName: null };
    
    const mapping = mappings.find(m => m.discord_user_id === speakerId);
    if (mapping) {
      return { 
        characterName: mapping.character_name, 
        discordName: mapping.discord_username 
      };
    }
    
    return { 
      characterName: null, 
      discordName: `Usuário ${speakerId.substring(0, 8)}` 
    };
  }, [mappings]);

  const saveMapping = async (formData, editingId = null) => {
    try {
      if (editingId) {
        await api.put(`/character-mappings/${editingId}`, formData);
      } else {
        await api.post("/character-mappings/", formData);
      }
      await fetchMappings();
      toast.success("Mapeamento salvo!");
    } catch (error) {
      const detail = error.response?.data?.detail || "Erro ao salvar mapeamento";
      toast.error(detail);
    }
  };

  const deleteMapping = async (id) => {
    try {
      await api.delete(`/character-mappings/${id}`);
      setMappings(prev => prev.filter(m => m.id !== id));
      toast.success("Mapeamento excluído");
    } catch (error) {
      const detail = error.response?.data?.detail || "Erro ao excluir mapeamento";
      toast.error(detail);
    }
  };

  return { mappings, loading, getSpeakerInfo, saveMapping, deleteMapping, refresh: fetchMappings };
};
