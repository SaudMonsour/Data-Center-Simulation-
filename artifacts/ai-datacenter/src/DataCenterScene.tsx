import { useRef, useEffect, useState, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Float } from "@react-three/drei";
import * as THREE from "three";
import { AppScene } from "./App";

// ── Materials (created once) ─────────────────────────────────────────────────

const MAT = {
  rackBody: new THREE.MeshStandardMaterial({ color: 0x111216, metalness: 0.85, roughness: 0.25 }),
  rackFrame: new THREE.MeshStandardMaterial({ color: 0x1a1c22, metalness: 0.9, roughness: 0.15 }),
  serverSled: new THREE.MeshStandardMaterial({ color: 0x1a2030, metalness: 0.7, roughness: 0.3 }),
  serverPanel: new THREE.MeshStandardMaterial({ color: 0x0d1420, metalness: 0.5, roughness: 0.6 }),
  floor: new THREE.MeshStandardMaterial({ color: 0x1a1c24, metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide }),
  floorTile: new THREE.MeshStandardMaterial({ color: 0x16181f, metalness: 0.55, roughness: 0.4, side: THREE.DoubleSide }),
  ceiling: new THREE.MeshStandardMaterial({ color: 0x12141a, metalness: 0.3, roughness: 0.7 }),
  wall: new THREE.MeshStandardMaterial({ color: 0x141620, metalness: 0.2, roughness: 0.8 }),
  ledGreen: new THREE.MeshStandardMaterial({ color: 0x00ff66, emissive: 0x00ff66, emissiveIntensity: 2.5, roughness: 1 }),
  ledAmber: new THREE.MeshStandardMaterial({ color: 0xff9900, emissive: 0xff9900, emissiveIntensity: 2.5, roughness: 1 }),
  ledBlue: new THREE.MeshStandardMaterial({ color: 0x0099ff, emissive: 0x0099ff, emissiveIntensity: 1.5, roughness: 1 }),
  ceilingLight: new THREE.MeshStandardMaterial({ color: 0xd0e8ff, emissive: 0xd0e8ff, emissiveIntensity: 3, roughness: 1 }),
  cableTray: new THREE.MeshStandardMaterial({ color: 0x282c38, metalness: 0.8, roughness: 0.3 }),
  cableBlue: new THREE.MeshStandardMaterial({ color: 0x0040aa, roughness: 0.9, metalness: 0 }),
  cableOrange: new THREE.MeshStandardMaterial({ color: 0xcc5500, roughness: 0.9, metalness: 0 }),
  cableYellow: new THREE.MeshStandardMaterial({ color: 0xaaaa00, roughness: 0.9, metalness: 0 }),
  vent: new THREE.MeshStandardMaterial({ color: 0x0a0c10, metalness: 0.6, roughness: 0.5 }),
  rackDoor: new THREE.MeshStandardMaterial({ color: 0x0d0f14, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide }),
  highlight: new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 0.4, transparent: true, opacity: 0.15, depthWrite: false }),
};

// ── Geometry ─────────────────────────────────────────────────────────────────

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const sphereGeo = new THREE.SphereGeometry(0.03, 8, 8);

// ── Pre-calculated randomness ─────────────────────────────────────────────────

const SLED_CONFIGS = Array.from({ length: 16 }, (_, i) => ({
  color: [0x00ff44, 0x00ff44, 0xff8800, 0x0088ff][(i * 3 + i) % 4],
  blink: Math.random() > 0.3,
  blinkSpeed: 0.5 + Math.random() * 2,
  blinkPhase: Math.random() * Math.PI * 2,
}));

// ── Floor Tiles ───────────────────────────────────────────────────────────────

