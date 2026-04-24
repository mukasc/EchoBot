import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { toast } from "sonner";

export const useSession = (sessionId) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const response = await api.get(`/sessions/${sessionId}`);
      setSession(response.data);
    } catch (error) {
      console.error("Error fetching session:", error);
      toast.error("Sessão não encontrada");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const updateSession = async (updates) => {
    setSaving(true);
    try {
      const response = await api.put(`/sessions/${sessionId}`, updates);
      setSession(prev => ({ ...prev, ...response.data }));
      toast.success("Informações salvas!");
      return response.data;
    } catch (error) {
      toast.error("Erro ao salvar informações");
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const uploadAudio = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      await api.post(`/sessions/${sessionId}/upload-audio`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Áudio enviado e transcrito com sucesso!");
      await fetchSession();
    } catch (error) {
      toast.error("Erro ao processar áudio");
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const processWithAI = async () => {
    setProcessing(true);
    try {
      await api.post(`/sessions/${sessionId}/process`);
      toast.success("Sessão processada com IA!");
      await fetchSession();
    } catch (error) {
      toast.error("Erro ao processar com IA");
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  const updateSegment = async (segmentId, updates) => {
    try {
      await api.put(`/sessions/${sessionId}/segments/${segmentId}`, updates);
      await fetchSession();
      toast.success("Segmento atualizado!");
    } catch (error) {
      toast.error("Erro ao atualizar segmento");
      throw error;
    }
  };

  const markAsCompleted = async () => {
    return updateSession({ status: "completed" });
  };

  const generateNarration = async (options = {}) => {
    setProcessing(true);
    try {
      const { provider, voiceId } = options;
      let url = `/sessions/${sessionId}/narration`;
      
      const params = new URLSearchParams();
      if (provider) params.append("provider", provider);
      if (voiceId) params.append("voice_id", voiceId);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await api.post(url);
      toast.success(response.data.message || "Narração gerada!");
      await fetchSession();
      return response.data;
    } catch (error) {
      const detail = error.response?.data?.detail || "Erro ao gerar narração";
      toast.error(detail);
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  return {
    session,
    loading,
    saving,
    processing,
    uploading,
    updateSession,
    uploadAudio,
    processWithAI,
    updateSegment,
    markAsCompleted,
    generateNarration,
    refresh: fetchSession
  };
};
