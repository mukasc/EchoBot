import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Play, Square, Pause, Download, Loader2, Volume2, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api from "../../lib/api";

const WebRtcRecorder = () => {
  const { t } = useTranslation();
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [speakerName, setSpeakerName] = useState("Jogador");
  const [recordingState, setRecordingState] = useState("idle"); // idle, recording, paused, converting, ready
  const [duration, setDuration] = useState(0);
  const [realStartTime, setRealStartTime] = useState(null);
  const [convertedBlobUrl, setConvertedBlobUrl] = useState(null);
  const [convertedFileName, setConvertedFileName] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Fetch audio input devices
  const getDevices = async () => {
    try {
      const perms = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop temporary tracks
      perms.getTracks().forEach(track => track.stop());

      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = deviceList.filter(d => d.kind === "audioinput");
      setDevices(audioInputs);
      if (audioInputs.length > 0) {
        setSelectedDevice(audioInputs[0].deviceId);
      }
    } catch (err) {
      console.error("Error accessing audio devices:", err);
      toast.error(t('webrtc.deviceError', "Permissão de microfone negada ou erro ao listar dispositivos."));
    }
  };

  useEffect(() => {
    getDevices();
    return () => {
      stopAllCaptures();
    };
  }, []);

  const stopAllCaptures = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
    }
  };

  // Start visualizer using Web Audio API
  const startVisualizer = (stream) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    
    analyser.fftSize = 64;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    audioCtxRef.current = audioContext;
    analyserRef.current = analyser;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasCtx = canvas.getContext("2d");

    const draw = () => {
      if (!analyserRef.current) return;
      animationFrameRef.current = requestAnimationFrame(draw);

      analyserRef.current.getByteFrequencyData(dataArray);

      canvasCtx.fillStyle = "#0c0a09"; // Stone-950 (RPG theme)
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 1.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];

        // Draw double sided bar for cool visualization
        const gradient = canvasCtx.createLinearGradient(0, canvas.height / 2, 0, canvas.height);
        gradient.addColorStop(0, "#d97706"); // Amber-600
        gradient.addColorStop(1, "#f59e0b"); // Amber-500

        canvasCtx.fillStyle = gradient;
        
        const h = (barHeight / 255) * (canvas.height * 0.8);
        const yTop = (canvas.height - h) / 2;

        // Draw rounded pill-like frequency bar
        canvasCtx.beginPath();
        if (canvasCtx.roundRect) {
          canvasCtx.roundRect(x, yTop, barWidth - 4, h, 4);
        } else {
          canvasCtx.rect(x, yTop, barWidth - 4, h);
        }
        canvasCtx.fill();

        x += barWidth;
      }
    };

    draw();
  };

  const handleStartRecording = async () => {
    console.log("DEBUG: handleStartRecording start");
    audioChunksRef.current = [];
    setConvertedBlobUrl(null);
    setDuration(0);

    const constraints = {
      audio: selectedDevice ? { deviceId: { exact: selectedDevice } } : true
    };
    console.log("DEBUG: constraints constructed", constraints);

    try {
      console.log("DEBUG: calling getUserMedia");
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("DEBUG: getUserMedia finished", stream);
      streamRef.current = stream;

      // Detect supported mimeTypes
      let options = { mimeType: "audio/webm;codecs=opus" };
      console.log("DEBUG: checking isTypeSupported");
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "audio/ogg;codecs=opus" };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "" }; // let browser choose
      }
      console.log("DEBUG: options selected", options);

      console.log("DEBUG: creating MediaRecorder");
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await processAndConvertAudio();
      };

      // Set recording start metadata timestamp
      const startTime = new Date().toISOString();
      setRealStartTime(startTime);

      console.log("DEBUG: starting mediaRecorder");
      mediaRecorder.start(1000); // chunk every second
      console.log("DEBUG: setting recording state to recording");
      setRecordingState("recording");

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Start canvas visualizer
      console.log("DEBUG: calling startVisualizer");
      startVisualizer(stream);
      console.log("DEBUG: startVisualizer finished");

      toast.success(t('webrtc.started', "Gravação iniciada!"));
    } catch (err) {
      console.log("DEBUG: Recording error caught:", err);
      console.error("Recording error:", err);
      toast.error(t('webrtc.startError', "Erro ao iniciar a gravação. Verifique as permissões de áudio."));
    }
  };

  const handlePauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === "recording") {
      mediaRecorderRef.current.pause();
      setRecordingState("paused");
      if (timerRef.current) clearInterval(timerRef.current);
      toast.info(t('webrtc.paused', "Gravação pausada."));
    }
  };

  const handleResumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === "paused") {
      mediaRecorderRef.current.resume();
      setRecordingState("recording");
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      toast.info(t('webrtc.resumed', "Gravação retomada."));
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && (recordingState === "recording" || recordingState === "paused")) {
      mediaRecorderRef.current.stop();
      stopAllCaptures();
      setRecordingState("converting");
    }
  };

  const processAndConvertAudio = async () => {
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current.mimeType || "audio/webm" });
      
      const formData = new FormData();
      formData.append("file", audioBlob, `recording_webrtc.${audioBlob.type.includes("ogg") ? "ogg" : "webm"}`);
      formData.append("speaker_id", speakerName);
      formData.append("real_start_time", realStartTime);

      toast.loading(t('webrtc.converting', "Convertendo gravação para Ogg/Opus..."), { id: "convert-toast" });

      const response = await api.post("/sessions/audio/convert-webrtc", formData, {
        responseType: "blob",
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      const convertedBlob = response.data;
      const downloadUrl = window.URL.createObjectURL(convertedBlob);
      const safeSpeaker = speakerName.replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = `webrtc_${safeSpeaker}_${new Date().toISOString().replace(/T/, "_").replace(/:/g, "-").slice(0, 19)}.ogg`;

      setConvertedBlobUrl(downloadUrl);
      setConvertedFileName(fileName);
      setRecordingState("ready");

      toast.success(t('webrtc.convertSuccess', "Conversão concluída com sucesso!"), { id: "convert-toast" });
    } catch (err) {
      console.error("Audio conversion failed:", err);
      setRecordingState("idle");
      toast.error(t('webrtc.convertError', "Falha ao converter áudio. Tente novamente."), { id: "convert-toast" });
    }
  };

  const triggerDownload = () => {
    if (!convertedBlobUrl) return;
    const link = document.createElement("a");
    link.href = convertedBlobUrl;
    link.download = convertedFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t('webrtc.downloaded', "Download iniciado!"));
  };

  const formatTime = (secs) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const remainingSecs = secs % 60;
    return [
      hrs > 0 ? String(hrs).padStart(2, '0') : null,
      String(mins).padStart(2, '0'),
      String(remainingSecs).padStart(2, '0')
    ].filter(Boolean).join(':');
  };

  return (
    <div className="card-rpg p-6 rounded-xl border border-white/5 bg-rpg-surface max-w-2xl mx-auto space-y-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Volume2 className="w-48 h-48 text-primary" />
      </div>

      <div className="relative z-10 space-y-2">
        <h2 className="text-xl font-bold font-serif text-[var(--foreground)] flex items-center gap-2">
          <Mic className="w-5 h-5 text-primary" />
          {t('webrtc.title', "Gravador WebRTC")}
        </h2>
        <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
          {t('webrtc.desc', "Grave áudio diretamente do seu navegador com metadados acoplados (horário real e identificação). O arquivo será convertido para OGG/Opus compatível para importação em sessões.")}
        </p>
      </div>

      {/* Configuration Section (only active when idle) */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
            {t('webrtc.inputDevice', "Microfone")}
          </label>
          <select
            value={selectedDevice}
            disabled={recordingState !== "idle" && recordingState !== "ready"}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="w-full bg-rpg-void border border-border rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-primary/50 disabled:opacity-50 transition-colors"
          >
            {devices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone (${device.deviceId.slice(0, 5)}...)`}
              </option>
            ))}
            {devices.length === 0 && (
              <option value="">{t('webrtc.noDevices', "Nenhum microfone encontrado")}</option>
            )}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
            {t('webrtc.speakerName', "Nome do Orador")}
          </label>
          <input
            type="text"
            value={speakerName}
            disabled={recordingState !== "idle" && recordingState !== "ready"}
            onChange={(e) => setSpeakerName(e.target.value)}
            placeholder="Ex: Mestre, Jogador 1"
            className="w-full bg-rpg-void border border-border rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-primary/50 disabled:opacity-50 transition-colors"
          />
        </div>
      </div>

      {/* Visualizer and Live Information */}
      <div className="relative z-10 bg-rpg-void/60 border border-white/5 rounded-lg p-4 flex flex-col items-center justify-center space-y-4">
        {(recordingState === "recording" || recordingState === "paused") ? (
          <>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${recordingState === "recording" ? 'bg-red-500 animate-ping' : 'bg-yellow-500'}`} />
              <span className="text-lg font-mono font-semibold text-[var(--foreground)]">
                {formatTime(duration)}
              </span>
            </div>
            
            <canvas
              ref={canvasRef}
              width={400}
              height={80}
              className="w-full max-w-md h-20 rounded bg-rpg-void border border-white/5"
            />
            
            <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1.5 italic">
              <ShieldCheck className="w-3.5 h-3.5 text-green-500/80" />
              {t('webrtc.timestampMeta', "Horário Real: {{time}}", { time: new Date(realStartTime).toLocaleTimeString() })}
            </p>
          </>
        ) : recordingState === "converting" ? (
          <div className="py-8 flex flex-col items-center space-y-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm font-semibold text-[var(--muted-foreground)] animate-pulse">
              {t('webrtc.convertingPrompt', "Processando gravação e embutindo metadados...")}
            </p>
          </div>
        ) : recordingState === "ready" ? (
          <div className="py-6 flex flex-col items-center space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {t('webrtc.readyTitle', "Arquivo OGG/Opus Gerado!")}
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1 font-mono break-all max-w-sm">
                {convertedFileName}
              </p>
            </div>
            <Button onClick={triggerDownload} className="btn-gold flex items-center gap-2">
              <Download className="w-4 h-4" />
              {t('webrtc.downloadButton', "Baixar Arquivo Convertido")}
            </Button>
            <button
              onClick={() => setRecordingState("idle")}
              className="text-xs text-[var(--muted-foreground)] hover:text-primary transition-colors underline"
            >
              {t('webrtc.recordNew', "Gravar novamente")}
            </button>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center text-center space-y-2">
            <Volume2 className="w-10 h-10 text-[var(--muted-foreground)]/50" />
            <p className="text-sm text-[var(--muted-foreground)] italic">
              {t('webrtc.idlePrompt', "Clique em Iniciar para iniciar a captura de áudio.")}
            </p>
          </div>
        )}
      </div>

      {/* Buttons Controls */}
      <div className="relative z-10 flex items-center justify-center gap-3">
        {recordingState === "idle" && (
          <Button
            onClick={handleStartRecording}
            disabled={devices.length === 0}
            className="btn-gold px-6 py-5 flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            {t('webrtc.startRecord', "Iniciar Gravação")}
          </Button>
        )}

        {(recordingState === "recording" || recordingState === "paused") && (
          <>
            {recordingState === "recording" ? (
              <Button
                onClick={handlePauseRecording}
                variant="outline"
                className="border-border text-[var(--foreground)] hover:bg-white/5 flex items-center gap-2"
              >
                <Pause className="w-4 h-4" />
                {t('webrtc.pauseButton', "Pausar")}
              </Button>
            ) : (
              <Button
                onClick={handleResumeRecording}
                className="btn-gold flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                {t('webrtc.resumeButton', "Retomar")}
              </Button>
            )}

            <Button
              onClick={handleStopRecording}
              className="bg-red-600 hover:bg-red-500 text-white border-none flex items-center gap-2"
            >
              <Square className="w-4 h-4 fill-current" />
              {t('webrtc.stopButton', "Parar e Salvar")}
            </Button>
          </>
        )}

        {recordingState === "ready" && (
          <Button
            onClick={handleStartRecording}
            disabled={devices.length === 0}
            variant="outline"
            className="border-border text-[var(--foreground)] hover:bg-white/5 flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            {t('webrtc.recordAnother', "Gravar Outro")}
          </Button>
        )}
      </div>
    </div>
  );
};

export default WebRtcRecorder;