function FloorTiles({ cols = 30, rows = 16 }: { cols?: number; rows?: number }) {
  const tileSize = 0.6096; // 24 inches = standard data center raised floor tile
  const offset = { x: cols * tileSize / 2, z: rows * tileSize / 2 };
  const tiles = useMemo(() => {
    const arr: { x: number; z: number; hasVent: boolean }[] = [];
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        arr.push({ x: i * tileSize - offset.x, z: j * tileSize - offset.z, hasVent: (i + j) % 4 === 0 });
      }
    }
    return arr;
  }, [cols, rows]);

  return (
    <group position={[0, 0, 0]}>
      {/* Base floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[cols * tileSize + 2, rows * tileSize + 2]} />
        <meshStandardMaterial color={0x0d0f14} metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Tiles */}
      {tiles.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
            <planeGeometry args={[tileSize - 0.01, tileSize - 0.01]} />
            <meshStandardMaterial
              color={t.hasVent ? 0x0a0c10 : 0x16181f}
              metalness={0.6} roughness={0.4}
            />
          </mesh>
          {/* Tile groove lines */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
            <planeGeometry args={[tileSize, 0.005]} />
            <meshStandardMaterial color={0x070810} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, Math.PI / 2, 0]} position={[0, 0.002, 0]}>
            <planeGeometry args={[tileSize, 0.005]} />
            <meshStandardMaterial color={0x070810} />
          </mesh>
          {/* Vent holes */}
          {t.hasVent && Array.from({ length: 6 }).map((_, vi) =>
            Array.from({ length: 4 }).map((_, vj) => (
              <mesh key={`${vi}-${vj}`} rotation={[-Math.PI / 2, 0, 0]} position={[(vi - 2.5) * 0.08, 0.002, (vj - 1.5) * 0.1]}>
                <planeGeometry args={[0.05, 0.05]} />
                <primitive object={MAT.vent} />
              </mesh>
            ))
          )}
        </group>
      ))}
    </group>
  );
}

// ── Ceiling ───────────────────────────────────────────────────────────────────

function Ceiling({ width = 20, depth = 12 }: { width?: number; depth?: number }) {
  const H = 3.8;
  const lightPositions = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => [-width / 2 + 2 + i * (width / 5.5), H - 0.05, 0]), [width, H]);

  return (
    <group>
      {/* Ceiling panel */}
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width + 2, depth + 2]} />
        <primitive object={MAT.ceiling} />
      </mesh>

      {/* Walls */}
      {[
        { pos: [0, H / 2, -depth / 2 - 0.05] as [number, number, number], rot: [0, 0, 0] as [number, number, number], w: width + 2, h: H },
        { pos: [0, H / 2, depth / 2 + 0.05] as [number, number, number], rot: [0, Math.PI, 0] as [number, number, number], w: width + 2, h: H },
        { pos: [-width / 2 - 0.05, H / 2, 0] as [number, number, number], rot: [0, Math.PI / 2, 0] as [number, number, number], w: depth + 2, h: H },
        { pos: [width / 2 + 0.05, H / 2, 0] as [number, number, number], rot: [0, -Math.PI / 2, 0] as [number, number, number], w: depth + 2, h: H },
      ].map((w, i) => (
        <mesh key={i} position={w.pos} rotation={w.rot}>
          <planeGeometry args={[w.w, w.h]} />
          <primitive object={MAT.wall} />
        </mesh>
      ))}

      {/* Cable tray */}
      <mesh position={[0, H - 0.3, 0]}>
        <boxGeometry args={[width, 0.08, 0.5]} />
        <primitive object={MAT.cableTray} />
      </mesh>

      {/* Cables in tray */}
      {[-0.15, -0.05, 0.05, 0.15].map((z, i) => (
        <mesh key={i} position={[0, H - 0.25, z]}>
          <boxGeometry args={[width - 0.2, 0.04, 0.03]} />
          <primitive object={[MAT.cableBlue, MAT.cableOrange, MAT.cableYellow, MAT.cableBlue][i]} />
        </mesh>
      ))}

      {/* LED light strips */}
      {lightPositions.map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <mesh>
            <boxGeometry args={[1.2, 0.06, 0.12]} />
            <meshStandardMaterial color={0x2a2e3a} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.04, 0]}>
            <boxGeometry args={[1.1, 0.01, 0.1]} />
            <primitive object={MAT.ceilingLight} />
          </mesh>
          <pointLight position={[0, -0.15, 0]} color={0xd0e8ff} intensity={8} distance={5} decay={2} castShadow />
        </group>
      ))}

      {/* Ambient strip along aisles */}
      <mesh position={[0, H - 0.02, -1.5]}>
        <boxGeometry args={[width, 0.01, 0.05]} />
        <meshStandardMaterial color={0x00aaff} emissive={0x0044aa} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, H - 0.02, 1.5]}>
        <boxGeometry args={[width, 0.01, 0.05]} />
        <meshStandardMaterial color={0x00aaff} emissive={0x0044aa} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// ── Server Sled ───────────────────────────────────────────────────────────────

