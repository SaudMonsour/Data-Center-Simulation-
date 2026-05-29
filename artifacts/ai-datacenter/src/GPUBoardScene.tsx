import { useRef, useEffect, useState, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { AppScene, ComponentFocus } from "./App";

// ─── GPU Scene Materials ──────────────────────────────────────────────────────

const MAT_GPU = {
  pcb: new THREE.MeshStandardMaterial({ color: 0x0a2010, metalness: 0.15, roughness: 0.75 }),
  pcbBottom: new THREE.MeshStandardMaterial({ color: 0x082018, metalness: 0.2, roughness: 0.7 }),
  bgaGold: new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.95, roughness: 0.15 }),
  gpuDie: new THREE.MeshStandardMaterial({ color: 0x080810, metalness: 0.35, roughness: 0.3 }),
  gpuDieTop: new THREE.MeshStandardMaterial({ color: 0x0d0d16, metalness: 0.5, roughness: 0.25 }),
  siliconTrace: new THREE.MeshStandardMaterial({ color: 0x1a1a28, metalness: 0.6, roughness: 0.2 }),
  hbm: new THREE.MeshStandardMaterial({ color: 0x280008, metalness: 0.4, roughness: 0.35 }),
  hbmLayer: new THREE.MeshStandardMaterial({ color: 0x3d0012, metalness: 0.5, roughness: 0.3 }),
  hbmTop: new THREE.MeshStandardMaterial({ color: 0x1a0008, metalness: 0.3, roughness: 0.25 }),
  hbmBump: new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.98, roughness: 0.05 }),
  heatspreader: new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.95, roughness: 0.12 }),
  thermal: new THREE.MeshStandardMaterial({ color: 0x7a4a2a, metalness: 0.6, roughness: 0.5 }),
  capBrown: new THREE.MeshStandardMaterial({ color: 0x5a3010, metalness: 0.1, roughness: 0.9 }),
  capSilver: new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.85, roughness: 0.2 }),
  inductorFerrite: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.1, roughness: 0.9 }),
  connector: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.7, roughness: 0.3 }),
  nvlinkGold: new THREE.MeshStandardMaterial({ color: 0xc8960c, metalness: 0.9, roughness: 0.1 }),
  vrmFet: new THREE.MeshStandardMaterial({ color: 0x0a1a10, metalness: 0.7, roughness: 0.3 }),
  highlight: new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.18, depthWrite: false }),
  highlightGreen: new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.6, transparent: true, opacity: 0.18, depthWrite: false }),
  highlightAmber: new THREE.MeshStandardMaterial({ color: 0xff9900, emissive: 0xff9900, emissiveIntensity: 0.6, transparent: true, opacity: 0.18, depthWrite: false }),
  nvlinkConnector: new THREE.MeshStandardMaterial({ color: 0x1a0a30, metalness: 0.7, roughness: 0.3 }),
  solder: new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.3 }),
};

// ─── HBM3 Stack (Micron) ──────────────────────────────────────────────────────

