import { useState, useEffect } from "react";
import { Bot, Shield, Mic, Check, Loader2, Save, Key, Server, Hash, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useTranslation } from "react-i18next";

// Custom Hooks
import { useBotSetup } from "../hooks/useBotSetup";
import { useSettings } from "../hooks/useSettings";

// Components
import StepCard from "../components/setup/StepCard";

const BotSetup = () => {
  const { t } = useTranslation();
  const { instructions, loading: instructionsLoading } = useBotSetup();
  const { settings, loading: settingsLoading, saving, saveSettings } = useSettings();

  const [showToken, setShowToken] = useState(false);
  const [formData, setFormData] = useState({
    discord_bot_token: "",
    discord_app_id: "",
    discord_guild_id: ""
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        discord_bot_token: settings.discord_bot_token || "",
        discord_app_id: settings.discord_app_id || "",
        discord_guild_id: settings.discord_guild_id || ""
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await saveSettings({
        ...settings,
        discord_bot_token: formData.discord_bot_token,
        discord_app_id: formData.discord_app_id,
        discord_guild_id: formData.discord_guild_id
      });
    } catch (error) {
      console.error(t('botSetup.errorSave'), error);
    }
  };

  if (instructionsLoading || settingsLoading) {
    return (
      <div className="min-h-screen bg-rpg-void flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rpg-void bg-pattern">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-primary/10">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] font-serif">
                {instructions?.title || t('botSetup.title')}
              </h1>
              <p className="text-[var(--muted-foreground)] mt-1">
                {t('botSetup.instructionsSubtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Section */}
        <Card className="card-rpg mb-8 border-primary/20 bg-primary/5 animate-in-slide-up delay-100">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-[var(--foreground)] font-serif flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              {t('botSetup.configTitle')}
            </CardTitle>
            <CardDescription className="text-[var(--muted-foreground)]">
              {t('botSetup.configDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="bot-token" className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">{t('botSetup.botTokenLabel')}</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                  <Input
                    id="bot-token"
                    type={showToken ? "text" : "password"}
                    value={formData.discord_bot_token}
                    onChange={(e) => setFormData({...formData, discord_bot_token: e.target.value})}
                    placeholder="MTIz..."
                    className="pl-10 pr-10 input-dark font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-white transition-colors"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-[var(--muted-foreground)]">{t('botSetup.botTokenHint')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="app-id" className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">{t('botSetup.appIdLabel')}</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                    <Input
                      id="app-id"
                      value={formData.discord_app_id}
                      onChange={(e) => setFormData({...formData, discord_app_id: e.target.value})}
                      placeholder="1486..."
                      className="pl-10 input-dark text-sm"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="guild-id" className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">{t('botSetup.guildIdLabel')}</Label>
                  <div className="relative">
                    <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                    <Input
                      id="guild-id"
                      value={formData.discord_guild_id}
                      onChange={(e) => setFormData({...formData, discord_guild_id: e.target.value})}
                      placeholder="123456789..."
                      className="pl-10 input-dark text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="btn-gold border-none"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {t('botSetup.saveConfig')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Important Note */}
        <Card className="card-rpg mb-8 border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mic className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-[var(--foreground)] font-semibold mb-2">
                  {t('botSetup.noteTitle')}
                </h3>
                <p className="text-[var(--muted-foreground)] text-sm">
                  {instructions?.note || t('botSetup.noteDesc')}
                </p>
                <div className="mt-4">
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    {t('botSetup.manualUploadBadge')}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <div className="space-y-4">
          {instructions?.steps?.map((step) => (
            <StepCard key={step.step} step={step} />
          ))}
        </div>

        {/* Permissions Reference */}
        <Card className="card-rpg mt-8">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-[var(--foreground)] font-serif flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              {t('botSetup.permissionsTitle')}
            </CardTitle>
            <CardDescription className="text-[var(--muted-foreground)]">
              {t('botSetup.permissionsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-rpg-void border border-white/5">
                <h4 className="text-[var(--foreground)] font-semibold mb-2">{t('botSetup.voicePermissionsTitle')}</h4>
                <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
                  {t('botSetup.voicePermissionsList', { returnObjects: true }).map(p => (
                    <li key={p} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="p-4 rounded-lg bg-rpg-void border border-white/5">
                <h4 className="text-[var(--foreground)] font-semibold mb-2">{t('botSetup.intentsTitle')}</h4>
                <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
                  {t('botSetup.intentsList', { returnObjects: true }).map(i => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BotSetup;

