import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { toast } from "sonner";

export const useSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/sessions/");
      setSessions(response.data);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Erro ao carregar sessões");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const createSession = async (sessionData) => {
    try {
      const response = await api.post("/sessions/", sessionData);
      setSessions(prev => [response.data, ...prev]);
      toast.success("Sessão criada com sucesso!");
      return response.data;
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Erro ao criar sessão");
      throw error;
    }
  };

  const deleteSession = async (id) => {
    try {
      await api.delete(`/sessions/${id}`);
      setSessions(prev => prev.filter(s => s.id !== id));
      toast.success("Sessão excluída");
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Erro ao excluir sessão");
      throw error;
    }
  };

  const createSampleSession = async () => {
    try {
      setLoading(true);
      await api.post("/demo/create-sample-session");
      await fetchSessions();
      toast.success("Sessão de exemplo criada!");
    } catch (error) {
      console.error("Error creating sample:", error);
      toast.error("Erro ao criar sessão de exemplo");
    } finally {
      setLoading(false);
    }
  };

  return { 
    sessions, 
    loading, 
    createSession, 
    deleteSession, 
    createSampleSession, 
    refresh: fetchSessions 
  };
};
