"use client";

import { useRef, useState, useEffect } from "react";

interface Props {
  readonly onRecordingComplete: (blob: Blob, filename: string) => void;
}

export default function AudioRecorder({ onRecordingComplete }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const drawIdleWave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(10,10,10,0.12)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const drawLiveWave = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d")!;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Filled waveform with gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0,   "rgba(140,107,74,0.15)");
    gradient.addColorStop(0.5, "rgba(10,10,10,0.9)");
    gradient.addColorStop(1, "rgba(140,107,74,0.15)");

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.75;
    ctx.lineJoin = "round";
    ctx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();
    animFrameRef.current = requestAnimationFrame(drawLiveWave);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onRecordingComplete(blob, `recording_${Date.now()}.webm`);
        stream.getTracks().forEach((t) => t.stop());
        cancelAnimationFrame(animFrameRef.current);
        drawIdleWave();
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      drawLiveWave();
    } catch {
      alert("Microphone access denied. Please allow microphone access and try again.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    drawIdleWave();
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
      <div className="section-label">Record Audio</div>

      {/* Waveform — recessed */}
      <div className="surface-recessed" style={{ padding: "0.5rem", position: "relative" }}>
        <canvas
          ref={canvasRef}
          width={400}
          height={60}
          style={{ width: "100%", height: 60, display: "block", borderRadius: 4 }}
        />
        {isRecording && (
          <div style={{
            position: "absolute", top: "0.5rem", right: "0.6rem",
            display: "flex", alignItems: "center", gap: "0.35rem",
            fontSize: "0.7rem", fontWeight: 600,
            color: "var(--color-negative)", letterSpacing: "0.04em",
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "var(--color-negative)",
              animation: "recPulse 1s infinite",
            }} />
            REC
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
        <button
          className={`btn-primary${isRecording ? " danger" : ""}`}
          onClick={isRecording ? stopRecording : startRecording}
        >
          <span style={{
            width: isRecording ? 8 : 7,
            height: isRecording ? 8 : 7,
            borderRadius: isRecording ? "2px" : "50%",
            background: "#fff",
            flexShrink: 0,
            ...(isRecording ? { animation: "recPulse 1.2s infinite" } : {}),
          }} />
          {" "}{isRecording ? "Stop" : "Record"}
        </button>

        {isRecording && (
          <span style={{
            fontSize: "0.875rem", color: "var(--color-text-secondary)",
            fontVariantNumeric: "tabular-nums", fontWeight: 500,
          }}>
            {formatDuration(duration)}
          </span>
        )}
      </div>

      <style>{`
        @keyframes recPulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
      `}</style>
    </div>
  );
}
