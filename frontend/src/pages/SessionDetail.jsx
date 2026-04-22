import { useParams } from "react-router-dom";
import { Loader2, MessageSquare, Package, Edit3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

// Custom Hooks
import { useSession } from "../hooks/useSession";
import { useCharacterMappings } from "../hooks/useCharacterMappings";

// Components
import SessionHeader from "../components/session/SessionHeader";
import TranscriptionView from "../components/session/TranscriptionView";
import TechnicalDiary from "../components/session/TechnicalDiary";
import ReviewScript from "../components/session/ReviewScript";

const SessionDetail = () => {
  const { id } = useParams();
  
  // Logic extracted to custom hooks
  const { 
    session, 
    loading: sessionLoading, 
    saving, 
    processing, 
    uploading, 
    updateSession, 
    uploadAudio, 
    processWithAI, 
    updateSegment, 
    markAsCompleted 
  } = useSession(id);
  
  const { getSpeakerInfo, loading: mappingsLoading } = useCharacterMappings();

  if (sessionLoading || mappingsLoading) {
    return (
      <div className="min-h-screen bg-rpg-void flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-rpg-gold animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-rpg-void">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <SessionHeader 
          session={session}
          saving={saving}
          processing={processing}
          uploading={uploading}
          onUpdate={updateSession}
          onUpload={uploadAudio}
          onProcess={processWithAI}
          onComplete={markAsCompleted}
        />

        <Tabs defaultValue="transcription" className="space-y-6">
          <TabsList className="bg-rpg-surface border border-white/10 p-1">
            <TabsTrigger 
              value="transcription"
              className="data-[state=active]:bg-rpg-gold/10 data-[state=active]:text-rpg-gold"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Transcrição
            </TabsTrigger>
            <TabsTrigger 
              value="diary"
              className="data-[state=active]:bg-rpg-gold/10 data-[state=active]:text-rpg-gold"
            >
              <Package className="w-4 h-4 mr-2" />
              Diário Técnico
            </TabsTrigger>
            <TabsTrigger 
              value="script"
              className="data-[state=active]:bg-rpg-gold/10 data-[state=active]:text-rpg-gold"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Roteiro de Revisão
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transcription">
            <TranscriptionView 
              segments={session.transcription_segments}
              getSpeakerInfo={getSpeakerInfo}
              onUpdateSegment={updateSegment}
              onUploadClick={() => document.querySelector('input[type="file"]')?.click()}
            />
          </TabsContent>

          <TabsContent value="diary">
            <TechnicalDiary entries={session.technical_diary} />
          </TabsContent>

          <TabsContent value="script">
            <ReviewScript 
              initialScript={session.review_script}
              onSave={updateSession}
              saving={saving}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SessionDetail;
