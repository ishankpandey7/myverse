import { useEffect, useRef, useState } from "react";
import { OUTFITS, SKINS, REWARDS, PLOTS, totalXP, validAvatar } from "./game";
import type { Avatar, Save, RewardId } from "./game";
import { AvatarArt, DecorationArt } from "./world/PersonalArt";
import "./atelier.css";

export function Atelier({
  save,
  initialTab,
  onClose,
  onSaveAvatar,
  onPlace,
  onRemove,
}: {
  save: Save;
  initialTab: "character" | "collection";
  onClose: () => void;
  onSaveAvatar: (avatar: Avatar) => void;
  onPlace: (id: RewardId) => void;
  onRemove: (id: RewardId) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState(initialTab);
  const [draft, setDraft] = useState<Avatar>({ ...save.avatar });
  const [message, setMessage] = useState("");
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    // Unmounting removes this native dialog from the top layer. Closing it in
    // effect cleanup would emit a stale close event during Strict Mode replay.
  }, []);
  const xp = totalXP(save);
  return (
    <dialog
      ref={dialog}
      className="atelier"
      aria-labelledby="atelier-title"
      onCancel={onClose}
      onClose={onClose}
    >
      <div className="atelier-top">
        <div>
          <p className="eyebrow">LITTLE DETAILS. YOUR WHOLE WORLD.</p>
          <h2 id="atelier-title">Make yourself at home.</h2>
        </div>
        <button
          className="close-atelier"
          onClick={onClose}
          aria-label="Close customisation"
        >
          ✕
        </button>
      </div>
      <div className="atelier-tabs">
        <button
          aria-pressed={tab === "character"}
          onClick={() => setTab("character")}
        >
          Your character
        </button>
        <button
          aria-pressed={tab === "collection"}
          onClick={() => setTab("collection")}
        >
          Island collection{" "}
          <span>
            {
              Object.keys(REWARDS).filter(
                (id) => xp >= REWARDS[id as RewardId].xp,
              ).length
            }
            /3
          </span>
        </button>
      </div>
      {tab === "character" ? (
        <div className="character-studio">
          <div className="character-preview">
            <span className="preview-stars">✧ &nbsp; · &nbsp; ✦</span>
            <svg
              viewBox="-70 -105 140 140"
              role="img"
              aria-label={`${draft.name || "Your character"} in ${OUTFITS[draft.outfit].name}`}
            >
              <ellipse cy="8" rx="52" ry="20" fill="#718d8833" />
              <AvatarArt avatar={draft} />
            </svg>
            <h3>{draft.name.trim() || "Your next adventure"}</h3>
            <p>Level {Math.floor(xp / 100) + 1} · World builder</p>
          </div>
          <form
            className="character-options"
            onSubmit={(event) => {
              event.preventDefault();
              const avatar = { ...draft, name: draft.name.trim() };
              if (validAvatar(avatar)) {
                onSaveAvatar(avatar);
                setDraft(avatar);
                setMessage("Your new look is ready. See you on the island!");
              }
            }}
          >
            <label htmlFor="character-name">What should we call you?</label>
            <input
              id="character-name"
              value={draft.name}
              maxLength={24}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              required
            />
            <fieldset>
              <legend>Choose your colours</legend>
              <div className="outfit-options">
                {Object.entries(OUTFITS).map(([id, outfit]) => (
                  <button
                    type="button"
                    key={id}
                    aria-label={`${outfit.name} outfit`}
                    aria-pressed={draft.outfit === id}
                    onClick={() =>
                      setDraft({ ...draft, outfit: id as Avatar["outfit"] })
                    }
                  >
                    <i style={{ background: outfit.coat }} />
                    <span>{outfit.name}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Skin tone</legend>
              <div className="skin-options">
                {Object.entries(SKINS).map(([id, colour]) => (
                  <button
                    type="button"
                    key={id}
                    style={{ background: colour }}
                    aria-label={`${id} skin tone`}
                    aria-pressed={draft.skin === id}
                    onClick={() =>
                      setDraft({ ...draft, skin: id as Avatar["skin"] })
                    }
                  >
                    {draft.skin === id ? "✓" : ""}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>A finishing touch</legend>
              <div className="hat-options">
                {(["wizard", "beanie", "none"] as const).map((hat) => (
                  <button
                    type="button"
                    key={hat}
                    aria-pressed={draft.hat === hat}
                    onClick={() => setDraft({ ...draft, hat })}
                  >
                    {hat === "wizard"
                      ? "Wizard hat"
                      : hat === "beanie"
                        ? "Cozy beanie"
                        : "No hat"}
                  </button>
                ))}
              </div>
            </fieldset>
            <button
              className="primary-action"
              disabled={!draft.name.trim()}
              type="submit"
            >
              Save my character ↗
            </button>
            <p className="studio-message" role="status">
              {message}
            </p>
          </form>
        </div>
      ) : (
        <div className="collection-studio">
          <div className="collection-intro">
            <div>
              <h3>Small wins become little wonders.</h3>
              <p>
                Complete missions to unlock decorations. Your XP keeps growing
                when you place them.
              </p>
            </div>
            <span className="earned-xp">✦ {xp} XP earned</span>
          </div>
          <div className="reward-grid">
            {(Object.keys(REWARDS) as RewardId[]).map((id) => {
              const reward = REWARDS[id],
                unlocked = xp >= reward.xp,
                plot = save.decorations[id];
              return (
                <article
                  key={id}
                  className={`reward-card ${unlocked ? "unlocked" : "locked"}`}
                >
                  <div className="reward-art">
                    <svg
                      viewBox="-60 -100 120 125"
                      role="img"
                      aria-label={reward.name}
                    >
                      <DecorationArt id={id} />
                    </svg>
                    <span>
                      {plot
                        ? "ON YOUR ISLAND"
                        : unlocked
                          ? "READY TO PLACE"
                          : `${reward.xp} XP TO UNLOCK`}
                    </span>
                  </div>
                  <h3>{reward.name}</h3>
                  <p>{reward.description}</p>
                  <small>
                    {plot
                      ? `Placed: ${PLOTS[plot].name}`
                      : unlocked
                        ? "Yours to keep. Choose a spot."
                        : `${reward.xp - xp} XP away · ${Math.ceil((reward.xp - xp) / 25)} more ${Math.ceil((reward.xp - xp) / 25) === 1 ? "mission" : "missions"}`}
                  </small>
                  <button
                    className="primary-action"
                    disabled={!unlocked}
                    aria-label={
                      unlocked
                        ? `${plot ? "Move" : "Place"} ${reward.name}`
                        : `Unlock ${reward.name} at ${reward.xp} XP`
                    }
                    onClick={() => onPlace(id)}
                  >
                    {plot
                      ? "Move decoration"
                      : unlocked
                        ? "Place on island →"
                        : "Keep adventuring"}
                  </button>
                  {plot && (
                    <button
                      className="return-decoration"
                      onClick={() => onRemove(id)}
                      aria-label={`Return ${reward.name} to collection`}
                    >
                      Return to collection
                    </button>
                  )}
                </article>
              );
            })}
          </div>
          <p className="collection-footnote">
            Each decoration has one copy. Move it between four garden spots
            whenever you like.
          </p>
        </div>
      )}
    </dialog>
  );
}
