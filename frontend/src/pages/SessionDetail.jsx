import { useParams, useNavigate } from "react-router-dom";
import { Loader2, MessageSquare, Package, Edit3, ChevronLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useTranslation } from "react-i18next";

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
  const navigate = useNavigate();
  const { t } = useTranslation();
  
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
    deleteSegment,
    bulkDeleteSegments,
    markAsCompleted,
    generateNarration,
    reprocessTranscription,
    exportMarkdown,
    exportPDF,
    exportNotion,
    findReplace
  } = useSession(id);
  
  const { getSpeakerInfo, loading: mappingsLoading } = useCharacterMappings();

  if (sessionLoading || mappingsLoading) {
    return (
      <div className="min-h-screen bg-rpg-void flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-rpg-void">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <button 
          onClick={() => navigate(session.campaign_id ? `/campaign/${session.campaign_id}` : "/")}
          className="flex items-center text-[var(--muted-foreground)] hover:text-primary transition-colors mb-6 text-sm"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> {session.campaign_id ? t('session.backToCampaign') : t('session.backToHome')}
        </button>

        <SessionHeader 
          session={session}
          saving={saving}
          processing={processing}
          uploading={uploading}
          onUpdate={updateSession}
          onUpload={uploadAudio}
          onProcess={processWithAI}
          onComplete={markAsCompleted}
          onReprocess={reprocessTranscription}
          onExportMD={exportMarkdown}
          onExportPDF={exportPDF}
          onExportNotion={exportNotion}
          onFindReplace={findReplace}
        />


        <Tabs defaultValue="transcription" className="space-y-6">
          <TabsList className="bg-rpg-surface border border-border p-1">
            <TabsTrigger 
              value="transcription"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {t('session.transcription')}
            </TabsTrigger>
            <TabsTrigger 
              value="diary"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <Package className="w-4 h-4 mr-2" />
              {t('session.technicalDiary')}
            </TabsTrigger>
            <TabsTrigger 
              value="script"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              {t('session.reviewScript')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transcription">
            <TranscriptionView 
              segments={session.transcription_segments}
              getSpeakerInfo={getSpeakerInfo}
              onUpdateSegment={updateSegment}
              onDeleteSegment={deleteSegment}
              onBulkDeleteSegments={bulkDeleteSegments}
              onUploadClick={() => document.querySelector('input[type="file"]')?.click()}
            />
          </TabsContent>

          <TabsContent value="diary">
            <TechnicalDiary 
              entries={session.technical_diary} 
              metadata={session.diary_metadata}
              onRegenerate={() => processWithAI({ scope: 'diary' })}
              processing={processing}
              onExportMD={exportMarkdown}
              onExportPDF={exportPDF}
              onExportNotion={exportNotion}
            />
          </TabsContent>

          <TabsContent value="script">
            <ReviewScript 
              initialScript={session.review_script}
              narrationUrl={session.narration_audio_url}
              metadata={session.review_metadata}
              initialMusic={session.selected_music}
              onSave={updateSession}
              onGenerateNarration={generateNarration}
              onRegenerateScript={() => processWithAI({ scope: 'script' })}
              onExportMD={exportMarkdown}
              onExportPDF={exportPDF}
              onExportNotion={exportNotion}
              saving={saving}
              processing={processing}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SessionDetail;

