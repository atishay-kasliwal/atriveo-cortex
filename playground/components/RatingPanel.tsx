"use client";

import type { ExtractionRatings, RatingValue } from "@/lib/types";

type Props = {
  ratings: ExtractionRatings;
  extractionId?: number;
  onChange: (ratings: ExtractionRatings) => void;
  saving?: boolean;
};

const OPTIONS: { value: RatingValue; label: string; className: string }[] = [
  { value: "good", label: "Good", className: "rating-good" },
  { value: "okay", label: "Okay", className: "rating-okay" },
  { value: "bad", label: "Bad", className: "rating-bad" },
];

function RatingRow({
  label,
  value,
  onSelect,
  disabled,
}: {
  label: string;
  value: RatingValue | null;
  onSelect: (v: RatingValue) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rating-row">
      <span className="rating-label">{label}</span>
      <div className="rating-buttons">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`rating-btn ${opt.className}${value === opt.value ? " active" : ""}`}
            disabled={disabled}
            onClick={() => onSelect(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RatingPanel({
  ratings,
  extractionId,
  onChange,
  saving,
}: Props) {
  function setField(
    field: keyof ExtractionRatings,
    value: RatingValue,
  ) {
    onChange({ ...ratings, [field]: value });
  }

  return (
    <div className="inspector-section">
      <div className="inspector-section-header">Human Rating</div>
      <div className="inspector-section-body">
        {extractionId == null && (
          <div className="muted" style={{ marginBottom: 12 }}>
            Run an extraction to save ratings.
          </div>
        )}
        <RatingRow
          label="Projects"
          value={ratings.projects}
          onSelect={(v) => setField("projects", v)}
          disabled={saving}
        />
        <RatingRow
          label="Commitments"
          value={ratings.commitments}
          onSelect={(v) => setField("commitments", v)}
          disabled={saving}
        />
        <RatingRow
          label="Ideas"
          value={ratings.ideas}
          onSelect={(v) => setField("ideas", v)}
          disabled={saving}
        />
        {saving && <div className="muted">Saving…</div>}
      </div>
    </div>
  );
}