function ServerSled({ y, sledIndex, rackLoad }: { y: number; sledIndex: number; rackLoad: number }) {
  const cfg = SLED_CONFIGS[sledIndex % SLED_CONFIGS.length];
  const ledRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (!ledRef.current) return;
    const mat = ledRef.current.material as THREE.MeshStandardMaterial;
    if (cfg.blink) {
      const on = Math.sin(clock.elapsedTime * cfg.blinkSpeed + cfg.blinkPhase) > 0;
      mat.emissiveIntensity = on ? 2.5 : 0.1;
    }
  });

  return (
    <group position={[0, y, 0]}>
      {/* Sled chassis */}
      <mesh castShadow>
        <boxGeometry args={[0.43, 0.042, 0.84]} />
        <primitive object={MAT.serverSled} />
      </mesh>
      {/* Front panel */}
      <mesh position={[0, 0, -0.42]}>
        <boxGeometry args={[0.43, 0.042, 0.002]} />
        <primitive object={MAT.serverPanel} />
      </mesh>
      {/* Power button */}
      <mesh position={[-0.17, 0, -0.422]}>
        <cylinderGeometry args={[0.008, 0.008, 0.002, 8]} />
        <meshStandardMaterial color={0x003366} emissive={0x0066ff} emissiveIntensity={0.5} />
      </mesh>
      {/* Activity LEDs */}
      <mesh ref={ledRef} position={[-0.12, 0, -0.422]}>
        <sphereGeometry args={[0.004, 6, 6]} />
        <meshStandardMaterial
          color={cfg.color}
          emissive={cfg.color}
          emissiveIntensity={cfg.blink ? 2.5 : 1.5}
          roughness={1}
        />
      </mesh>
      <mesh position={[-0.08, 0, -0.422]}>
        <sphereGeometry args={[0.004, 6, 6]} />
        <meshStandardMaterial color={0x00ff44} emissive={0x00ff44} emissiveIntensity={1.5} roughness={1} />
      </mesh>
      {/* Port panel (SFP/QSFP) */}
      <group position={[0.1, 0, -0.422]}>
        {[0, 0.02, 0.04, 0.06].map((ox, i) => (
          <mesh key={i} position={[ox, 0, 0]}>
            <boxGeometry args={[0.016, 0.02, 0.002]} />
            <meshStandardMaterial color={0x1a2a3a} metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
      </group>
      {/* PCIe slot visible from back */}
      <mesh position={[0, -0.015, 0.35]}>
        <boxGeometry args={[0.3, 0.01, 0.05]} />
        <meshStandardMaterial color={0x0a1020} metalness={0.4} roughness={0.6} />
      </mesh>
    </group>
  );
}

// ── Rack ──────────────────────────────────────────────────────────────────────

const RACK_LOAD = [0.9, 0.95, 0.85, 0.7, 0.88, 0.6, 0.95, 0.9, 0.75, 0.85, 0.65, 0.7, 0.88, 0.7, 0.85, 0.65, 0.7, 0.72];

function Rack3D({
  position, rackId, isSelected, isOpen, onClick,
}: {
  position: [number, number, number];
  rackId: number;
  isSelected: boolean;
  isOpen: boolean;
  onClick: () => void;
}) {
  const doorRef = useRef<THREE.Group>(null!);
  const load = RACK_LOAD[rackId % RACK_LOAD.length];
  const ledColor = load > 0.9 ? 0xff8800 : 0x00ff44;
  const doorTarget = isOpen ? Math.PI / 1.6 : 0;
  const doorAngle = useRef(0);

  useFrame((_, delta) => {
    if (!doorRef.current) return;
    doorAngle.current += (doorTarget - doorAngle.current) * Math.min(1, delta * 4);
    doorRef.current.rotation.y = doorAngle.current;
  });

  const W = 0.48, H = 2.1, D = 0.92;
  const sledCount = 14;

  return (
    <group position={position}>
      {/* Clickable hitbox */}
      <mesh onClick={(e) => { e.stopPropagation(); onClick(); }} visible={false}>
        <boxGeometry args={[W + 0.1, H + 0.1, D + 0.1]} />
        <meshBasicMaterial />
      </mesh>

      {/* Frame vertical posts */}
      {[-W / 2 + 0.02, W / 2 - 0.02].map((x, i) =>
        [-D / 2 + 0.02, D / 2 - 0.02].map((z, j) => (
          <mesh key={`${i}-${j}`} position={[x, H / 2, z]} castShadow>
            <boxGeometry args={[0.025, H, 0.025]} />
            <primitive object={MAT.rackFrame} />
          </mesh>
        ))
      )}

      {/* Top/bottom panels */}
      {[0.02, H - 0.02].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} castShadow>
          <boxGeometry args={[W, 0.025, D]} />
          <primitive object={MAT.rackBody} />
        </mesh>
      ))}

      {/* Side panels */}
      {[-W / 2, W / 2].map((x, i) => (
        <mesh key={i} position={[x, H / 2, 0]} castShadow>
          <boxGeometry args={[0.012, H - 0.05, D - 0.04]} />
          <primitive object={MAT.rackBody} />
        </mesh>
      ))}

      {/* Back panel */}
      <mesh position={[0, H / 2, D / 2 - 0.006]}>
        <boxGeometry args={[W - 0.025, H - 0.05, 0.012]} />
        <primitive object={MAT.rackBody} />
      </mesh>

      {/* Server sleds */}
      {Array.from({ length: sledCount }, (_, i) => (
        <ServerSled
          key={i}
          y={0.12 + i * (H - 0.25) / sledCount}
          sledIndex={rackId * sledCount + i}
          rackLoad={load}
        />
      ))}

      {/* 1U switch at top */}
      <mesh position={[0, H - 0.08, -0.1]} castShadow>
        <boxGeometry args={[0.44, 0.035, 0.7]} />
        <meshStandardMaterial color={0x0d2030} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* PDU at back top */}
      <mesh position={[0.18, H / 2, D / 2 - 0.05]}>
        <boxGeometry args={[0.04, H - 0.15, 0.03]} />
        <meshStandardMaterial color={0x1a0a00} metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Status LEDs column */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-W / 2 + 0.04, 0.15 + i * 0.32, -D / 2 + 0.01]}>
          <sphereGeometry args={[0.006, 6, 6]} />
          <meshStandardMaterial
            color={i === 2 ? 0xff8800 : ledColor}
            emissive={i === 2 ? 0xff8800 : ledColor}
            emissiveIntensity={2}
            roughness={1}
          />
        </mesh>
      ))}

      {/* Front door (hinges at left side) */}
      <group ref={doorRef} position={[-W / 2, H / 2, -D / 2]}>
        <mesh position={[W / 2, 0, -0.006]}>
          <boxGeometry args={[W, H - 0.05, 0.012]} />
          <primitive object={MAT.rackDoor} />
        </mesh>
        {/* Door mesh pattern */}
        {Array.from({ length: 8 }, (_, i) =>
          Array.from({ length: 3 }, (_, j) => (
            <mesh key={`${i}-${j}`} position={[0.06 + j * 0.14, -H / 2 + 0.15 + i * 0.24, -0.008]}>
              <boxGeometry args={[0.08, 0.18, 0.004]} />
              <meshStandardMaterial color={0x070810} metalness={0.3} roughness={0.8} />
            </mesh>
          ))
        )}
      </group>

      {/* Highlight overlay when selected */}
      {isSelected && (
        <mesh position={[0, H / 2, 0]}>
          <boxGeometry args={[W + 0.02, H + 0.02, D + 0.02]} />
          <primitive object={MAT.highlight} />
        </mesh>
      )}

      {/* Load indicator light */}
      <pointLight
        position={[0, H + 0.1, -D / 2 - 0.05]}
        color={ledColor}
        intensity={load > 0.9 ? 1.5 : 0.8}
        distance={1.5}
        decay={3}
      />
    </group>
  );
}

