import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

const MappingDialog = ({ open, onOpenChange, onSubmit, editingMapping }) => {
  const [formData, setFormData] = useState({
    discord_user_id: "",
    discord_username: "",
    character_name: "",
    character_role: "",
    avatar_url: ""
  });

  useEffect(() => {
    if (editingMapping) {
      setFormData({
        discord_user_id: editingMapping.discord_user_id,
        discord_username: editingMapping.discord_username,
        character_name: editingMapping.character_name,
        character_role: editingMapping.character_role || "",
        avatar_url: editingMapping.avatar_url || ""
      });
    } else {
      setFormData({
        discord_user_id: "",
        discord_username: "",
        character_name: "",
        character_role: "",
        avatar_url: ""
      });
    }
  }, [editingMapping, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-rpg-surface border-white/10 text-[#EDEDED]">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">
            {editingMapping ? "Editar Mapeamento" : "Novo Mapeamento"}
          </DialogTitle>
          <DialogDescription className="text-[#A0A5B5]">
            Vincule um usuário do Discord a um personagem de RPG
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="discord-id" className="text-[#EDEDED]">Discord User ID *</Label>
            <Input
              id="discord-id"
              value={formData.discord_user_id}
              onChange={(e) => setFormData({...formData, discord_user_id: e.target.value})}
              placeholder="Ex: 123456789012345678"
              className="input-dark"
              required
            />
            <p className="text-xs text-[#6C7280]">Ative o Modo de Desenvolvedor no Discord para copiar IDs</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="discord-username" className="text-[#EDEDED]">Nome de Usuário Discord *</Label>
            <Input
              id="discord-username"
              value={formData.discord_username}
              onChange={(e) => setFormData({...formData, discord_username: e.target.value})}
              placeholder="Ex: Jogador#1234"
              className="input-dark"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="character-name" className="text-[#EDEDED]">Nome do Personagem *</Label>
            <Input
              id="character-name"
              value={formData.character_name}
              onChange={(e) => setFormData({...formData, character_name: e.target.value})}
              placeholder="Ex: Valerius, o Paladino"
              className="input-dark"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="character-role" className="text-[#EDEDED]">Função/Classe</Label>
            <Input
              id="character-role"
              value={formData.character_role}
              onChange={(e) => setFormData({...formData, character_role: e.target.value})}
              placeholder="Ex: Tanque/Curador"
              className="input-dark"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="avatar-url" className="text-[#EDEDED]">URL do Avatar</Label>
            <Input
              id="avatar-url"
              value={formData.avatar_url}
              onChange={(e) => setFormData({...formData, avatar_url: e.target.value})}
              placeholder="https://..."
              className="input-dark"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/10 text-[#A0A5B5] hover:bg-rpg-surface-hover"
            >
              Cancelar
            </Button>
            <Button type="submit" className="btn-gold">
              {editingMapping ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MappingDialog;
