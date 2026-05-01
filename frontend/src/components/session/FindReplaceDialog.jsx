import React, { useState } from "react";
import { Search, Replace, AlertTriangle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";

const FindReplaceDialog = ({ isOpen, onClose, onConfirm, loading }) => {
  const { t } = useTranslation();
  const [findTerm, setFindTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);

  const handleConfirm = () => {
    if (!findTerm.trim()) return;
    onConfirm({
      find_term: findTerm,
      replace_term: replaceTerm,
      match_case: matchCase,
      whole_word: wholeWord,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-rpg-surface border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center text-primary">
            <Replace className="w-5 h-5 mr-2" />
            {t('session.findReplaceTitle', 'Ajuste Global de Termos')}
          </DialogTitle>
          <DialogDescription className="text-[var(--muted-foreground)]">
            {t('session.findReplaceDesc', 'Substitua termos em toda a Transcrição, Diário e Roteiro simultaneamente.')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="find" className="text-sm font-medium">
              {t('session.findLabel', 'Buscar por')}
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
              <Input
                id="find"
                placeholder={t('session.findPlaceholder', 'Ex: Orc')}
                value={findTerm}
                onChange={(e) => setFindTerm(e.target.value)}
                className="pl-9 bg-rpg-void border-border focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="replace" className="text-sm font-medium">
              {t('session.replaceLabel', 'Substituir por')}
            </Label>
            <div className="relative">
              <Replace className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
              <Input
                id="replace"
                placeholder={t('session.replacePlaceholder', 'Ex: Uruk-hai')}
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                className="pl-9 bg-rpg-void border-border focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <div className="flex items-center space-x-2 cursor-pointer">
              <Checkbox 
                id="matchCase" 
                checked={matchCase} 
                onCheckedChange={setMatchCase}
                className="border-primary data-[state=checked]:bg-primary"
              />
              <Label htmlFor="matchCase" className="text-sm cursor-pointer">
                {t('session.matchCase', 'Diferenciar maiúsculas/minúsculas')}
              </Label>
            </div>
            <div className="flex items-center space-x-2 cursor-pointer">
              <Checkbox 
                id="wholeWord" 
                checked={wholeWord} 
                onCheckedChange={setWholeWord}
                className="border-primary data-[state=checked]:bg-primary"
              />
              <Label htmlFor="wholeWord" className="text-sm cursor-pointer">
                {t('session.wholeWord', 'Palavra inteira')}
              </Label>
            </div>
          </div>

          <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md flex items-start">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mr-2 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-500/90 italic">
              {t('session.findReplaceWarning', 'Esta ação é definitiva e afetará todos os registros desta sessão.')}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {t('common.cancel', 'Cancelar')}
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!findTerm.trim() || loading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('session.replaceAll', 'Substituir Tudo')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FindReplaceDialog;
