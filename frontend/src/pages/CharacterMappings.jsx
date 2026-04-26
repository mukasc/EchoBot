import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

// Custom Hooks
import { useCharacterMappings } from "../hooks/useCharacterMappings";

// Components
import MappingTable from "../components/character/MappingTable";
import MappingDialog from "../components/character/MappingDialog";

const CharacterMappings = () => {
  const { 
    mappings, 
    loading, 
    saveMapping, 
    deleteMapping 
  } = useCharacterMappings();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);

  const handleCreateNew = () => {
    setEditingMapping(null);
    setDialogOpen(true);
  };

  const handleEdit = (mapping) => {
    setEditingMapping(mapping);
    setDialogOpen(true);
  };

  const handleSubmit = async (formData) => {
    await saveMapping(formData, editingMapping?.id);
    setDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-rpg-void flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-rpg-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rpg-void bg-pattern">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#EDEDED] font-serif">
              Mapeamento de Personagens
            </h1>
            <p className="text-[#A0A5B5] mt-1">
              Vincule usuários do Discord aos seus personagens
            </p>
          </div>
          
          <Button onClick={handleCreateNew} className="btn-gold">
            <Plus className="w-4 h-4 mr-2" />
            Novo Mapeamento
          </Button>
        </div>

        <MappingTable 
          mappings={mappings} 
          onEdit={handleEdit} 
          onDelete={deleteMapping}
          onCreateClick={handleCreateNew}
        />

        <MappingDialog 
          open={dialogOpen} 
          onOpenChange={setDialogOpen} 
          onSubmit={handleSubmit}
          editingMapping={editingMapping}
        />

        {/* Instructions */}
        <Card className="card-rpg mt-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-[#EDEDED] font-serif mb-4">
              Como obter o Discord User ID?
            </h3>
            <ol className="space-y-3 text-[#A0A5B5]">
              {["Abra as Configurações do Discord (ícone de engrenagem)", "Vá em \"Avançado\" e ative o \"Modo de Desenvolvedor\"", "Clique com o botão direito no usuário e selecione \"Copiar ID\""].map((step, i) => (
                <li key={i} className={`flex gap-3 animate-in-slide-up delay-${(i + 1) * 100}`}>
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-rpg-gold/10 text-rpg-gold text-sm flex items-center justify-center font-semibold">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CharacterMappings;
