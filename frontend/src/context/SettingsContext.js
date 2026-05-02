import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/settings");
      setSettings(response.data);
      
      // Sincronizar idioma com i18n se carregado
      if (response.data?.language && response.data.language !== i18n.language) {
        i18n.changeLanguage(response.data.language);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      // toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  }, [i18n]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (formData) => {
    setSaving(true);
    try {
      const response = await api.put("/settings", formData);
      setSettings(response.data);
      
      // Sincronizar idioma se mudou
      if (formData.language && formData.language !== i18n.language) {
        i18n.changeLanguage(formData.language);
      }
      
      toast.success("Configurações salvas!");
      return response.data;
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações");
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, saving, saveSettings, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
