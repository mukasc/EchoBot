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

const CreateSessionDialog = ({ open, onOpenChange, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: "",
    game_system: "D&D 5e",
    chunk_duration_minutes: 20
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ name: "", game_system: "D&D 5e", chunk_duration_minutes: 20 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-rpg-surface border-white/10 text-[#EDEDED]">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">Nova Sessão de RPG</DialogTitle>
          <DialogDescription className="text-[#A0A5B5]">
            Crie uma nova sessão para gravar e transcrever
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="session-name">Nome da Sessão</Label>
            <Input
              id="session-name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Ex: Sessão 01 - A Caverna do Dragão"
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
            <Label htmlFor="chunk-duration">Duração dos Blocos (minutos)</Label>
            <div className="flex items-center gap-4">
              <Input
                id="chunk-duration"
                type="number"
                min="5"
                max="30"
                value={formData.chunk_duration_minutes}
                onChange={(e) => setFormData({...formData, chunk_duration_minutes: parseInt(e.target.value) || 20})}
                className="input-dark w-24"
              />
              <span className="text-sm text-[#A0A5B5]">Sugestão: 20 min (Min: 5, Máx: 30)</span>
            </div>
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
              Criar Sessão
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSessionDialog;
