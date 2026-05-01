import { Users, Edit3, Trash2, Sword, UserCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

const MappingTable = ({ mappings, onEdit, onDelete, onCreateClick }) => {
  const { t } = useTranslation();
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
      <CardHeader className="border-b border-border">
        <CardTitle className="text-[var(--foreground)] font-serif flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {t('characterMappings.mappingTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {mappings.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-[var(--muted-foreground)]">{t('characterMappings.table.avatar')}</TableHead>
                <TableHead className="text-[var(--muted-foreground)]">{t('characterMappings.table.discordUser')}</TableHead>
                <TableHead className="text-[var(--muted-foreground)]">{t('characterMappings.table.character')}</TableHead>
                <TableHead className="text-[var(--muted-foreground)]">{t('characterMappings.table.role')}</TableHead>
                <TableHead className="text-right text-[var(--muted-foreground)]">{t('characterMappings.table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((mapping) => (
                <TableRow key={mapping.id} className="border-white/5 hover:bg-rpg-surface-hover/50">
                  <TableCell>
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={mapping.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(mapping.character_name)}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-[var(--foreground)] font-medium">{mapping.discord_username}</p>
                      <p className="text-xs text-[var(--muted-foreground)] font-mono">ID: {mapping.discord_user_id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Sword className="w-4 h-4 text-primary" />
                      <span className="text-[var(--foreground)] font-semibold">{mapping.character_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[var(--muted-foreground)]">{mapping.character_role || "—"}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(mapping)}
                        className="text-[var(--muted-foreground)] hover:text-primary hover:bg-primary/10"
                      >
                        <Trash2 className="w-4 h-4 sr-only" /> {/* Accessibility only */}
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(mapping.id)}
                        className="text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10"
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
            <UserCircle className="w-16 h-16 text-[var(--muted-foreground)] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[var(--foreground)] font-serif mb-2">
              {t('characterMappings.noMappings')}
            </h3>
            <p className="text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
              {t('characterMappings.noMappingsDesc')}
            </p>
            <Button onClick={onCreateClick} className="btn-gold">
              {t('characterMappings.createFirst')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MappingTable;