// ── Rack Row ──────────────────────────────────────────────────────────────────

function RackRow({
  z, rowIndex, selectedRack, openRack, onRackClick,
}: {
  z: number; rowIndex: number;
  selectedRack: number | null; openRack: number | null;
  onRackClick: (id: number) => void;
}) {
  const count = 6;
  const spacing = 0.56;
  const startX = -((count - 1) * spacing) / 2;

  return (
    <group position={[0, 0, z]}>
      {/* Row label on ceiling */}
      {Array.from({ length: count }, (_, i) => {
        const rackId = rowIndex * count + i;
        return (
          <Rack3D
            key={rackId}
            position={[startX + i * spacing, 0, 0]}
            rackId={rackId}
            isSelected={selectedRack === rackId}
            isOpen={openRack === rackId}
            onClick={() => onRackClick(rackId)}
          />
        );
      })}
    </group>
  );
}

// ── First-Person Controller ───────────────────────────────────────────────────

function FirstPersonController({
  enabled, onLockChange,
}: {
  enabled: boolean;
  onLockChange: (state: "locked" | "unlocked") => void;
}) {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const mouse = useRef({ dx: 0, dy: 0 });
  const isDown = useRef(false);
  const yaw = useRef(-Math.PI / 2); // face down -Z aisle
  const pitch = useRef(0.05);
  const locked = useRef(false);

  useEffect(() => {
    camera.position.set(0, 1.65, 4.5);
    camera.rotation.order = "YXZ";
  }, [camera]);

  useEffect(() => {
    if (!enabled) return;

    const onKey = (e: KeyboardEvent) => { keys.current[e.code] = e.type === "keydown"; };
    const onMouseDown = (e: MouseEvent) => { if (e.button === 0) { isDown.current = true; } };
    const onMouseUp = () => { isDown.current = false; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDown.current && !locked.current) return;
      mouse.current.dx += e.movementX || (e as any).mozMovementX || 0;
      mouse.current.dy += e.movementY || (e as any).mozMovementY || 0;
    };

    const onLock = () => { locked.current = true; onLockChange("locked"); };
    const onUnlock = () => { locked.current = false; onLockChange("unlocked"); };

    const onCanvasClick = () => {
      if (!locked.current) {
        gl.domElement.requestPointerLock?.().catch(() => {});
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", onKey);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onLock);
    document.addEventListener("pointerlockchange", () => {
      if (!document.pointerLockElement) onUnlock();
    });
    gl.domElement.addEventListener("click", onCanvasClick);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup", onKey);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);
      gl.domElement.removeEventListener("click", onCanvasClick);
      document.exitPointerLock?.();
    };
  }, [enabled, gl, onLockChange]);

  useFrame((_, delta) => {
    if (!enabled) return;
    const sensitivity = 0.0025;
    yaw.current -= mouse.current.dx * sensitivity;
    pitch.current -= mouse.current.dy * sensitivity;
    pitch.current = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch.current));
    mouse.current.dx = 0;
    mouse.current.dy = 0;

    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");

    const speed = keys.current["ShiftLeft"] ? 5 : 2.8;
    const forward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    const right = new THREE.Vector3(Math.cos(yaw.current), 0, -Math.sin(yaw.current));

    if (keys.current["KeyW"] || keys.current["ArrowUp"]) camera.position.addScaledVector(forward, speed * delta);
    if (keys.current["KeyS"] || keys.current["ArrowDown"]) camera.position.addScaledVector(forward, -speed * delta);
    if (keys.current["KeyA"] || keys.current["ArrowLeft"]) camera.position.addScaledVector(right, -speed * delta);
    if (keys.current["KeyD"] || keys.current["ArrowRight"]) camera.position.addScaledVector(right, speed * delta);

    // Clamp to room
    camera.position.x = Math.max(-9, Math.min(9, camera.position.x));
    camera.position.z = Math.max(-5.5, Math.min(5.5, camera.position.z));
    camera.position.y = 1.65;
  });

  return null;
}

