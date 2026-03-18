"use client";

import { useState } from "react";
import AudioRecorder from "@/components/AudioRecorder";
import FileUpload from "@/components/FileUpload";
import ResultsPanel from "@/components/ResultsPanel";
import { analyzeAudio, AnalyzeResponse } from "@/lib/api";

type AppState = "idle" | "analyzing" | "results" | "error";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [results, setResults] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAudioReady = async (audioBlob: Blob, filename: string) => {
    setAppState("analyzing");
    setError(null);
    try {
      const data = await analyzeAudio(audioBlob, filename);
      setResults(data);
      setAppState("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
      setAppState("error");
    }
  };

  const handleReset = () => {
    setAppState("idle");
    setResults(null);
    setError(null);
  };

  return (
    <main style={{ maxWidth: 940, margin: "0 auto", padding: "4rem 1.5rem 6rem" }}>

      {/* Header */}
      <header style={{ textAlign: "center", marginBottom: "3.5rem" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "0.45rem",
          fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "var(--color-text-secondary)",
          background: "linear-gradient(160deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)",
          border: "1px solid var(--color-border)",
          borderRadius: 20, padding: "0.3rem 0.9rem", marginBottom: "1.25rem",
          boxShadow: "0 1px 4px rgba(10,10,10,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: "50%",
            background: "var(--color-accent)", display: "inline-block",
          }} />
          {" IBM Granite · Speech Analysis"}
        </div>

        <h1 style={{
          fontSize: "2.5rem", fontWeight: 700,
          letterSpacing: "-0.04em", lineHeight: 1.12,
          background: "linear-gradient(160deg, #0A0A0A 30%, #4A3E35 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Transcribe &amp; Understand Audio
        </h1>
        <p style={{
          color: "var(--color-text-secondary)", marginTop: "0.75rem",
          fontSize: "1rem", maxWidth: 440, margin: "0.75rem auto 0",
        }}>
          Upload or record audio to get transcription, sentiment analysis, and key insights
        </p>
      </header>

      {/* Idle — input cards */}
      {(appState === "idle" || appState === "error") && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            <AudioRecorder onRecordingComplete={handleAudioReady} />
            <FileUpload onFileSelected={handleAudioReady} />
          </div>

          {appState === "error" && error && (
            <div className="card" style={{
              marginTop: "1rem",
              background: "linear-gradient(160deg, #FFF8F8 0%, var(--color-negative-muted) 100%)",
              borderColor: "rgba(122,48,48,0.25)",
              color: "var(--color-negative)",
              fontSize: "0.875rem",
              display: "flex", alignItems: "center", gap: "0.6rem",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "var(--color-negative)", flexShrink: 0,
              }} />
              {error}
            </div>
          )}
        </>
      )}

      {/* Analyzing — loading state */}
      {appState === "analyzing" && (
        <div className="card" style={{
          textAlign: "center", padding: "4rem 2rem",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem",
        }}>
          <div style={{ position: "relative", width: 48, height: 48 }}>
            {/* Outer ring */}
            <div style={{
              position: "absolute", inset: 0,
              borderRadius: "50%",
              border: "2px solid var(--color-border)",
            }} />
            {/* Spinning arc */}
            <div style={{
              position: "absolute", inset: 0,
              borderRadius: "50%",
              border: "2px solid transparent",
              borderTopColor: "var(--color-accent)",
              borderRightColor: "rgba(140,107,74,0.3)",
              animation: "spin 0.9s cubic-bezier(0.5, 0, 0.5, 1) infinite",
            }} />
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.02em" }}>
              Analyzing your audio…
            </div>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", marginTop: "0.35rem" }}>
              Transcription and NLP analysis may take 15–60s
            </p>
          </div>

          <div style={{
            display: "flex", flexDirection: "column", gap: "0.5rem",
            width: "100%", maxWidth: 280,
          }}>
            {["Preprocessing audio", "Transcribing with Granite Speech", "Running NLP analysis"].map((step, i) => (
              <div key={step} style={{
                display: "flex", alignItems: "center", gap: "0.6rem",
                fontSize: "0.8rem", color: "var(--color-text-secondary)",
                opacity: 0.6 + i * 0.2,
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                  background: i === 0 ? "var(--color-positive)" : "var(--color-border)",
                }} />
                {step}
              </div>
            ))}
          </div>

          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}

      {/* Results */}
      {appState === "results" && results && (
        <ResultsPanel results={results} onReset={handleReset} />
      )}

    </main>
  );
}
