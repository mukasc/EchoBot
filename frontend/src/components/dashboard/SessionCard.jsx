import { Link } from "react-router-dom";
import { Calendar, Clock, Trash2, ChevronRight } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";

const statusLabels = {
  recording: "Gravando",
  transcribing: "Transcrevendo",
  processing: "Processando",
  awaiting_review: "Aguardando Revisão",
  completed: "Concluída"
};

const SessionCard = ({ session, onDelete }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Tem certeza que deseja excluir esta sessão?")) {
      onDelete(session.id);
    }
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
          
          <button
            onClick={handleDelete}
            className="absolute top-3 left-3 p-2 rounded-lg bg-rpg-void/80 text-[#6C7280] hover:text-red-500 hover:bg-rpg-void transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
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
            <Badge variant="outline" className="text-[#A0A5B5] border-white/10">
              {session.game_system}
            </Badge>
            <ChevronRight className="w-5 h-5 text-[#6C7280] group-hover:text-rpg-gold transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default SessionCard;
