import { Package, User, MapPin, Zap, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

const categoryIcons = {
  npc: User,
  location: MapPin,
  item: Package,
  xp: Star,
  event: Zap
};

const categoryLabels = {
  npc: "NPC",
  location: "Local",
  item: "Item",
  xp: "XP",
  event: "Evento"
};

const TechnicalDiary = ({ entries, metadata }) => {
  return (
    <Card className="card-rpg">
      <CardHeader className="border-b border-white/10 flex flex-row items-center justify-between">
        <CardTitle className="text-[#EDEDED] font-serif flex items-center gap-2">
          <Package className="w-5 h-5 text-rpg-gold" />
          Diário Técnico
        </CardTitle>
        {metadata && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#6C7280] uppercase">Processado por:</span>
            <Badge variant="outline" className="text-[10px] bg-white/5 border-white/10 text-[#A0A5B5] capitalize">
              {metadata.provider} • {metadata.model}
            </Badge>
          </div>
        )}
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
                      <div className="p-2 rounded-lg bg-rpg-gold/10">
                        <Icon className="w-4 h-4 text-rpg-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Badge className="text-xs mb-2 bg-rpg-surface-active text-[#A0A5B5] border-0">
                          {categoryLabels[entry.category]}
                        </Badge>
                        <h4 className="text-[#EDEDED] font-semibold truncate">
                          {entry.name}
                        </h4>
                        {entry.description && (
                          <p className="text-sm text-[#6C7280] mt-1 line-clamp-2">
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
            <Package className="w-12 h-12 text-[#6C7280] mx-auto mb-4" />
            <p className="text-[#A0A5B5]">Nenhuma entrada no diário técnico ainda.</p>
            <p className="text-sm text-[#6C7280] mt-2">
              Processe a transcrição com IA para gerar automaticamente.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TechnicalDiary;
