import { AnalyzeResponse } from "@/lib/api";
import SentimentChart from "./SentimentChart";
import KeywordTags from "./KeywordTags";

interface Props {
  readonly results: AnalyzeResponse;
  readonly onReset: () => void;
}

function Section({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div className="section-label">{title}</div>
      {children}
    </div>
  );
}

export default function ResultsPanel({ results, onReset }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Meta row: processing time + reset */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          fontSize: "0.78rem", fontWeight: 500,
          color: "var(--color-text-secondary)",
          background: "linear-gradient(160deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)",
          border: "1px solid var(--color-border)",
          borderRadius: 20, padding: "0.3rem 0.85rem",
          boxShadow: "0 1px 4px rgba(10,10,10,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: "50%",
            background: "var(--color-positive)", flexShrink: 0, display: "inline-block",
          }} />
          {" "}Processed in {results.processing_time.toFixed(2)}s
        </div>

        <button className="btn-ghost" onClick={onReset}>
          <span style={{
            width: 5, height: 5, borderRadius: "50%",
            background: "currentColor", flexShrink: 0,
          }} />
          {" "}Analyze another
        </button>
      </div>

      {/* Transcription */}
      <Section title="Transcription">
        <div className="surface-recessed" style={{ padding: "1rem 1.1rem" }}>
          <p style={{ fontSize: "0.93rem", lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0 }}>
            {results.transcription}
          </p>
        </div>
      </Section>

      {/* Summary */}
      <Section title="Summary">
        <p style={{ fontSize: "0.93rem", lineHeight: 1.8, color: "var(--color-text-secondary)" }}>
          {results.summary}
        </p>
      </Section>

      {/* Sentiment + Keywords side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
        <Section title="Sentiment">
          <SentimentChart
            positive={results.sentiment.positive}
            negative={results.sentiment.negative}
            neutral={results.sentiment.neutral}
          />
        </Section>

        <Section title="Keywords">
          <KeywordTags keywords={results.keywords} />
        </Section>
      </div>

    </div>
  );
}
