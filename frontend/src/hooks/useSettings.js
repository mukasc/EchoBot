import { useState, useEffect } from "react";
import api from "../lib/api";
import { toast } from "sonner";

export const useSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/settings");
      setSettings(response.data);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const saveSettings = async (formData) => {
    setSaving(true);
    try {
      await api.put("/settings", formData);
      toast.success("Configurações salvas!");
      await fetchSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações");
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return { settings, loading, saving, saveSettings };
};
