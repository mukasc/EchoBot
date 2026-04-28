import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";

const CreateCampaignDialog = ({ open, onOpenChange, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: "",
    game_system: "D&D 5e",
    description: "",
    cover_image_url: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ name: "", game_system: "D&D 5e", description: "", cover_image_url: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-rpg-surface border-white/10 text-[#EDEDED]">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">Nova Campanha de RPG</DialogTitle>
          <DialogDescription className="text-[#A0A5B5]">
            Crie uma nova campanha para agrupar suas sessões e diários
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="campaign-name">Nome da Campanha</Label>
            <Input
              id="campaign-name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Ex: A Maldição de Strahd"
              className="input-dark"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="game-system">Sistema de Jogo</Label>
            <Select
              value={formData.game_system}
              onValueChange={(value) => setFormData({...formData, game_system: value})}
            >
              <SelectTrigger className="input-dark">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-rpg-surface border-white/10">
                {["D&D 5e", "Pathfinder 2e", "Call of Cthulhu", "Tormenta 20", "Vampiro: A Máscara", "Outro"].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-description">Descrição (opcional)</Label>
            <Textarea
              id="campaign-description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Uma breve descrição da sua aventura..."
              className="input-dark resize-none h-20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-image">URL da Capa (opcional)</Label>
            <Input
              id="campaign-image"
              value={formData.cover_image_url}
              onChange={(e) => setFormData({...formData, cover_image_url: e.target.value})}
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
              Criar Campanha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCampaignDialog;