// ── Rack Inspect Camera ───────────────────────────────────────────────────────

function RackInspectCamera({ rackId, scene }: { rackId: number; scene: AppScene }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3());
  const posTarget = useRef(new THREE.Vector3());

  useEffect(() => {
    const count = 6;
    const spacing = 0.56;
    const startX = -((count - 1) * spacing) / 2;
    const rowIndex = Math.floor(rackId / count);
    const colIndex = rackId % count;
    const rackX = startX + colIndex * spacing;
    const rackZ = (rowIndex - 1) * 3.2;

    target.current.set(rackX, 1.05, rackZ);
    posTarget.current.set(rackX, 1.2, rackZ - 1.4);
  }, [rackId]);

  useFrame((_, delta) => {
    if (scene !== "rack") return;
    camera.position.lerp(posTarget.current, delta * 3);
    const lookAt = new THREE.Vector3().lerpVectors(camera.position, target.current, 1);
    camera.lookAt(lookAt);
  });

  return null;
}

// ── Main DataCenter Scene ─────────────────────────────────────────────────────

interface Props {
  scene: AppScene;
  focusedRack: number | null;
  onSelectRack: (id: number) => void;
  onEnterRack: (id: number) => void;
  onLockChange: (state: "locked" | "unlocked") => void;
}

