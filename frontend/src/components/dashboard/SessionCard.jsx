import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, Trash2, ChevronRight, Copy, Check } from "lucide-react";
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

const SessionCard = ({ session, onDelete }) => {
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language, {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const handleDelete = () => {
    onDelete(session.id);
  };

  const handleCopyId = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(session.id);
    setCopied(true);
    toast.success(t('components.sessionCard.idCopied'));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Link to={`/session/${session.id}`}>
      <Card className="card-rpg group cursor-pointer h-full overflow-hidden">
        <div className="relative h-32">
          <img
            src={session.cover_image_url || "https://images.pexels.com/photos/7150642/pexels-photo-7150642.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"}
            alt={session.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-rpg-surface to-transparent" />
          
          <Badge className={`absolute top-3 right-3 text-[10px] font-bold status-${session.status}`}>
            {t(`session.status.${session.status}`, { defaultValue: session.status })}
          </Badge>
          
          <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="p-2 rounded-lg bg-rpg-void/80 text-[var(--muted-foreground)] hover:text-red-500 hover:bg-rpg-void transition-colors"
                    aria-label={t('components.sessionCard.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-rpg-surface border-border text-[var(--foreground)]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-[var(--foreground)] font-serif">
                      {t('components.sessionCard.confirmDeleteTitle')}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-[var(--muted-foreground)]">
                      {t('components.sessionCard.confirmDeleteDesc', { name: session.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-transparent border-border text-[var(--muted-foreground)] hover:bg-white/5">
                      {t('components.sessionCard.cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-500 text-white border-none">
                      {t('components.sessionCard.confirmDelete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            
            <button
              onClick={handleCopyId}
              className={`p-2 rounded-lg bg-rpg-void/80 transition-colors ${copied ? 'text-green-500' : 'text-[var(--muted-foreground)] hover:text-primary hover:bg-rpg-void'}`}
              aria-label={t('components.sessionCard.copyId')}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold text-[var(--foreground)] font-serif mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {session.name}
          </h3>
          
          <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)] mb-4">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(session.created_at)}
            </span>
            {session.duration_minutes && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {session.duration_minutes} min
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Badge variant="outline" className="text-[var(--muted-foreground)] border-border">
                {session.game_system}
              </Badge>
              <button 
                onClick={handleCopyId}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 border ${
                  copied 
                    ? 'bg-green-500/10 border-green-500/50 text-green-500' 
                    : 'bg-white/5 border-border text-[var(--muted-foreground)] hover:bg-primary/10 hover:border-primary/30 hover:text-primary shadow-sm'
                }`}
                aria-label={t('components.sessionCard.copyId')}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? t('components.sessionCard.copied') : t('components.sessionCard.copyId')}
              </button>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)] group-hover:text-primary transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default SessionCard;

