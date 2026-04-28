import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Trash2, ChevronRight, Copy, Check, Hash, Layout } from "lucide-react";
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

const CampaignCard = ({ campaign, onDelete }) => {
  const [copied, setCopied] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
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
    toast.success("ID da campanha copiado!");
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
                    className="p-2 rounded-lg bg-rpg-void/80 text-[#6C7280] hover:text-red-500 hover:bg-rpg-void transition-colors"
                    aria-label="Excluir campanha"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-rpg-surface border-white/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-[#EDEDED] font-serif">Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription className="text-[#A0A5B5]">
                      Tem certeza que deseja excluir a campanha "{campaign.name}"? As sessões associadas podem ser afetadas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-transparent border-white/10 text-[#A0A5B5] hover:bg-white/5">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-500 text-white border-none">Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
        
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold text-[#EDEDED] font-serif mb-2 line-clamp-2 group-hover:text-rpg-gold transition-colors">
            {campaign.name}
          </h3>
          
          {campaign.description && (
            <p className="text-sm text-[#A0A5B5] line-clamp-2 mb-4">
              {campaign.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-[#6C7280] mb-4">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(campaign.created_at)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Badge variant="outline" className="text-[#A0A5B5] border-white/10">
                {campaign.game_system}
              </Badge>
              <button 
                onClick={handleCopyId}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 border ${
                  copied 
                    ? 'bg-green-500/10 border-green-500/50 text-green-500' 
                    : 'bg-white/5 border-white/10 text-[#A0A5B5] hover:bg-rpg-gold/10 hover:border-rpg-gold/30 hover:text-rpg-gold shadow-sm'
                }`}
                aria-label="Copiar ID da campanha"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copiado!' : 'Copiar ID'}
              </button>
            </div>
            <ChevronRight className="w-5 h-5 text-[#6C7280] group-hover:text-rpg-gold transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default CampaignCard;
