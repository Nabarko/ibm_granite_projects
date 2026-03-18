"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";

interface Props {
  readonly onFileSelected: (blob: Blob, filename: string) => void;
}

const ACCEPTED_EXTENSIONS = /\.(wav|mp3|m4a|ogg|flac|webm|aac)$/i;
const ACCEPTED_TYPES = new Set([
  "audio/wav", "audio/wave", "audio/mpeg", "audio/mp4",
  "audio/ogg", "audio/flac", "audio/webm", "audio/x-m4a", "audio/aac",
]);

export default function FileUpload({ onFileSelected }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const valid = ACCEPTED_TYPES.has(file.type) || ACCEPTED_EXTENSIONS.test(file.name);
    if (!valid) {
      alert("Please upload an audio file (WAV, MP3, M4A, OGG, FLAC, WebM).");
      return;
    }
    setSelectedName(file.name);
    onFileSelected(file, file.name);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <div
      className="card"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      style={{
        cursor: "pointer",
        display: "flex", flexDirection: "column", gap: "1.1rem",
        transition: "border-color var(--transition), box-shadow var(--transition), transform var(--transition)",
      }}
    >
      <div className="section-label">Upload Audio</div>

      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        onChange={onChange}
        style={{ display: "none" }}
      />

      {/* Drop zone — recessed */}
      <div
        className="surface-recessed"
        style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: "0.65rem", textAlign: "center",
          padding: "2rem 1.5rem",
          borderColor: isDragging ? "rgba(10,10,10,0.18)" : undefined,
          transition: "border-color var(--transition)",
        }}
      >
        {/* Upload icon circle */}
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "linear-gradient(160deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.5) 100%)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 2px 8px rgba(10,10,10,0.07), inset 0 1px 0 rgba(255,255,255,0.9)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.05rem",
          transition: "transform var(--transition)",
          transform: isDragging ? "translateY(-3px) scale(1.08)" : "none",
        }}>
          ↑
        </div>

        <div>
          <div style={{ fontWeight: 600, fontSize: "0.9rem", letterSpacing: "-0.01em" }}>
            {isDragging ? "Release to upload" : "Drop audio file here"}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", marginTop: "0.2rem" }}>
            or click to browse
          </div>
        </div>

        {/* Format chips */}
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", justifyContent: "center" }}>
          {["WAV", "MP3", "M4A", "OGG", "FLAC"].map((fmt) => (
            <span key={fmt} style={{
              fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.06em",
              color: "var(--color-text-secondary)",
              background: "linear-gradient(160deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.3) 100%)",
              border: "1px solid var(--color-border)",
              borderRadius: 20, padding: "0.15rem 0.5rem",
              boxShadow: "0 1px 3px rgba(10,10,10,0.05)",
            }}>
              {fmt}
            </span>
          ))}
        </div>
      </div>

      {/* Selected file badge */}
      {selectedName && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          fontSize: "0.78rem", color: "var(--color-text-secondary)",
          background: "var(--color-positive-muted)",
          border: "1px solid rgba(61,107,74,0.2)",
          borderRadius: "var(--radius-xs)",
          padding: "0.35rem 0.75rem",
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: "50%",
            background: "var(--color-positive)", flexShrink: 0,
          }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
            {selectedName}
          </span>
        </div>
      )}
    </div>
  );
}
