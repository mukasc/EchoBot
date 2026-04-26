import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, Trash2, ChevronRight, Copy, Check, Hash } from "lucide-react";
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

const statusLabels = {
  recording: "Gravando",
  transcribing: "Transcrevendo",
  processing: "Processando",
  awaiting_review: "Aguardando Revisão",
  completed: "Concluída"
};

const SessionCard = ({ session, onDelete }) => {
  const [copied, setCopied] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
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
    toast.success("ID da sessão copiado!");
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
            {statusLabels[session.status] || session.status}
          </Badge>
          
          <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="p-2 rounded-lg bg-rpg-void/80 text-[#6C7280] hover:text-red-500 hover:bg-rpg-void transition-colors"
                    aria-label="Excluir sessão"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-rpg-surface border-white/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-[#EDEDED] font-serif">Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription className="text-[#A0A5B5]">
                      Tem certeza que deseja excluir a sessão "{session.name}"? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-transparent border-white/10 text-[#A0A5B5] hover:bg-white/5">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-500 text-white border-none">Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            
            <button
              onClick={handleCopyId}
              className={`p-2 rounded-lg bg-rpg-void/80 transition-colors ${copied ? 'text-green-500' : 'text-[#6C7280] hover:text-rpg-gold hover:bg-rpg-void'}`}
              aria-label="Copiar ID da sessão"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold text-[#EDEDED] font-serif mb-2 line-clamp-2 group-hover:text-rpg-gold transition-colors">
            {session.name}
          </h3>
          
          <div className="flex items-center gap-4 text-sm text-[#6C7280] mb-4">
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
              <Badge variant="outline" className="text-[#A0A5B5] border-white/10">
                {session.game_system}
              </Badge>
              <button 
                onClick={handleCopyId}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 border ${
                  copied 
                    ? 'bg-green-500/10 border-green-500/50 text-green-500' 
                    : 'bg-white/5 border-white/10 text-[#A0A5B5] hover:bg-rpg-gold/10 hover:border-rpg-gold/30 hover:text-rpg-gold shadow-sm'
                }`}
                aria-label="Copiar ID da sessão"
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

export default SessionCard;
