import { useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { DataCenterScene } from "./DataCenterScene";
import { GPUBoardScene } from "./GPUBoardScene";
import { HUD } from "./HUD";
import { ErrorBoundary } from "./ErrorBoundary";
import "./index.css";

export type AppScene = "datacenter" | "rack" | "gpu" | "component";

export interface ComponentFocus {
  id: "gpu_die" | "hbm" | "cpu" | "ram" | "cooling" | "nvlink" | "vrm";
  rackId: number;
}

export default function App() {
  const [scene, setScene] = useState<AppScene>("datacenter");
  const [focusedRack, setFocusedRack] = useState<number | null>(null);
  const [focusedComponent, setFocusedComponent] = useState<ComponentFocus | null>(null);
  const [fading, setFading] = useState(false);
  const [lockState, setLockState] = useState<"unlocked" | "locked">("unlocked");

  const transition = useCallback((next: AppScene, rackId?: number, comp?: ComponentFocus) => {
    setFading(true);
    setTimeout(() => {
      setScene(next);
      if (rackId !== undefined) setFocusedRack(rackId);
      if (comp) setFocusedComponent(comp);
      setFading(false);
    }, 350);
  }, []);

  const goBack = useCallback(() => {
    if (scene === "component") {
      transition("gpu", focusedRack ?? undefined);
      setFocusedComponent(null);
    } else if (scene === "gpu") {
      transition("rack", focusedRack ?? undefined);
    } else if (scene === "rack") {
      transition("datacenter");
    }
  }, [scene, focusedRack, transition]);

  const isGPUScene = scene === "gpu" || scene === "component";

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#050810", position: "relative", overflow: "hidden" }}>
      <ErrorBoundary>
        <Canvas
          shadows={{ type: 2 }}
          camera={{ fov: 75, near: 0.05, far: 200 }}
          gl={{ antialias: true, toneMappingExposure: 0.9, powerPreference: "high-performance" }}
          style={{ position: "absolute", inset: 0 }}
        >
          {isGPUScene ? (
            <GPUBoardScene
              rackId={focusedRack ?? 0}
              focusedComponent={focusedComponent}
              scene={scene}
              onSelectComponent={(comp) => transition("component", focusedRack ?? undefined, comp)}
            />
          ) : (
            <DataCenterScene
              scene={scene}
              focusedRack={focusedRack}
              onSelectRack={(id) => transition("rack", id)}
              onEnterRack={(id) => transition("gpu", id)}
              onLockChange={setLockState}
            />
          )}
        </Canvas>
      </ErrorBoundary>

      <div
        style={{
          position: "absolute", inset: 0, background: "#000",
          opacity: fading ? 1 : 0,
          transition: "opacity 0.35s ease",
          pointerEvents: fading ? "all" : "none",
          zIndex: 100,
        }}
      />

      <HUD
        scene={scene}
        focusedRack={focusedRack}
        focusedComponent={focusedComponent}
        lockState={lockState}
        onBack={goBack}
      />
    </div>
  );
}
