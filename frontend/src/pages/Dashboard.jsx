import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Scroll, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { useTranslation } from "react-i18next";

// Custom Hooks
import { useSessions } from "../hooks/useSessions";

// Components
import SessionCard from "../components/dashboard/SessionCard";
import CreateSessionDialog from "../components/dashboard/CreateSessionDialog";

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { 
    sessions, 
    loading, 
    createSession, 
    deleteSession, 
    createSampleSession 
  } = useSessions();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleCreateSubmit = async (formData) => {
    const session = await createSession(formData);
    setCreateDialogOpen(false);
    navigate(`/session/${session.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-rpg-void flex items-center justify-center">
        <div className="text-center">
          <Scroll className="w-12 h-12 text-primary mx-auto animate-pulse" />
          <p className="text-[var(--muted-foreground)] mt-4">{t('dashboard.loadingSessions')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rpg-void bg-pattern">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-in-slide-up">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] font-serif">
              {t('dashboard.title')}
            </h1>
            <p className="text-[var(--muted-foreground)] mt-1">
              {t('dashboard.subtitle')}
            </p>
          </div>
          
          <div className="flex gap-3">
            {sessions.length === 0 && (
              <Button
                variant="outline"
                onClick={createSampleSession}
                className="border-primary/30 text-primary hover:bg-primary/10"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t('dashboard.createSample')}
              </Button>
            )}
            
            <Button onClick={() => setCreateDialogOpen(true)} className="btn-gold">
              <Plus className="w-4 h-4 mr-2" />
              {t('dashboard.newSession')}
            </Button>
          </div>
        </div>

        {/* Sessions Grid */}
        {sessions.length === 0 ? (
          <div className="bg-rpg-surface border border-white/5 rounded-xl p-12 text-center">
            <Scroll className="w-16 h-16 text-primary/50 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[var(--foreground)] font-serif mb-2">
              {t('dashboard.noSessions')}
            </h2>
            <p className="text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
              {t('dashboard.noSessionsDesc')}
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={createSampleSession}
                className="border-primary/30 text-primary hover:bg-primary/10"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t('dashboard.viewSample')}
              </Button>
              <Button onClick={() => setCreateDialogOpen(true)} className="btn-gold">
                <Plus className="w-4 h-4 mr-2" />
                {t('dashboard.newSession')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in-fade delay-200">
            {sessions.map((session, index) => (
              <div key={session.id} className={`animate-in-slide-up delay-${(index % 5 + 1) * 100}`}>
                <SessionCard 
                  session={session} 
                  onDelete={deleteSession} 
                />
              </div>
            ))}
          </div>
        )}

        <CreateSessionDialog 
          open={createDialogOpen} 
          onOpenChange={setCreateDialogOpen} 
          onSubmit={handleCreateSubmit} 
        />
      </div>
    </div>
  );
};

export default Dashboard;

