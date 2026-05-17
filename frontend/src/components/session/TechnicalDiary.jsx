import { Package, User, MapPin, Zap, Star, FileCode, FileText, ExternalLink, RefreshCw, Loader2, Target, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";

const categoryIcons = {
  npc: User,
  location: MapPin,
  item: Package,
  xp: Star,
  event: Zap,
  quest: Target,
  interaction: Users
};

const questStatusStyles = {
  active: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  failed: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  abandoned: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20",
  ativa: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  concluída: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  concluida: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  falha: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  abandonada: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
};

const getQuestStatusClass = (status) => {
  if (!status) return questStatusStyles.active;
  return questStatusStyles[status.toLowerCase()] || questStatusStyles.active;
};

const playerBadgeClass = "bg-sky-500/10 text-sky-400 border border-sky-500/20";

const TechnicalDiary = ({ entries, metadata, onRegenerate, processing, onExportMD, onExportPDF, onExportNotion }) => {
  const { t } = useTranslation();

  return (
    <Card className="card-rpg">
      <CardHeader className="border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-[var(--foreground)] font-serif flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            {t('components.technicalDiary.title')}
          </CardTitle>
          {metadata && (
            <div className="flex items-center gap-2 ml-7">
              <span className="text-[10px] text-[var(--muted-foreground)] uppercase">{t('components.technicalDiary.processedBy')}</span>
              <Badge variant="outline" className="text-[10px] bg-white/5 border-border text-[var(--muted-foreground)] capitalize">
                {metadata.provider} • {metadata.model}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {entries?.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={processing}
              className="border-primary/30 text-primary hover:bg-primary/5 h-8 bg-primary/5 transition-all duration-300 hover:shadow-[0_0_15px_rgba(197,160,89,0.2)] hover:border-primary/50"
              title={t('components.technicalDiary.regenerateDesc')}
            >
              {processing ? (
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 mr-2" />
              )}
              {t('components.technicalDiary.regenerateDiary')}
            </Button>
          )}
          <div className="h-4 w-px bg-border mx-1" />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onExportMD}
            className="h-8 border-border text-[var(--muted-foreground)] hover:text-primary hover:border-primary/50"
            title={t('components.technicalDiary.exportMD')}
          >
            <FileCode className="w-3.5 h-3.5 mr-1.5" />
            MD
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onExportPDF}
            className="h-8 border-border text-[var(--muted-foreground)] hover:text-primary hover:border-primary/50"
            title={t('components.technicalDiary.exportPDF')}
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            PDF
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onExportNotion}
            className="h-8 border-border text-[var(--muted-foreground)] hover:text-primary hover:border-primary/50"
            title={t('components.technicalDiary.syncNotion')}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Notion
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {entries?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map((entry, index) => {
              const Icon = categoryIcons[entry.category] || Zap;
              return (
                <Card key={entry.id || index} className="bg-rpg-surface-hover border-white/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge className="text-xs bg-rpg-surface-active text-[var(--muted-foreground)] border-0">
                            {t(`session.diaryCategory.${entry.category}`, { defaultValue: entry.category })}
                          </Badge>
                          {entry.category === "quest" && (
                            <Badge className={`text-[10px] uppercase font-bold tracking-wider ${getQuestStatusClass(entry.status)}`}>
                              {entry.status || "Ativa"}
                            </Badge>
                          )}
                          {entry.category === "interaction" && entry.player_name && (
                            <Badge className={`text-[10px] uppercase font-bold tracking-wider ${playerBadgeClass}`}>
                              {entry.player_name}
                            </Badge>
                          )}
                        </div>
                        <h4 className="text-[var(--foreground)] font-semibold truncate">
                          {entry.name}
                        </h4>
                        {entry.description && (
                          <p className="text-sm text-[var(--muted-foreground)] mt-1 line-clamp-2">
                            {entry.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
            <p className="text-[var(--muted-foreground)]">{t('components.technicalDiary.empty')}</p>
            <p className="text-sm text-[var(--muted-foreground)] mt-2">
              {t('components.technicalDiary.emptyDesc')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TechnicalDiary;

