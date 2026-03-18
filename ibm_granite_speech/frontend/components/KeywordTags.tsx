"use client";

import { useState } from "react";

interface Props {
  readonly keywords: string[];
}

function Chip({ label }: { readonly label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-block",
        padding: "0.3rem 0.85rem",
        borderRadius: 20,
        border: "1px solid",
        borderColor: hovered ? "var(--color-text-primary)" : "var(--color-border)",
        background: hovered
          ? "linear-gradient(160deg, #1A1A1A 0%, #0A0A0A 100%)"
          : "linear-gradient(160deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)",
        color: hovered ? "#fff" : "var(--color-text-primary)",
        fontSize: "0.78rem",
        fontWeight: 500,
        letterSpacing: "0.01em",
        cursor: "default",
        userSelect: "none",
        boxShadow: hovered
          ? "0 4px 12px rgba(10,10,10,0.2), inset 0 1px 0 rgba(255,255,255,0.08)"
          : "0 1px 3px rgba(10,10,10,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
        transition: "background var(--transition), color var(--transition), border-color var(--transition), transform var(--transition), box-shadow var(--transition)",
        transform: hovered ? "translateY(-2px)" : "none",
      }}
    >
      {label}
    </span>
  );
}

export default function KeywordTags({ keywords }: Props) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
      {keywords.map((kw) => (
        <Chip key={kw} label={kw} />
      ))}
    </div>
  );
}
