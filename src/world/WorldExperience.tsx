import { Component, lazy, Suspense, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { IslandWorld } from "./IslandWorld";
import "./three-island.css";
const ThreeIsland = lazy(() => import("./ThreeIsland"));
class DimensionBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? (
      <div className="dimension-loading" role="status">
        Opening Classic view…
      </div>
    ) : (
      this.props.children
    );
  }
}
export function WorldExperience(props: ComponentProps<typeof IslandWorld>) {
  const [classic, setClassic] = useState(false),
    [error, setError] = useState("");
  return (
    <div
      className={`world-experience ${classic ? "classic-experience" : "three-experience"}`}
    >
      {classic ? (
        <>
          <div className="dimension-switch">
            <p role={error ? "status" : undefined}>
              {error || "Classic illustrated world"}
            </p>
            <button
              onClick={() => {
                setError("");
                setClassic(false);
              }}
            >
              Enter 3D world ↗
            </button>
          </div>
          <IslandWorld {...props} />
        </>
      ) : (
        <DimensionBoundary
          onError={() => {
            setError(
              "The 3D world could not load. Your world is ready in Classic view.",
            );
            setClassic(true);
          }}
        >
          <Suspense
            fallback={
              <div className="dimension-loading">
                <span>✧</span>
                <h2>Opening your universe.</h2>
                <p>A new perspective on a world that is yours.</p>
              </div>
            }
          >
            <ThreeIsland
              {...props}
              onClassic={() => setClassic(true)}
              onUnavailable={(message) => {
                setError(message);
                setClassic(true);
              }}
            />
          </Suspense>
        </DimensionBoundary>
      )}
    </div>
  );
}
