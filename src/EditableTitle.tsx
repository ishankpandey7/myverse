import { useRef, useState } from "react";
export function EditableTitle({
  title,
  onSave,
}: {
  title: string;
  onSave: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(title);
  const button = useRef<HTMLButtonElement>(null);
  function close() {
    setEditing(false);
    requestAnimationFrame(() => button.current?.focus());
  }
  return (
    <span className="editable-title">
      {editing ? (
        <span className="inline-editor">
          <input
            autoFocus
            aria-label={`New name for ${title}`}
            value={draft}
            maxLength={160}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                close();
              }
              if (e.key === "Enter") {
                e.preventDefault();
                if (draft.trim()) {
                  onSave(draft);
                  close();
                }
              }
            }}
          />
          <button
            type="button"
            disabled={!draft.trim()}
            onClick={() => {
              onSave(draft);
              close();
            }}
          >
            Save
          </button>
          <button type="button" onClick={close}>
            Cancel
          </button>
        </span>
      ) : (
        <>
          <span>{title}</span>
          <button
            ref={button}
            type="button"
            className="edit-title"
            aria-label={`Rename ${title}`}
            onClick={() => {
              setDraft(title);
              setEditing(true);
            }}
          >
            ✎
          </button>
        </>
      )}
    </span>
  );
}
