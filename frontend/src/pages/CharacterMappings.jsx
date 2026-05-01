import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useTranslation } from "react-i18next";

// Custom Hooks
import { useCharacterMappings } from "../hooks/useCharacterMappings";

// Components
import MappingTable from "../components/character/MappingTable";
import MappingDialog from "../components/character/MappingDialog";

const CharacterMappings = () => {
  const { t } = useTranslation();
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
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rpg-void bg-pattern">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] font-serif">
              {t('characterMappings.title')}
            </h1>
            <p className="text-[var(--muted-foreground)] mt-1">
              {t('characterMappings.subtitle')}
            </p>
          </div>
          
          <Button onClick={handleCreateNew} className="btn-gold">
            <Plus className="w-4 h-4 mr-2" />
            {t('characterMappings.newMapping')}
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
            <h3 className="text-lg font-semibold text-[var(--foreground)] font-serif mb-4">
              {t('characterMappings.getDiscordIdTitle')}
            </h3>
            <ol className="space-y-3 text-[var(--muted-foreground)]">
              {t('characterMappings.howToSteps', { returnObjects: true }).map((step, i) => (
                <li key={i} className={`flex gap-3 animate-in-slide-up delay-${(i + 1) * 100}`}>
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center font-semibold">
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

