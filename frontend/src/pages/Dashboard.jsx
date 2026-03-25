import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
  Plus, 
  Calendar, 
  Clock, 
  Scroll, 
  Trash2,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusLabels = {
  recording: "Gravando",
  transcribing: "Transcrevendo",
  processing: "Processando",
  awaiting_review: "Aguardando Revisão",
  completed: "Concluída"
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSession, setNewSession] = useState({
    name: "",
    game_system: "D&D 5e"
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await axios.get(`${API}/sessions`);
      setSessions(response.data);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Erro ao carregar sessões");
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    if (!newSession.name.trim()) {
      toast.error("Nome da sessão é obrigatório");
      return;
    }

    try {
      const response = await axios.post(`${API}/sessions`, newSession);
      setSessions([response.data, ...sessions]);
      setCreateDialogOpen(false);
      setNewSession({ name: "", game_system: "D&D 5e" });
      toast.success("Sessão criada com sucesso!");
      navigate(`/session/${response.data.id}`);
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Erro ao criar sessão");
    }
  };

  const deleteSession = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm("Tem certeza que deseja excluir esta sessão?")) return;

    try {
      await axios.delete(`${API}/sessions/${id}`);
      setSessions(sessions.filter(s => s.id !== id));
      toast.success("Sessão excluída");
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Erro ao excluir sessão");
    }
  };

  const createSampleSession = async () => {
    try {
      setLoading(true);
      await axios.post(`${API}/demo/create-sample-session`);
      await fetchSessions();
      toast.success("Sessão de exemplo criada!");
    } catch (error) {
      console.error("Error creating sample:", error);
      toast.error("Erro ao criar sessão de exemplo");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center">
        <div className="text-center">
          <Scroll className="w-12 h-12 text-[#D4AF37] mx-auto animate-pulse" />
          <p className="text-[#6C7280] mt-4">Carregando sessões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0C10] bg-pattern" data-testid="dashboard">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#EDEDED] font-['Playfair_Display']">
              Sessões de RPG
            </h1>
            <p className="text-[#A0A5B5] mt-1">
              Gerencie suas crônicas de aventura
            </p>
          </div>
          
          <div className="flex gap-3">
            {sessions.length === 0 && (
              <Button
                variant="outline"
                onClick={createSampleSession}
                className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                data-testid="create-sample-btn"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Criar Exemplo
              </Button>
            )}
            
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="btn-gold"
                  data-testid="create-session-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Sessão
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#13141A] border-white/10 text-[#EDEDED]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-['Playfair_Display']">
                    Nova Sessão de RPG
                  </DialogTitle>
                  <DialogDescription className="text-[#A0A5B5]">
                    Crie uma nova sessão para gravar e transcrever
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="session-name" className="text-[#EDEDED]">
                      Nome da Sessão
                    </Label>
                    <Input
                      id="session-name"
                      value={newSession.name}
                      onChange={(e) => setNewSession({...newSession, name: e.target.value})}
                      placeholder="Ex: Sessão 01 - A Caverna do Dragão"
                      className="input-dark"
                      data-testid="session-name-input"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="game-system" className="text-[#EDEDED]">
                      Sistema de Jogo
                    </Label>
                    <Select
                      value={newSession.game_system}
                      onValueChange={(value) => setNewSession({...newSession, game_system: value})}
                    >
                      <SelectTrigger 
                        className="input-dark"
                        data-testid="game-system-select"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#13141A] border-white/10">
                        <SelectItem value="D&D 5e">D&D 5e</SelectItem>
                        <SelectItem value="Pathfinder 2e">Pathfinder 2e</SelectItem>
                        <SelectItem value="Call of Cthulhu">Call of Cthulhu</SelectItem>
                        <SelectItem value="Tormenta 20">Tormenta 20</SelectItem>
                        <SelectItem value="Vampiro: A Máscara">Vampiro: A Máscara</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                    className="border-white/10 text-[#A0A5B5] hover:bg-[#1A1B23]"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={createSession}
                    className="btn-gold"
                    data-testid="confirm-create-session-btn"
                  >
                    Criar Sessão
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Sessions Grid */}
        {sessions.length === 0 ? (
          <div className="empty-state rounded-xl p-12 text-center">
            <Scroll className="w-16 h-16 text-[#D4AF37]/50 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#EDEDED] font-['Playfair_Display'] mb-2">
              Nenhuma sessão ainda
            </h2>
            <p className="text-[#A0A5B5] mb-6 max-w-md mx-auto">
              Crie sua primeira sessão de RPG ou experimente com uma sessão de exemplo para ver como funciona.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={createSampleSession}
                className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                data-testid="empty-create-sample-btn"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Ver Exemplo
              </Button>
              <Button 
                onClick={() => setCreateDialogOpen(true)}
                className="btn-gold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Sessão
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
              <Link 
                key={session.id} 
                to={`/session/${session.id}`}
                data-testid={`session-card-${session.id}`}
              >
                <Card className="card-rpg group cursor-pointer h-full">
                  {/* Cover Image */}
                  <div className="relative h-32 overflow-hidden rounded-t-lg">
                    <img
                      src={session.cover_image_url || "https://images.pexels.com/photos/7150642/pexels-photo-7150642.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"}
                      alt={session.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#13141A] to-transparent" />
                    
                    {/* Status Badge */}
                    <Badge 
                      className={`absolute top-3 right-3 text-xs font-semibold uppercase tracking-wider status-${session.status}`}
                    >
                      {statusLabels[session.status] || session.status}
                    </Badge>
                    
                    {/* Delete Button */}
                    <button
                      onClick={(e) => deleteSession(session.id, e)}
                      className="absolute top-3 left-3 p-2 rounded-lg bg-[#0B0C10]/80 text-[#6C7280] hover:text-[#8C1C13] hover:bg-[#0B0C10] transition-colors opacity-0 group-hover:opacity-100"
                      data-testid={`delete-session-${session.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <CardContent className="p-5">
                    <h3 className="text-lg font-semibold text-[#EDEDED] font-['Playfair_Display'] mb-2 line-clamp-2 group-hover:text-[#D4AF37] transition-colors">
                      {session.name}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm text-[#6C7280] mb-4">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {formatDate(session.created_at)}
                      </span>
                      {session.duration_minutes && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {session.duration_minutes} min
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[#A0A5B5] border-white/10">
                        {session.game_system}
                      </Badge>
                      <ChevronRight className="w-5 h-5 text-[#6C7280] group-hover:text-[#D4AF37] transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
