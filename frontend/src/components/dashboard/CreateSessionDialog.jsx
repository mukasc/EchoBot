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
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const CreateSessionDialog = ({ open, onOpenChange, onSubmit }) => {
  const { t } = useTranslation();
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
      <DialogContent className="bg-rpg-surface border-border text-[var(--foreground)]">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">{t('components.createSession.title')}</DialogTitle>
          <DialogDescription className="text-[var(--muted-foreground)]">
            {t('components.createSession.subtitle')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="session-name">{t('components.createSession.sessionName')}</Label>
            <Input
              id="session-name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder={t('components.createSession.sessionNamePlaceholder')}
              className="input-dark"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="game-system">{t('components.createSession.gameSystem')}</Label>
            <Select
              value={formData.game_system}
              onValueChange={(value) => setFormData({...formData, game_system: value})}
            >
              <SelectTrigger className="input-dark">
                <SelectValue placeholder={t('components.createSession.selectSystem')} />
              </SelectTrigger>
              <SelectContent className="bg-rpg-surface border-border">
                {["dnd5e", "pf2e", "cthulhu", "t20", "vtm", "other"].map(s => (
                  <SelectItem key={s} value={t(`common.systems.${s}`)}>{t(`common.systems.${s}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="chunk-duration">{t('components.createSession.chunkDuration')}</Label>
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
              <span className="text-sm text-[var(--muted-foreground)]">{t('components.createSession.chunkDurationHint')}</span>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border text-[var(--muted-foreground)] hover:bg-rpg-surface-hover"
            >
              {t('components.createSession.cancel')}
            </Button>
            <Button type="submit" className="btn-gold">
              {t('components.createSession.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSessionDialog;