function HBMStack({
  position, isSelected, onClick,
}: {
  position: [number, number, number];
  isSelected: boolean;
  onClick: () => void;
}) {
  const W = 0.55, D = 0.55;
  const LAYERS = 9;
  const layerH = 0.085;
  const totalH = LAYERS * layerH;

  // Pre-calc microbump positions
  const bumps = useMemo(() => {
    const arr: [number, number][] = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
      arr.push([(i - 2.5) * 0.07, (j - 2.5) * 0.07]);
    }
    return arr;
  }, []);

  return (
    <group position={position}>
      {/* Clickable hitbox */}
      <mesh onClick={(e) => { e.stopPropagation(); onClick(); }} visible={false}>
        <boxGeometry args={[W + 0.1, totalH + 0.1, D + 0.1]} />
        <meshBasicMaterial />
      </mesh>

      {/* DRAM die layers (stacked dies) */}
      {Array.from({ length: LAYERS }, (_, i) => (
        <group key={i} position={[0, i * layerH, 0]}>
          {/* Main die body */}
          <mesh castShadow>
            <boxGeometry args={[W, layerH - 0.008, D]} />
            <primitive object={i % 2 === 0 ? MAT_GPU.hbm : MAT_GPU.hbmLayer} />
          </mesh>
          {/* TSV (through-silicon via) layer visible on edge */}
          <mesh position={[W / 2 - 0.005, 0, 0]}>
            <boxGeometry args={[0.01, layerH - 0.006, D - 0.04]} />
            <meshStandardMaterial color={0x4a0018} metalness={0.6} roughness={0.2} />
          </mesh>
          {/* Die interface line */}
          <mesh position={[0, layerH / 2 - 0.001, 0]}>
            <boxGeometry args={[W + 0.002, 0.003, D + 0.002]} />
            <primitive object={MAT_GPU.solder} />
          </mesh>
        </group>
      ))}

      {/* Top die surface — Micron die with bond pads */}
      <mesh position={[0, totalH - 0.01, 0]}>
        <boxGeometry args={[W, 0.012, D]} />
        <primitive object={MAT_GPU.hbmTop} />
      </mesh>

      {/* Microbumps on top (gold) */}
      {bumps.map(([bx, bz], i) => (
        <mesh key={i} position={[bx, totalH + 0.003, bz]}>
          <sphereGeometry args={[0.012, 6, 6]} />
          <primitive object={MAT_GPU.hbmBump} />
        </mesh>
      ))}

      {/* HBM branding mark (indented rectangle on top) */}
      <mesh position={[0, totalH + 0.001, 0]}>
        <boxGeometry args={[0.3, 0.002, 0.12]} />
        <meshStandardMaterial color={0x100004} metalness={0.3} roughness={0.8} />
      </mesh>

      {/* Bottom microbumps connecting to substrate */}
      {bumps.slice(0, 16).map(([bx, bz], i) => (
        <mesh key={i} position={[bx * 0.9, -0.006, bz * 0.9]}>
          <sphereGeometry args={[0.01, 5, 5]} />
          <primitive object={MAT_GPU.hbmBump} />
        </mesh>
      ))}

      {/* Selected highlight */}
      {isSelected && (
        <mesh position={[0, totalH / 2, 0]}>
          <boxGeometry args={[W + 0.04, totalH + 0.04, D + 0.04]} />
          <primitive object={MAT_GPU.highlight} />
        </mesh>
      )}
    </group>
  );
}

// ─── H100 GPU Die ─────────────────────────────────────────────────────────────

function GPUDie({
  isSelected, onClick,
}: {
  isSelected: boolean;
  onClick: () => void;
}) {
  const W = 2.85, D = 2.5, H = 0.082;

  // Pre-calc CPC cluster positions and floorplan elements
  const gpcClusters = useMemo(() => {
    const arr: [number, number][] = [];
    for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) {
      arr.push([(i - 3.5) * 0.3, (j - 1.5) * 0.48]);
    }
    return arr;
  }, []);

  const l2Cache = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => [(i - 2.5) * 0.42, 0] as [number, number]), []);

  return (
    <group>
      {/* Clickable hitbox */}
      <mesh onClick={(e) => { e.stopPropagation(); onClick(); }} visible={false}>
        <boxGeometry args={[W + 0.15, H + 0.15, D + 0.15]} />
        <meshBasicMaterial />
      </mesh>

      {/* Main die substrate (silicon) */}
      <mesh position={[0, H / 2, 0]} castShadow>
        <boxGeometry args={[W, H, D]} />
        <primitive object={MAT_GPU.gpuDie} />
      </mesh>

      {/* Die top surface with circuit topology */}
      <mesh position={[0, H + 0.001, 0]}>
        <boxGeometry args={[W - 0.05, 0.003, D - 0.05]} />
        <primitive object={MAT_GPU.gpuDieTop} />
      </mesh>

      {/* GPC (Graphics Processing Cluster) blocks */}
      {gpcClusters.map(([x, z], i) => (
        <mesh key={i} position={[x, H + 0.003, z]}>
          <boxGeometry args={[0.26, 0.004, 0.42]} />
          <meshStandardMaterial color={0x12122a} metalness={0.5} roughness={0.25} />
        </mesh>
      ))}

      {/* L2 cache slices */}
      {l2Cache.map(([x, z], i) => (
        <mesh key={i} position={[x, H + 0.003, z]}>
          <boxGeometry args={[0.35, 0.006, 2.2]} />
          <meshStandardMaterial color={0x0a0a20} metalness={0.55} roughness={0.2} />
        </mesh>
      ))}

      {/* NVLink interconnect pads (along top/bottom edges) */}
      {Array.from({ length: 18 }, (_, i) => (
        <mesh key={i} position={[(i - 8.5) * 0.15, H + 0.004, D / 2 - 0.05]}>
          <boxGeometry args={[0.08, 0.005, 0.05]} />
          <primitive object={MAT_GPU.nvlinkGold} />
        </mesh>
      ))}
      {Array.from({ length: 18 }, (_, i) => (
        <mesh key={i} position={[(i - 8.5) * 0.15, H + 0.004, -D / 2 + 0.05]}>
          <boxGeometry args={[0.08, 0.005, 0.05]} />
          <primitive object={MAT_GPU.nvlinkGold} />
        </mesh>
      ))}

      {/* Die edge bond pads */}
      {Array.from({ length: 20 }, (_, i) => (
        <mesh key={i} position={[W / 2 - 0.025, H + 0.004, (i - 9.5) * 0.12]}>
          <boxGeometry args={[0.05, 0.004, 0.06]} />
          <primitive object={MAT_GPU.bgaGold} />
        </mesh>
      ))}

      {/* Highlight */}
      {isSelected && (
        <mesh position={[0, H / 2, 0]}>
          <boxGeometry args={[W + 0.08, H + 0.08, D + 0.08]} />
          <primitive object={MAT_GPU.highlightAmber} />
        </mesh>
      )}
    </group>
  );
}

