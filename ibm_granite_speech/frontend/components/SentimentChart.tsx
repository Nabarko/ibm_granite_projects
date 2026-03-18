interface Props {
  readonly positive: number;
  readonly negative: number;
  readonly neutral: number;
}

const BARS = [
  {
    key: "positive" as const,
    label: "Positive",
    gradient: "linear-gradient(90deg, #3D6B4A 0%, #5A9B6E 100%)",
    dotColor: "var(--color-positive)",
  },
  {
    key: "negative" as const,
    label: "Negative",
    gradient: "linear-gradient(90deg, #7A3030 0%, #B05050 100%)",
    dotColor: "var(--color-negative)",
  },
  {
    key: "neutral" as const,
    label: "Neutral",
    gradient: "linear-gradient(90deg, #6B6057 0%, #9A8F85 100%)",
    dotColor: "var(--color-neutral)",
  },
];

export default function SentimentChart({ positive, negative, neutral }: Props) {
  const values = { positive, negative, neutral };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      {BARS.map(({ key, label, gradient, dotColor }) => (
        <div key={key} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%",
                background: dotColor, flexShrink: 0, display: "inline-block",
              }} />
              <span style={{ fontSize: "0.8rem", fontWeight: 500 }}>{label}</span>
            </div>
            <span style={{
              fontSize: "0.8rem", color: "var(--color-text-secondary)",
              fontVariantNumeric: "tabular-nums", fontWeight: 500,
            }}>
              {values[key].toFixed(1)}%
            </span>
          </div>

          {/* Recessed track */}
          <div className="surface-recessed" style={{
            height: 8, borderRadius: 6, overflow: "hidden", padding: 0,
          }}>
            <div style={{
              height: "100%",
              width: `${values[key]}%`,
              borderRadius: 6,
              background: gradient,
              boxShadow: "0 1px 3px rgba(10,10,10,0.2)",
              transition: "width 900ms cubic-bezier(0.34, 1.2, 0.64, 1)",
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}
