import { useId, useRef } from "react";
import "./mission-search.css";

export function MissionSearch({
  query,
  onChange,
  shown,
  total,
}: {
  query: string;
  onChange: (value: string) => void;
  shown: number;
  total: number;
}) {
  const id = useId(),
    input = useRef<HTMLInputElement>(null);
  return (
    <div className="mission-search">
      <label htmlFor={id}>Search missions</label>
      <div className="mission-search-field">
        <input
          ref={input}
          id={id}
          type="search"
          value={query}
          maxLength={160}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Find a small adventure…"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear mission search"
            onClick={() => {
              onChange("");
              input.current?.focus();
            }}
          >
            ×
          </button>
        ) : null}
      </div>
      <p className="mission-search-count" role="status" aria-atomic="true">
        {query.trim()
          ? `${shown} of ${total} missions match`
          : "Search by title"}
      </p>
    </div>
  );
}