// ─── PCB Surface Components ───────────────────────────────────────────────────

const CAP_POSITIONS = Array.from({ length: 120 }, (_, i) => ({
  x: -4.5 + (i % 24) * 0.38 + (Math.floor(i / 24) % 2 === 0 ? 0 : 0.19),
  z: -3.2 + Math.floor(i / 24) * 0.65 + (i % 3) * 0.18,
  type: ["smd_cap", "smd_cap", "inductor", "mosfet"][i % 4] as string,
  rotation: (i * 37) % 360,
}));

const INDUCTOR_POSITIONS = Array.from({ length: 20 }, (_, i) => ({
  x: -4.2 + (i % 10) * 0.85,
  z: -3.5 + Math.floor(i / 10) * 0.6,
}));

function PCBComponents() {
  return (
    <group>
      {/* SMD capacitors */}
      {CAP_POSITIONS.filter(p => p.type === "smd_cap").slice(0, 80).map((p, i) => (
        <mesh key={i} position={[p.x, 0.022, p.z]} rotation={[0, (p.rotation * Math.PI) / 180, 0]}>
          <boxGeometry args={[0.05, 0.035, 0.03]} />
          <primitive object={i % 3 === 0 ? MAT_GPU.capBrown : MAT_GPU.capSilver} />
        </mesh>
      ))}

      {/* Power inductors */}
      {INDUCTOR_POSITIONS.map((p, i) => (
        <mesh key={i} position={[p.x, 0.025, p.z]}>
          <boxGeometry args={[0.12, 0.08, 0.12]} />
          <primitive object={MAT_GPU.inductorFerrite} />
        </mesh>
      ))}

      {/* MOSFETs / VRM FETs */}
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[-4.0 + i * 0.7, 0.03, 3.0]}>
          <boxGeometry args={[0.1, 0.045, 0.16]} />
          <primitive object={MAT_GPU.vrmFet} />
        </mesh>
      ))}

      {/* BGA solder balls underneath (visible from side) */}
      {Array.from({ length: 10 }, (_, i) =>
        Array.from({ length: 6 }, (_, j) => (
          <mesh key={`${i}-${j}`} position={[-2 + i * 0.45, -0.025, -2.5 + j * 0.5]}>
            <sphereGeometry args={[0.018, 6, 6]} />
            <primitive object={MAT_GPU.bgaGold} />
          </mesh>
        ))
      )}

      {/* Connectors */}
      <mesh position={[4.3, 0.05, 0.5]}>
        <boxGeometry args={[0.18, 0.08, 1.2]} />
        <primitive object={MAT_GPU.connector} />
      </mesh>
      <mesh position={[4.3, 0.05, -0.5]}>
        <boxGeometry args={[0.18, 0.08, 1.2]} />
        <primitive object={MAT_GPU.connector} />
      </mesh>
    </group>
  );
}

// ─── NVLink Bridge Connectors ─────────────────────────────────────────────────