export function DataCenterScene({ scene, focusedRack, onSelectRack, onEnterRack, onLockChange }: Props) {
  const [openRack, setOpenRack] = useState<number | null>(null);
  const isWalking = scene === "datacenter";

  const handleRackClick = (id: number) => {
    if (scene === "datacenter") {
      onSelectRack(id);
      setOpenRack(id);
    } else if (scene === "rack" && id === focusedRack) {
      onEnterRack(id);
    }
  };

  useEffect(() => {
    if (scene === "rack" && focusedRack !== null) setOpenRack(focusedRack);
    if (scene === "datacenter") setOpenRack(null);
  }, [scene, focusedRack]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.12} color={0x1a2040} />
      <fog attach="fog" args={[0x050810, 8, 28]} />
      <Environment preset="night" />

      {/* Controllers */}
      <FirstPersonController enabled={isWalking} onLockChange={onLockChange} />
      {scene === "rack" && focusedRack !== null && (
        <RackInspectCamera rackId={focusedRack} scene={scene} />
      )}

      {/* Environment */}
      <FloorTiles cols={34} rows={20} />
      <Ceiling width={22} depth={14} />

      {/* 3 rows of racks */}
      {[-3.2, 0, 3.2].map((z, rowIdx) => (
        <RackRow
          key={rowIdx}
          z={z}
          rowIndex={rowIdx}
          selectedRack={focusedRack}
          openRack={openRack}
          onRackClick={handleRackClick}
        />
      ))}

      {/* Hot aisle containment strips */}
      {[-1.6, 1.6].map((z, i) => (
        <mesh key={i} position={[0, 1.9, z]} rotation={[0, 0, 0]}>
          <boxGeometry args={[20, 3.8, 0.02]} />
          <meshStandardMaterial color={0x0a0c10} transparent opacity={0.85} metalness={0.3} roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Aisle accent lights */}
      {[-4, -2, 0, 2, 4].map((x, i) => (
        <pointLight key={i} position={[x, 0.1, 0]} color={0x0044aa} intensity={0.4} distance={3} decay={2} />
      ))}
    </>
  );
}
