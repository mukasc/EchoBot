import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3,
  Check,
  X,
  UserCircle,
  Sword,
  Loader2
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CharacterMappings = () => {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    discord_user_id: "",
    discord_username: "",
    character_name: "",
    character_role: "",
    avatar_url: ""
  });

  useEffect(() => {
    fetchMappings();
  }, []);

  const fetchMappings = async () => {
    try {
      const response = await axios.get(`${API}/character-mappings`);
      setMappings(response.data);
    } catch (error) {
      console.error("Error fetching mappings:", error);
      toast.error("Erro ao carregar mapeamentos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.discord_user_id.trim() || !formData.discord_username.trim() || !formData.character_name.trim()) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    try {
      await axios.post(`${API}/character-mappings`, formData);
      await fetchMappings();
      setDialogOpen(false);
      resetForm();
      toast.success("Mapeamento salvo!");
    } catch (error) {
      console.error("Error saving mapping:", error);
      toast.error("Erro ao salvar mapeamento");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este mapeamento?")) return;

    try {
      await axios.delete(`${API}/character-mappings/${id}`);
      setMappings(mappings.filter(m => m.id !== id));
      toast.success("Mapeamento excluído");
    } catch (error) {
      console.error("Error deleting mapping:", error);
      toast.error("Erro ao excluir mapeamento");
    }
  };

  const startEdit = (mapping) => {
    setFormData({
      discord_user_id: mapping.discord_user_id,
      discord_username: mapping.discord_username,
      character_name: mapping.character_name,
      character_role: mapping.character_role || "",
      avatar_url: mapping.avatar_url || ""
    });
    setDialogOpen(true);
    setEditingId(mapping.id);
  };

  const resetForm = () => {
    setFormData({
      discord_user_id: "",
      discord_username: "",
      character_name: "",
      character_role: "",
      avatar_url: ""
    });
    setEditingId(null);
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0C10] bg-pattern" data-testid="character-mappings">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#EDEDED] font-['Playfair_Display']">
              Mapeamento de Personagens
            </h1>
            <p className="text-[#A0A5B5] mt-1">
              Vincule usuários do Discord aos seus personagens
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button 
                className="btn-gold"
                data-testid="add-mapping-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Mapeamento
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#13141A] border-white/10 text-[#EDEDED]">
              <DialogHeader>
                <DialogTitle className="text-xl font-['Playfair_Display']">
                  {editingId ? "Editar Mapeamento" : "Novo Mapeamento"}
                </DialogTitle>
                <DialogDescription className="text-[#A0A5B5]">
                  Vincule um usuário do Discord a um personagem de RPG
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="discord-id" className="text-[#EDEDED]">
                    Discord User ID *
                  </Label>
                  <Input
                    id="discord-id"
                    value={formData.discord_user_id}
                    onChange={(e) => setFormData({...formData, discord_user_id: e.target.value})}
                    placeholder="Ex: 123456789012345678"
                    className="input-dark"
                    data-testid="discord-id-input"
                  />
                  <p className="text-xs text-[#6C7280]">
                    Ative o Modo de Desenvolvedor no Discord para copiar IDs
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="discord-username" className="text-[#EDEDED]">
                    Nome de Usuário Discord *
                  </Label>
                  <Input
                    id="discord-username"
                    value={formData.discord_username}
                    onChange={(e) => setFormData({...formData, discord_username: e.target.value})}
                    placeholder="Ex: Jogador#1234"
                    className="input-dark"
                    data-testid="discord-username-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="character-name" className="text-[#EDEDED]">
                    Nome do Personagem *
                  </Label>
                  <Input
                    id="character-name"
                    value={formData.character_name}
                    onChange={(e) => setFormData({...formData, character_name: e.target.value})}
                    placeholder="Ex: Valerius, o Paladino"
                    className="input-dark"
                    data-testid="character-name-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="character-role" className="text-[#EDEDED]">
                    Função/Classe
                  </Label>
                  <Input
                    id="character-role"
                    value={formData.character_role}
                    onChange={(e) => setFormData({...formData, character_role: e.target.value})}
                    placeholder="Ex: Tanque/Curador"
                    className="input-dark"
                    data-testid="character-role-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="avatar-url" className="text-[#EDEDED]">
                    URL do Avatar
                  </Label>
                  <Input
                    id="avatar-url"
                    value={formData.avatar_url}
                    onChange={(e) => setFormData({...formData, avatar_url: e.target.value})}
                    placeholder="https://..."
                    className="input-dark"
                    data-testid="avatar-url-input"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="border-white/10 text-[#A0A5B5] hover:bg-[#1A1B23]"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit}
                  className="btn-gold"
                  data-testid="save-mapping-btn"
                >
                  {editingId ? "Atualizar" : "Criar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Mappings Table */}
        <Card className="card-rpg">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-[#EDEDED] font-['Playfair_Display'] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#D4AF37]" />
              De-Para: Discord → Personagem
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {mappings.length > 0 ? (
              <Table className="table-dark">
                <TableHeader>
                  <TableRow>
                    <TableHead>Avatar</TableHead>
                    <TableHead>Discord</TableHead>
                    <TableHead>Personagem</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((mapping) => (
                    <TableRow 
                      key={mapping.id}
                      data-testid={`mapping-row-${mapping.id}`}
                    >
                      <TableCell>
                        <Avatar className="h-10 w-10 border border-white/10">
                          <AvatarImage src={mapping.avatar_url} />
                          <AvatarFallback className="bg-[#D4AF37]/10 text-[#D4AF37]">
                            {getInitials(mapping.character_name)}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-[#EDEDED] font-medium">
                            {mapping.discord_username}
                          </p>
                          <p className="text-xs text-[#6C7280] font-mono">
                            ID: {mapping.discord_user_id}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Sword className="w-4 h-4 text-[#D4AF37]" />
                          <span className="text-[#EDEDED] font-semibold">
                            {mapping.character_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-[#A0A5B5]">
                          {mapping.character_role || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEdit(mapping)}
                            className="text-[#6C7280] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10"
                            data-testid={`edit-mapping-${mapping.id}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(mapping.id)}
                            className="text-[#6C7280] hover:text-[#8C1C13] hover:bg-[#8C1C13]/10"
                            data-testid={`delete-mapping-${mapping.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center">
                <UserCircle className="w-16 h-16 text-[#6C7280] mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[#EDEDED] font-['Playfair_Display'] mb-2">
                  Nenhum mapeamento ainda
                </h3>
                <p className="text-[#A0A5B5] mb-6 max-w-md mx-auto">
                  Adicione mapeamentos para que as transcrições usem automaticamente os nomes dos personagens.
                </p>
                <Button 
                  onClick={() => setDialogOpen(true)}
                  className="btn-gold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Mapeamento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="card-rpg mt-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-[#EDEDED] font-['Playfair_Display'] mb-4">
              Como obter o Discord User ID?
            </h3>
            <ol className="space-y-3 text-[#A0A5B5]">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-sm flex items-center justify-center font-semibold">1</span>
                <span>Abra as Configurações do Discord (ícone de engrenagem)</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-sm flex items-center justify-center font-semibold">2</span>
                <span>Vá em "Avançado" e ative o "Modo de Desenvolvedor"</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-sm flex items-center justify-center font-semibold">3</span>
                <span>Clique com o botão direito no usuário e selecione "Copiar ID"</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CharacterMappings;