function NVLinkConnectors({ isSelected, onClick }: { isSelected: boolean; onClick: () => void }) {
  return (
    <group onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* NVLink connector pads on long edges */}
      {[-1, 1].map((side, si) => (
        <group key={si} position={[0, 0, side * 3.8]}>
          <mesh>
            <boxGeometry args={[5.5, 0.06, 0.35]} />
            <primitive object={MAT_GPU.nvlinkConnector} />
          </mesh>
          {/* Gold contacts */}
          {Array.from({ length: 32 }, (_, i) => (
            <mesh key={i} position={[-2.4 + i * 0.155, 0.02, 0]}>
              <boxGeometry args={[0.06, 0.02, 0.28]} />
              <primitive object={MAT_GPU.nvlinkGold} />
            </mesh>
          ))}
        </group>
      ))}
      {isSelected && (
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[5.8, 0.12, 8.3]} />
          <primitive object={MAT_GPU.highlightGreen} />
        </mesh>
      )}
    </group>
  );
}

// ─── Heatspreader Lid ─────────────────────────────────────────────────────────

function Heatspreader({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <group>
      {/* Copper lid */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[5.8, 0.08, 7.8]} />
        <primitive object={MAT_GPU.heatspreader} />
      </mesh>
      {/* Thermal interface material (pink/grey visible at edges) */}
      <mesh position={[0, 0.14, 0]}>
        <boxGeometry args={[5.6, 0.03, 7.6]} />
        <primitive object={MAT_GPU.thermal} />
      </mesh>
      {/* Copper lid underside detail */}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[3.0, 0.02, 2.6]} />
        <primitive object={MAT_GPU.heatspreader} />
      </mesh>
    </group>
  );
}

// ─── VRM / CPU Components ─────────────────────────────────────────────────────

function CPUModule({ isSelected, onClick }: { isSelected: boolean; onClick: () => void }) {
  return (
    <group position={[-3.5, 0, 0]}>
      <mesh onClick={(e) => { e.stopPropagation(); onClick(); }} visible={false}>
        <boxGeometry args={[1.8, 0.5, 2.0]} />
        <meshBasicMaterial />
      </mesh>
      {/* CPU socket */}
      <mesh castShadow>
        <boxGeometry args={[1.6, 0.06, 1.8]} />
        <meshStandardMaterial color={0x0a1820} metalness={0.5} roughness={0.6} />
      </mesh>
      {/* CPU Die */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[1.1, 0.05, 1.2]} />
        <meshStandardMaterial color={0x1a3a1a} metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Heatspreader */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[1.15, 0.04, 1.25]} />
        <primitive object={MAT_GPU.heatspreader} />
      </mesh>
      {/* Lid branding groove */}
      <mesh position={[0, 0.13, 0]}>
        <boxGeometry args={[0.6, 0.002, 0.25]} />
        <meshStandardMaterial color={0x8a5030} metalness={0.5} roughness={0.5} />
      </mesh>
      {isSelected && (
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[1.7, 0.3, 1.9]} />
          <primitive object={MAT_GPU.highlightGreen} />
        </mesh>
      )}
    </group>
  );
}

// ─── RAM DIMMs ────────────────────────────────────────────────────────────────

