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

// Components
import Header from "./components/Header";

function App() {
  return (
    <div className="App min-h-screen bg-rpg-void">
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#13141A',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#EDEDED',
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
