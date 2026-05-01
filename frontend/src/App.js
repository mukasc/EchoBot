import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";

// Pages
import CampaignsPage from "./pages/CampaignsPage";
import CampaignDetailsPage from "./pages/CampaignDetailsPage";
import SessionDetail from "./pages/SessionDetail";
import CharacterMappings from "./pages/CharacterMappings";
import Settings from "./pages/Settings";
import BotSetup from "./pages/BotSetup";

import Header from "./components/Header";
import { useSettings } from "./hooks/useSettings";
import { useEffect } from "react";

function App() {
  const { settings } = useSettings();

  useEffect(() => {
    if (settings?.visual_theme) {
      document.documentElement.setAttribute('data-theme', settings.visual_theme);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark_fantasy');
    }
  }, [settings?.visual_theme]);

  return (
    <div className="App min-h-screen bg-background text-foreground">
      <Toaster 
        position="top-right" 
        toastOptions={{
          className: "card-rpg",
          style: {
            background: 'var(--card)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          },
        }}
      />
      <BrowserRouter>
        <Header />
        <main className="pt-16">
          <Routes>
            <Route path="/" element={<CampaignsPage />} />
            <Route path="/campaign/:id" element={<CampaignDetailsPage />} />
            <Route path="/session/:id" element={<SessionDetail />} />
            <Route path="/characters" element={<CharacterMappings />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/bot-setup" element={<BotSetup />} />
          </Routes>
        </main>
      </BrowserRouter>
    </div>
  );
}

export default App;