function RAMModules({ isSelected, onClick }: { isSelected: boolean; onClick: () => void }) {
  return (
    <group position={[-3.5, 0, 2.5]}>
      {/* 8 DIMM slots */}
      {Array.from({ length: 8 }, (_, i) => (
        <group key={i} position={[0, 0, (i - 3.5) * 0.28]}>
          {/* PCB */}
          <mesh castShadow onClick={(e) => { e.stopPropagation(); onClick(); }}>
            <boxGeometry args={[1.35, 0.26, 0.04]} />
            <meshStandardMaterial color={0x0a2010} metalness={0.15} roughness={0.75} />
          </mesh>
          {/* Gold contacts at bottom */}
          <mesh position={[0, -0.12, 0]}>
            <boxGeometry args={[1.3, 0.02, 0.04]} />
            <primitive object={MAT_GPU.bgaGold} />
          </mesh>
          {/* DRAM chips on DIMM */}
          {Array.from({ length: 8 }, (_, ci) => (
            <mesh key={ci} position={[-0.5 + ci * 0.14, 0.04, 0.022]}>
              <boxGeometry args={[0.1, 0.06, 0.002]} />
              <meshStandardMaterial color={0x050808} metalness={0.4} roughness={0.4} />
            </mesh>
          ))}
          {/* SPD chip */}
          <mesh position={[0.55, 0.06, 0.022]}>
            <boxGeometry args={[0.06, 0.04, 0.002]} />
            <meshStandardMaterial color={0x0d0d0d} metalness={0.3} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {isSelected && (
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[1.5, 0.4, 2.4]} />
          <primitive object={MAT_GPU.highlight} />
        </mesh>
      )}
    </group>
  );
}

// ─── Cooling Block ────────────────────────────────────────────────────────────

function LiquidCoolingBlock({ isSelected, onClick }: { isSelected: boolean; onClick: () => void }) {
  return (
    <group position={[0, 0.2, 0]}>
      <mesh onClick={(e) => { e.stopPropagation(); onClick(); }} visible={false} castShadow>
        <boxGeometry args={[5.9, 0.5, 7.9]} />
        <meshBasicMaterial />
      </mesh>
      {/* Main cooling block body - nickel-plated copper */}
      <mesh castShadow>
        <boxGeometry args={[5.8, 0.25, 7.8]} />
        <meshStandardMaterial color={0xaaaaaa} metalness={0.95} roughness={0.1} />
      </mesh>
      {/* Micro-fin channels visible from edge */}
      {Array.from({ length: 20 }, (_, i) => (
        <mesh key={i} position={[(i - 9.5) * 0.27, 0.05, 0]}>
          <boxGeometry args={[0.04, 0.2, 7.6]} />
          <meshStandardMaterial color={0xbbbbbb} metalness={0.95} roughness={0.08} />
        </mesh>
      ))}
      {/* Inlet/outlet fittings */}
      {[-1.5, 1.5].map((x, i) => (
        <group key={i} position={[x, 0.2, -3.8]}>
          <mesh>
            <cylinderGeometry args={[0.15, 0.15, 0.4, 12]} />
            <meshStandardMaterial color={0x888888} metalness={0.9} roughness={0.15} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.12, 12]} />
            <meshStandardMaterial color={0x333333} metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {/* Coolant glow */}
      <pointLight position={[0, 0.5, 0]} color={0x0066ff} intensity={1.5} distance={4} decay={2} />
      {isSelected && (
        <mesh>
          <boxGeometry args={[6.0, 0.35, 8.0]} />
          <primitive object={MAT_GPU.highlight} />
        </mesh>
      )}
    </group>
  );
}

// ─── Camera Animation for GPU Scene ──────────────────────────────────────────

function GPUCamera({ scene, focusedComponent }: { scene: AppScene; focusedComponent: ComponentFocus | null }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0.5, 0));
  const posTarget = useRef(new THREE.Vector3(0, 8, 8));

  useEffect(() => {
    if (focusedComponent?.id === "hbm") {
      posTarget.current.set(2.5, 3, 0);
      target.current.set(2.5, 0.5, 0);
    } else if (focusedComponent?.id === "gpu_die") {
      posTarget.current.set(0, 4, 0);
      target.current.set(0, 0, 0);
    } else if (focusedComponent?.id === "nvlink") {
      posTarget.current.set(0, 5, 5);
      target.current.set(0, 0, 3);
    } else if (focusedComponent?.id === "cpu") {
      posTarget.current.set(-5, 4, 0);
      target.current.set(-3.5, 0, 0);
    } else if (focusedComponent?.id === "ram") {
      posTarget.current.set(-5, 4, 3);
      target.current.set(-3.5, 0, 2.5);
    } else if (focusedComponent?.id === "cooling") {
      posTarget.current.set(0, 5, 2);
      target.current.set(0, 0.2, 0);
    } else {
      posTarget.current.set(0, 9, 10);
      target.current.set(0, 0.5, 0);
    }
  }, [focusedComponent, scene]);

  useFrame((_, delta) => {
    camera.position.lerp(posTarget.current, delta * 2.5);
    const look = new THREE.Vector3().lerpVectors(camera.position, target.current, 1);
    camera.lookAt(look);
  });

  return null;
}

// ─── Full GPU Board (H100 SXM5) ──────────────────────────────────────────────

function H100Board({
  focusedComponent, onSelectComponent, scene,
}: {
  focusedComponent: ComponentFocus | null;
  onSelectComponent: (comp: ComponentFocus) => void;
  scene: AppScene;
}) {
  const [showHeatspreader] = useState(false);
  const W = 10.4, D = 8.2; // H100 SXM5 substrate ~131mm × 103mm (scaled ~80×)

  const sel = (id: ComponentFocus["id"]) => focusedComponent?.id === id;

  // HBM3 positions: 3 left, 3 right of central die
  const hbmPositions: [number, number, number][] = [
    [-1.95, 0.02, -2.1], [-1.95, 0.02, 0], [-1.95, 0.02, 2.1],
    [1.95, 0.02, -2.1], [1.95, 0.02, 0], [1.95, 0.02, 2.1],
  ];

  return (
    <group>
      {/* ── PCB Substrate ── */}
      <mesh position={[0, 0, 0]} receiveShadow castShadow>
        <boxGeometry args={[W, 0.04, D]} />
        <primitive object={MAT_GPU.pcb} />
      </mesh>
      {/* PCB Bottom */}
      <mesh position={[0, -0.022, 0]}>
        <boxGeometry args={[W - 0.05, 0.004, D - 0.05]} />
        <primitive object={MAT_GPU.pcbBottom} />
      </mesh>
      {/* PCB trace layers (subtle green lines) */}
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[-W / 2 + 0.5 + i * 0.8, 0.021, 0]}>
          <boxGeometry args={[0.004, 0.002, D - 0.2]} />
          <meshStandardMaterial color={0x1a5020} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[0, 0.021, -D / 2 + 0.5 + i * 0.9]}>
          <boxGeometry args={[W - 0.2, 0.002, 0.004]} />
          <meshStandardMaterial color={0x1a5020} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}

      {/* ── PCB surface components ── */}
      <PCBComponents />

      {/* ── HBM3 Stacks (Micron) ── */}
      {hbmPositions.map((pos, i) => (
        <HBMStack
          key={i}
          position={pos}
          isSelected={sel("hbm")}
          onClick={() => onSelectComponent({ id: "hbm", rackId: focusedComponent?.rackId ?? 0 })}
        />
      ))}

      {/* ── Central H100 GPU Die ── */}
      <GPUDie
        isSelected={sel("gpu_die")}
        onClick={() => onSelectComponent({ id: "gpu_die", rackId: focusedComponent?.rackId ?? 0 })}
      />

      {/* ── NVLink Connectors ── */}
      <NVLinkConnectors
        isSelected={sel("nvlink")}
        onClick={() => onSelectComponent({ id: "nvlink", rackId: focusedComponent?.rackId ?? 0 })}
      />

      {/* ── CPU Socket ── */}
      <CPUModule
        isSelected={sel("cpu")}
        onClick={() => onSelectComponent({ id: "cpu", rackId: focusedComponent?.rackId ?? 0 })}
      />

      {/* ── RAM DIMMs ── */}
      <RAMModules
        isSelected={sel("ram")}
        onClick={() => onSelectComponent({ id: "ram", rackId: focusedComponent?.rackId ?? 0 })}
      />

      {/* ── Liquid Cooling Block ── */}
      {sel("cooling") || scene === "component" ? (
        <LiquidCoolingBlock
          isSelected={sel("cooling")}
          onClick={() => onSelectComponent({ id: "cooling", rackId: focusedComponent?.rackId ?? 0 })}
        />
      ) : null}

      {/* ── Heatspreader Lid ── */}
      <Heatspreader visible={showHeatspreader} />

      {/* ── SXM mounting screws ── */}
      {[[-W / 2 + 0.2, D / 2 - 0.2], [W / 2 - 0.2, D / 2 - 0.2], [-W / 2 + 0.2, -D / 2 + 0.2], [W / 2 - 0.2, -D / 2 + 0.2]].map(([x, z], i) => (
        <group key={i} position={[x, 0.04, z]}>
          <mesh>
            <cylinderGeometry args={[0.12, 0.12, 0.06, 8]} />
            <meshStandardMaterial color={0x888888} metalness={0.9} roughness={0.15} />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.03, 6]} />
            <meshStandardMaterial color={0x666666} metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Emissive glow from GPU die area */}
      <pointLight position={[0, 1.5, 0]} color={0x2222aa} intensity={2} distance={8} decay={2} />
      <pointLight position={[-1.9, 1, 0]} color={0x550022} intensity={1.5} distance={5} decay={2} />
      <pointLight position={[1.9, 1, 0]} color={0x550022} intensity={1.5} distance={5} decay={2} />
    </group>
  );
}

