import { useState, useEffect } from "react";
import api from "../lib/api";
import { toast } from "sonner";

export const useBotSetup = () => {
  const [instructions, setInstructions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInstructions = async () => {
      try {
        const response = await api.get("/bot-setup-instructions/");
        setInstructions(response.data);
      } catch (error) {
        console.error("Error fetching instructions:", error);
        toast.error("Erro ao carregar instruções");
      } finally {
        setLoading(false);
      }
    };

    fetchInstructions();
  }, []);

  return { instructions, loading };
};
