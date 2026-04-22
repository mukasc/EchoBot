import { Users, Edit3, Trash2, Sword, UserCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

const MappingTable = ({ mappings, onEdit, onDelete, onCreateClick }) => {
  const getInitials = (name) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="card-rpg">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-[#EDEDED] font-serif flex items-center gap-2">
          <Users className="w-5 h-5 text-rpg-gold" />
          De-Para: Discord → Personagem
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {mappings.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-[#A0A5B5]">Avatar</TableHead>
                <TableHead className="text-[#A0A5B5]">Discord</TableHead>
                <TableHead className="text-[#A0A5B5]">Personagem</TableHead>
                <TableHead className="text-[#A0A5B5]">Função</TableHead>
                <TableHead className="text-right text-[#A0A5B5]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((mapping) => (
                <TableRow key={mapping.id} className="border-white/5 hover:bg-rpg-surface-hover/50">
                  <TableCell>
                    <Avatar className="h-10 w-10 border border-white/10">
                      <AvatarImage src={mapping.avatar_url} />
                      <AvatarFallback className="bg-rpg-gold/10 text-rpg-gold">
                        {getInitials(mapping.character_name)}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-[#EDEDED] font-medium">{mapping.discord_username}</p>
                      <p className="text-xs text-[#6C7280] font-mono">ID: {mapping.discord_user_id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Sword className="w-4 h-4 text-rpg-gold" />
                      <span className="text-[#EDEDED] font-semibold">{mapping.character_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[#A0A5B5]">{mapping.character_role || "—"}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(mapping)}
                        className="text-[#6C7280] hover:text-rpg-gold hover:bg-rpg-gold/10"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(mapping.id)}
                        className="text-[#6C7280] hover:text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-12 text-center">
            <UserCircle className="w-16 h-16 text-[#6C7280] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#EDEDED] font-serif mb-2">
              Nenhum mapeamento ainda
            </h3>
            <p className="text-[#A0A5B5] mb-6 max-w-md mx-auto">
              Adicione mapeamentos para que as transcrições usem automaticamente os nomes dos personagens.
            </p>
            <Button onClick={onCreateClick} className="btn-gold">
              Criar Primeiro Mapeamento
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MappingTable;
