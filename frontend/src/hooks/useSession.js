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

  // Polling logic for background tasks
  useEffect(() => {
    let interval;
    const shouldPoll = session?.status === "transcribing" || session?.status === "processing";

    if (shouldPoll) {
      interval = setInterval(() => {
        // We use a simplified fetch here to avoid setting loading state to true every time
        api.get(`/sessions/${sessionId}`)
          .then(response => {
            setSession(response.data);
          })
          .catch(err => console.error("Polling error:", err));
      }, 3000); // Poll every 3 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionId, session?.status]);

  const updateSession = async (updates) => {
    setSaving(true);
    try {
      const response = await api.put(`/sessions/${sessionId}`, updates);
      setSession(prev => ({ ...prev, ...response.data }));
      toast.success("Informações salvas!");
      return response.data;
    } catch (error) {
      const detail = error.response?.data?.detail || "Erro ao salvar informações";
      toast.error(detail);
    } finally {
      setSaving(false);
    }
  };

  const uploadAudio = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const response = await api.post(`/sessions/${sessionId}/upload-audio`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Áudio enviado. Transcrição iniciada em segundo plano!");
      if (response.data.status) {
        setSession(prev => ({ ...prev, status: response.data.status }));
      }
      await fetchSession();
    } catch (error) {
      const detail = error.response?.data?.detail || "Erro ao processar áudio";
      toast.error(detail);
    } finally {
      setUploading(false);
    }
  };

  const processWithAI = async () => {
    setProcessing(true);
    try {
      const response = await api.post(`/sessions/${sessionId}/process`);
      toast.success("Processamento iniciado em segundo plano!");
      if (response.data.status) {
        setSession(prev => ({ ...prev, status: response.data.status }));
      }
      await fetchSession();
    } catch (error) {
      const detail = error.response?.data?.detail || "Erro ao processar com IA";
      toast.error(detail);
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
    } finally {
      setProcessing(false);
    }
  };

  const reprocessTranscription = async () => {
    setProcessing(true);
    try {
      const response = await api.post(`/sessions/${sessionId}/reprocess`);
      toast.success(response.data.message || "Reprocessamento iniciado!");
      if (response.data.status) {
        setSession(prev => ({ ...prev, status: response.data.status }));
      }
      await fetchSession();
    } catch (error) {
      const detail = error.response?.data?.detail || "Erro ao reprocessar áudio";
      toast.error(detail);
    } finally {
      setProcessing(false);
    }
  };

  const isBackgroundProcessing = session?.status === "transcribing" || session?.status === "processing";

  return {
    session,
    loading,
    saving,
    processing: processing || (session?.status === "processing"),
    uploading: uploading || (session?.status === "transcribing"),
    isBackgroundProcessing,
    updateSession,
    uploadAudio,
    processWithAI,
    updateSegment,
    markAsCompleted,
    generateNarration,
    reprocessTranscription,
    refresh: fetchSession
  };
};