// ─── Floating Label Hotspots (3D clickable annotations) ──────────────────────

function ClickHotspot({
  position, label, color, onClick, isActive,
}: {
  position: [number, number, number];
  label: string;
  color: number;
  onClick: () => void;
  isActive: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.5 + position[0]) * 0.05;
    }
  });

  return (
    <group position={[position[0], 0, position[2]]}>
      <mesh ref={meshRef} onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isActive ? 3 : 1.5}
          roughness={0.5}
        />
      </mesh>
      {/* Glow ring */}
      <mesh position={[0, position[1], 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.28, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 2 : 0.8} transparent opacity={0.5} />
      </mesh>
      <pointLight position={[0, position[1] + 0.3, 0]} color={color} intensity={isActive ? 3 : 1} distance={2} decay={2} />
    </group>
  );
}

// ─── GPU Board Scene ──────────────────────────────────────────────────────────

interface GPUBoardProps {
  rackId: number;
  focusedComponent: ComponentFocus | null;
  scene: AppScene;
  onSelectComponent: (comp: ComponentFocus) => void;
}

export function GPUBoardScene({ rackId, focusedComponent, scene, onSelectComponent }: GPUBoardProps) {
  const hasOrbit = scene === "gpu";

  const HOTSPOTS: Array<{
    pos: [number, number, number];
    label: string;
    color: number;
    id: ComponentFocus["id"];
  }> = [
    { pos: [0, 1.2, 0], label: "H100 GPU Die", color: 0xff6600, id: "gpu_die" },
    { pos: [-1.9, 1.5, -2.1], label: "HBM3 Stack (Micron)", color: 0xcc0033, id: "hbm" },
    { pos: [1.9, 1.5, 2.1], label: "HBM3 Stack (Micron)", color: 0xcc0033, id: "hbm" },
    { pos: [0, 0.8, -3.8], label: "NVLink 4.0", color: 0x00cc66, id: "nvlink" },
    { pos: [-3.5, 0.8, 0], label: "AMD EPYC CPU", color: 0x00aaff, id: "cpu" },
    { pos: [-3.5, 0.8, 2.5], label: "DDR5 RAM", color: 0x8800ff, id: "ram" },
    { pos: [0, 1.8, 0], label: "Liquid Cooling", color: 0x0088ff, id: "cooling" },
  ];

  return (
    <>
      {/* Environment */}
      <color attach="background" args={[0x030508]} />
      <ambientLight intensity={0.08} color={0x101830} />
      <Environment preset="night" />
      <fog attach="fog" args={[0x030508, 15, 50]} />

      {/* Key lights */}
      <directionalLight position={[5, 10, 5]} intensity={1.2} color={0xe0f0ff} castShadow
        shadow-mapSize={[2048, 2048]} shadow-camera-near={0.5} shadow-camera-far={50}
        shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10}
      />
      <directionalLight position={[-5, 6, -3]} intensity={0.5} color={0x2030aa} />
      <pointLight position={[0, 6, 0]} color={0xffffff} intensity={3} distance={20} decay={2} />

      {/* Camera */}
      {hasOrbit ? (
        <OrbitControls
          target={[0, 0.5, 0]}
          minDistance={3}
          maxDistance={22}
          enablePan={true}
          enableDamping
          dampingFactor={0.06}
        />
      ) : (
        <GPUCamera scene={scene} focusedComponent={focusedComponent} />
      )}

      {/* Ground plane for reflections */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color={0x050810} metalness={0.5} roughness={0.6} />
      </mesh>

      {/* The GPU Board */}
      <group position={[0, 0, 0]}>
        <H100Board
          focusedComponent={focusedComponent}
          onSelectComponent={onSelectComponent}
          scene={scene}
        />
      </group>

      {/* Click hotspots (only in rack/gpu scene, not component inspect) */}
      {scene === "gpu" && HOTSPOTS.map((h, i) => (
        <ClickHotspot
          key={i}
          position={h.pos}
          label={h.label}
          color={h.color}
          onClick={() => onSelectComponent({ id: h.id, rackId })}
          isActive={focusedComponent?.id === h.id}
        />
      ))}
    </>
  );
}
