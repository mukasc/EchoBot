import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Trash2, ChevronRight, Copy, Check } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const CampaignCard = ({ campaign, onDelete }) => {
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language, {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const handleDelete = () => {
    onDelete(campaign.id);
  };

  const handleCopyId = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(campaign.id);
    setCopied(true);
    toast.success(t('components.campaignCard.idCopied'));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Link to={`/campaign/${campaign.id}`}>
      <Card className="card-rpg group cursor-pointer h-full overflow-hidden">
        <div className="relative h-32">
          <img
            src={campaign.cover_image_url || "https://images.pexels.com/photos/7150642/pexels-photo-7150642.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"}
            alt={campaign.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-rpg-surface to-transparent" />
          
          <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="p-2 rounded-lg bg-rpg-void/80 text-[var(--muted-foreground)] hover:text-red-500 hover:bg-rpg-void transition-colors"
                    aria-label={t('components.campaignCard.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-rpg-surface border-border text-[var(--foreground)]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-[var(--foreground)] font-serif">
                      {t('components.campaignCard.confirmDeleteTitle')}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-[var(--muted-foreground)]">
                      {t('components.campaignCard.confirmDeleteDesc', { name: campaign.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-transparent border-border text-[var(--muted-foreground)] hover:bg-white/5">
                      {t('components.campaignCard.cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-500 text-white border-none">
                      {t('components.campaignCard.confirmDelete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
        
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold text-[var(--foreground)] font-serif mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {campaign.name}
          </h3>
          
          {campaign.description && (
            <p className="text-sm text-[var(--muted-foreground)] line-clamp-2 mb-4">
              {campaign.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)] mb-4">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(campaign.created_at)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Badge variant="outline" className="text-[var(--muted-foreground)] border-border">
                {campaign.game_system}
              </Badge>
              <button 
                onClick={handleCopyId}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 border ${
                  copied 
                    ? 'bg-green-500/10 border-green-500/50 text-green-500' 
                    : 'bg-white/5 border-border text-[var(--muted-foreground)] hover:bg-primary/10 hover:border-primary/30 hover:text-primary shadow-sm'
                }`}
                aria-label={t('components.campaignCard.copyId')}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? t('components.campaignCard.copied') : t('components.campaignCard.copyId')}
              </button>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)] group-hover:text-primary transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default CampaignCard;

