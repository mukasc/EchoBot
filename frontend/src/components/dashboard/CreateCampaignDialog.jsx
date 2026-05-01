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
import { Textarea } from "../ui/textarea";

const CreateCampaignDialog = ({ open, onOpenChange, onSubmit }) => {
  const { t } = useTranslation();
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
      <DialogContent className="bg-rpg-surface border-border text-[var(--foreground)]">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">{t('components.createCampaign.title')}</DialogTitle>
          <DialogDescription className="text-[var(--muted-foreground)]">
            {t('components.createCampaign.subtitle')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="campaign-name">{t('components.createCampaign.name')}</Label>
            <Input
              id="campaign-name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder={t('components.createCampaign.namePlaceholder')}
              className="input-dark"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="game-system">{t('components.createCampaign.gameSystem')}</Label>
            <Select
              value={formData.game_system}
              onValueChange={(value) => setFormData({...formData, game_system: value})}
            >
              <SelectTrigger className="input-dark">
                <SelectValue placeholder={t('components.createCampaign.selectSystem')} />
              </SelectTrigger>
              <SelectContent className="bg-rpg-surface border-border">
                {["dnd5e", "pf2e", "cthulhu", "t20", "vtm", "other"].map(s => (
                  <SelectItem key={s} value={t(`common.systems.${s}`)}>{t(`common.systems.${s}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-description">{t('components.createCampaign.description')}</Label>
            <Textarea
              id="campaign-description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder={t('components.createCampaign.descriptionPlaceholder')}
              className="input-dark resize-none h-20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-image">{t('components.createCampaign.imageUrl')}</Label>
            <Input
              id="campaign-image"
              value={formData.cover_image_url}
              onChange={(e) => setFormData({...formData, cover_image_url: e.target.value})}
              placeholder={t('components.createCampaign.imageUrlPlaceholder')}
              className="input-dark"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border text-[var(--muted-foreground)] hover:bg-rpg-surface-hover"
            >
              {t('components.createCampaign.cancel')}
            </Button>
            <Button type="submit" className="btn-gold">
              {t('components.createCampaign.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCampaignDialog;

