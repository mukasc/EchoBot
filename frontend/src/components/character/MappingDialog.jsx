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
import { useTranslation } from "react-i18next";

const MappingDialog = ({ open, onOpenChange, onSubmit, editingMapping }) => {
  const { t } = useTranslation();
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
      <DialogContent className="bg-rpg-surface border-border text-[var(--foreground)]">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">
            {editingMapping ? t('characterMappings.dialog.editTitle') : t('characterMappings.dialog.newTitle')}
          </DialogTitle>
          <DialogDescription className="text-[var(--muted-foreground)]">
            {t('characterMappings.dialog.desc')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="discord-id" className="text-[var(--foreground)]">{t('characterMappings.dialog.discordIdLabel')}</Label>
            <Input
              id="discord-id"
              value={formData.discord_user_id}
              onChange={(e) => setFormData({...formData, discord_user_id: e.target.value})}
              placeholder="Ex: 123456789012345678"
              className="input-dark"
              required
            />
            <p className="text-xs text-[var(--muted-foreground)]">{t('characterMappings.dialog.discordIdHint')}</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="discord-username" className="text-[var(--foreground)]">{t('characterMappings.dialog.usernameLabel')}</Label>
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
            <Label htmlFor="character-name" className="text-[var(--foreground)]">{t('characterMappings.dialog.characterNameLabel')}</Label>
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
            <Label htmlFor="character-role" className="text-[var(--foreground)]">{t('characterMappings.dialog.roleLabel')}</Label>
            <Input
              id="character-role"
              value={formData.character_role}
              onChange={(e) => setFormData({...formData, character_role: e.target.value})}
              placeholder="Ex: Tanque/Curador"
              className="input-dark"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="avatar-url" className="text-[var(--foreground)]">{t('characterMappings.dialog.avatarUrlLabel')}</Label>
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
              className="border-border text-[var(--muted-foreground)] hover:bg-rpg-surface-hover"
            >
              {t('characterMappings.dialog.cancel')}
            </Button>
            <Button type="submit" className="btn-gold">
              {editingMapping ? t('characterMappings.dialog.update') : t('characterMappings.dialog.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MappingDialog;

