import { useState, useEffect } from "react";
import { AppScene, ComponentFocus } from "./App";

const COMPONENT_INFO: Record<ComponentFocus["id"], {
  name: string;
  maker: string;
  color: string;
  specs: string[];
  description: string;
}> = {
  gpu_die: {
    name: "NVIDIA H100 SXM5 — Hopper GPU Die",
    maker: "NVIDIA / TSMC N4 (4nm)",
    color: "#ff6600",
    description: "The H100 die is the largest and most powerful AI compute die ever put in production at its launch. NVIDIA calls this the 'engine of the modern AI age' — the dark black silicon substrate you're looking at contains 80 billion transistors, 528 4th-generation Tensor Cores, and 528 CUDA Cores organized into 132 Streaming Multiprocessors. The die measures 814 mm² and is fabricated on TSMC's N4 (4nm class) process node. At full AI Training load, it draws up to 700W — more than most desktop computers.",
    specs: [
      "814 mm² die area — TSMC N4 (4nm)",
      "80 billion transistors",
      "132 SMs / 528 4th-gen Tensor Cores",
      "3.9 PFLOPS FP8 Tensor Core throughput",
      "700W TDP — requires direct liquid cooling",
      "NVLink 4.0 — 900 GB/s GPU-to-GPU bandwidth",
      "Transformer Engine: hardware-accelerated attention",
    ],
  },
  hbm: {
    name: "Micron HBM3 — High Bandwidth Memory",
    maker: "Micron Technology / TSMC",
    color: "#cc0033",
    description: "The dark maroon stacks flanking the GPU die are HBM3 (High Bandwidth Memory 3rd generation) manufactured by Micron Technology. Each stack consists of 9 DRAM dies stacked vertically using Through-Silicon Vias (TSVs) — microscopic copper pillars drilled through each die that carry data between layers at speeds conventional wire bonds can't reach. Six of these stacks give the H100 80 GB total capacity and 3.35 TB/s memory bandwidth — over 10× faster than GDDR6X in a desktop GPU. The distinctive red substrate color is Micron's signature.",
    specs: [
      "6 stacks × 9 DRAM dies each = 54 total dies",
      "80 GB total HBM3 capacity (24 GB per stack pair)",
      "3.35 TB/s aggregate memory bandwidth",
      "5 Gbps per pin data rate",
      "TSV (Through-Silicon Via) die-to-die interconnect",
      "Gold microbumps: 1,024 I/O per stack",
      "Micron HBM3E variant ships in H200 (141 GB, 4.8 TB/s)",
    ],
  },
  nvlink: {
    name: "NVLink 4.0 — GPU-to-GPU Interconnect",
    maker: "NVIDIA Proprietary Protocol",
    color: "#00cc66",
    description: "The golden connector strips along the board edges are NVLink 4.0 — NVIDIA's proprietary high-speed interconnect that allows multiple GPUs to share memory and communicate at speeds that dwarf PCIe. Eight H100 GPUs connected via NVLink form an NVLink domain with 900 GB/s all-reduce bandwidth — meaning any GPU can read or write another GPU's 80 GB of HBM3 memory as if it were local. This enables training models larger than any single GPU's memory through tensor parallelism without hitting the PCIe bandwidth wall.",
    specs: [
      "900 GB/s total bidirectional bandwidth (8-GPU domain)",
      "112.5 GB/s per NVLink bridge connector",
      "18 NVLink links per GPU",
      "Direct GPU memory access — no CPU involvement",
      "Supports NVSwitch fabric for 256+ GPU all-reduce",
      "SHARP in-network compute reduces traffic by 2×",
      "Sub-microsecond port-to-port latency",
    ],
  },
  cpu: {
    name: "AMD EPYC 9654 'Genoa' — Host Processor",
    maker: "AMD / TSMC N5 (5nm) + N6 I/O Die",
    color: "#00aaff",
    description: "The AI server node's CPU is not the primary compute engine — that role belongs to the GPUs. Instead, the EPYC processor orchestrates everything: it runs the operating system, schedules training jobs via CUDA driver, manages PCIe Gen5 fabric bandwidth to all 8 GPUs, handles RDMA networking via the ConnectX-7 NIC, and runs data preprocessing pipelines. Its 12 DDR5 memory channels provide fast staging for dataset batches before they're shipped to GPU HBM. The Genoa architecture uses a 3D chiplet design: compute chiplets on 5nm and a large I/O die on 6nm.",
    specs: [
      "96 cores / 192 threads — Zen 4 microarchitecture",
      "12-channel DDR5-4800 — up to 6 TB ECC capacity",
      "128 lanes PCIe Gen5 — connects all 8 GPUs + NIC",
      "384 MB L3 cache (12 × 32 MB CCDs)",
      "280W cTDP configurable",
      "AMD IOMMU for GPU virtualization / SR-IOV",
      "TSMC N5 compute dies + N6 I/O die (chiplet MCM)",
    ],
  },
  ram: {
    name: "Micron DDR5-4800 RDIMM — System Memory",
    maker: "Micron Technology / Samsung / SK Hynix",
    color: "#8800ff",
    description: "AI training requires vast system memory for data pipeline buffering, gradient checkpointing staging, and model checkpoint storage between training runs. Each HGX server node houses 32 × 64 GB DDR5-4800 RDIMMs for 2 TB of system RAM. The green PCBs with black chips you see are double-sided RDIMMs — each DIMM carries 18 DRAM chips (16 data + 2 ECC). DDR5's on-die ECC provides bit-error correction within each DRAM chip, while the RDIMM's register provides command pipelining. At 921 GB/s total bandwidth, the memory subsystem keeps the EPYC's 96 cores fed.",
    specs: [
      "32 × 64 GB = 2 TB per server node",
      "DDR5-4800 — 921 GB/s total bandwidth",
      "On-die ECC + RDIMM RAS for reliability",
      "12-channel interleaved across 2 EPYC sockets",
      "1.1V operating voltage — 40% lower than DDR4",
      "LPDDR5X variant used in mobile AI at 8.5 Gbps",
      "CXL 2.0 memory expansion slots available",
    ],
  },
  cooling: {
    name: "Direct-to-Chip Liquid Cooling Block",
    maker: "Laird Thermal / Aavid / Custom OEM",
    color: "#0088ff",
    description: "The silver block you see sitting on top of the GPU board is a direct-liquid-cooling (DLC) cold plate — a precision-machined nickel-plated copper component with micro-fin channels inside. At 700W per H100 × 8 GPUs = 5.6 kW per server, air cooling is physically impossible — no fan can move enough air through a 1U chassis. Chilled facility water at 18°C enters the cold plate, absorbs heat through thousands of micro-fins machined to maximize surface area, and exits at ~40°C. This enables rack power densities of 100 kW+ versus air cooling's 15 kW limit. The PUE benefit is enormous: liquid-cooled data centers achieve PUE of 1.05-1.15 vs. 1.4-1.6 for air-cooled.",
    specs: [
      "Nickel-plated copper with micro-fin channels",
      "Flow rate: 2 L/min per cold plate at 3.5 PSI",
      "Delta-T: 18°C inlet → 40°C outlet (22°C rise)",
      "Supports up to 1,000W TDP per GPU cold plate",
      "Rack-level heat rejection: 100 kW continuous",
      "Leak detection sensors + auto-shutoff valves",
      "Waste heat recapture for building HVAC (free cooling)",
    ],
  },
  vrm: {
    name: "Voltage Regulator Module (VRM)",
    maker: "Monolithic Power Systems / Infineon",
    color: "#ffcc00",
    description: "The black rectangular components arranged in rows near the GPU die are the Voltage Regulator Module — a multi-phase buck converter that takes 12V (or 48V in newer designs) from the PDU and converts it to the precise 0.85V–0.9V required by the GPU core. Each 'phase' consists of a high-side FET, low-side FET, and an inductor. The H100 uses an 8–16 phase VRM to handle 700W of dynamic load with sub-1% voltage deviation. Load steps as fast as 100A/µs are routine during AI workloads.",
    specs: [
      "12V → 0.9V conversion at 95%+ efficiency",
      "8–16 phase multi-phase buck converter",
      "700A peak output current capability",
      "< 1% voltage deviation under 100A/µs load steps",
      "Infineon XDPE21284C digital PWM controller",
      "GaN (Gallium Nitride) FETs in latest designs",
      "48V intermediate bus reduces I²R losses in racks",
    ],
  },
};

const SCENE_HELP: Record<AppScene, { title: string; controls: string[] }> = {
  datacenter: {
    title: "DATA CENTER FLOOR — WALKING VIEW",
    controls: ["CLICK canvas → lock mouse & walk", "W A S D — move", "MOUSE — look around", "SHIFT — sprint", "ESC — unlock mouse", "CLICK rack — zoom to rack"],
  },
  rack: {
    title: "RACK VIEW",
    controls: ["CLICK server → inspect hardware", "CLICK BACK to return to floor"],
  },
  gpu: {
    title: "H100 GPU BOARD — INSPECT MODE",
    controls: ["ORBIT: left-drag to rotate", "SCROLL: zoom in/out", "RIGHT-DRAG: pan", "CLICK glowing orb → inspect component"],
  },
  component: {
    title: "COMPONENT INSPECTOR",
    controls: ["CLICK BACK to return to board"],
  },
};

function LiveMetric({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  const [live, setLive] = useState(value);
  useEffect(() => {
    const id = setInterval(() => setLive(Math.round(value + (Math.random() - 0.5) * value * 0.06)), 1800);
    return () => clearInterval(id);
  }, [value]);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 10, color: "#666" }}>
        <span>{label}</span>
        <span style={{ color }}>{live}{unit}</span>
      </div>
      <div style={{ height: 3, background: "#111", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 2,
          width: `${Math.min(100, (live / (unit === "%" ? 100 : unit === "°C" ? 100 : unit === "W" ? 1000 : 100)) * 100)}%`,
          background: color, transition: "width 1.2s ease",
        }} />
      </div>
    </div>
  );
}

interface HUDProps {
  scene: AppScene;
  focusedRack: number | null;
  focusedComponent: ComponentFocus | null;
  lockState: "locked" | "unlocked";
  onBack: () => void;
}

export function HUD({ scene, focusedRack, focusedComponent, lockState, onBack }: HUDProps) {
  const [time, setTime] = useState(new Date());
  const [pue] = useState(1.128);
  const help = SCENE_HELP[scene];
  const compInfo = focusedComponent ? COMPONENT_INFO[focusedComponent.id] : null;

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>

      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        background: "linear-gradient(180deg, rgba(3,5,12,0.97) 0%, rgba(3,5,12,0.0) 100%)",
        padding: "12px 20px", display: "flex", alignItems: "center", gap: 16,
      }}>
        <div>
          <div style={{ color: "#00d4ff", fontSize: 13, fontWeight: "bold", letterSpacing: 2, textShadow: "0 0 12px #00d4ff" }}>
            AI DATA CENTER — 3D SIMULATOR
          </div>
          <div style={{ color: "#333", fontSize: 9, letterSpacing: 3, marginTop: 1 }}>
            HYPERSCALE AI INFRASTRUCTURE
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {/* Breadcrumb */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 10 }}>
          <span
            style={{ color: scene === "datacenter" ? "#00d4ff" : "#444", cursor: scene !== "datacenter" ? "pointer" : "default", pointerEvents: scene !== "datacenter" ? "all" : "none" }}
            onClick={scene !== "datacenter" ? onBack : undefined}
          >
            FLOOR
          </span>
          {scene !== "datacenter" && <span style={{ color: "#222" }}>/</span>}
          {(scene === "rack" || scene === "gpu" || scene === "component") && (
            <span style={{ color: scene === "rack" ? "#00d4ff" : "#444" }}>RACK {focusedRack}</span>
          )}
          {(scene === "gpu" || scene === "component") && (
            <><span style={{ color: "#222" }}>/</span><span style={{ color: scene === "gpu" ? "#00d4ff" : "#444" }}>H100 GPU BOARD</span></>
          )}
          {scene === "component" && compInfo && (
            <><span style={{ color: "#222" }}>/</span><span style={{ color: compInfo.color, textShadow: `0 0 8px ${compInfo.color}` }}>COMPONENT</span></>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#00ff88", fontSize: 12, fontWeight: "bold", textShadow: "0 0 8px #00ff88" }}>
            {time.toLocaleTimeString("en-US", { hour12: false })}
          </div>
          <div style={{ color: "#222", fontSize: 9 }}>UTC</div>
        </div>
      </div>

      {/* Back button */}
      {scene !== "datacenter" && (
        <div style={{ position: "absolute", top: 60, left: 20, pointerEvents: "all" }}>
          <button
            onClick={onBack}
            style={{
              background: "rgba(3,5,12,0.92)", border: "1px solid #1a2a40",
              color: "#00d4ff", padding: "7px 14px", borderRadius: 4,
              fontSize: 11, cursor: "pointer", letterSpacing: 1,
              textShadow: "0 0 6px #00d4ff44",
              transition: "all 0.15s",
            }}
          >
            ← {scene === "component" ? "GPU BOARD" : scene === "gpu" ? "RACK VIEW" : "FLOOR PLAN"}
          </button>
        </div>
      )}

      {/* Pointer lock hint (datacenter only) */}
      {scene === "datacenter" && (
        <div style={{
          position: "absolute", bottom: "50%", left: "50%",
          transform: "translateX(-50%) translateY(50%)",
          textAlign: "center",
          opacity: lockState === "locked" ? 0 : 1,
          transition: "opacity 0.4s",
          pointerEvents: "none",
        }}>
          <div style={{
            background: "rgba(3,5,12,0.88)", border: "1px solid #00d4ff30",
            borderRadius: 8, padding: "18px 28px",
          }}>
            <div style={{ color: "#00d4ff", fontSize: 15, fontWeight: "bold", marginBottom: 6, textShadow: "0 0 12px #00d4ff" }}>
              CLICK TO ENTER DATA CENTER
            </div>
            <div style={{ color: "#444", fontSize: 10 }}>Click to lock mouse • ESC to unlock • WASD to walk</div>
          </div>
        </div>
      )}

      {/* Crosshair (walking mode, locked) */}
      {scene === "datacenter" && lockState === "locked" && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}>
          <svg width="24" height="24" viewBox="-12 -12 24 24">
            <line x1="-8" y1="0" x2="8" y2="0" stroke="#00d4ff" strokeWidth="1" opacity="0.7" />
            <line x1="0" y1="-8" x2="0" y2="8" stroke="#00d4ff" strokeWidth="1" opacity="0.7" />
            <circle cx="0" cy="0" r="2" fill="none" stroke="#00d4ff" strokeWidth="0.8" opacity="0.6" />
          </svg>
        </div>
      )}

      {/* GPU mode instruction */}
      {scene === "gpu" && (
        <div style={{
          position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: "rgba(3,5,12,0.85)", border: "1px solid #1a2a40",
          borderRadius: 6, padding: "8px 16px", textAlign: "center",
        }}>
          <div style={{ color: "#00d4ff", fontSize: 10, marginBottom: 3 }}>CLICK A GLOWING ORB TO INSPECT COMPONENT</div>
          <div style={{ color: "#333", fontSize: 9 }}>LEFT DRAG: Rotate • SCROLL: Zoom • RIGHT DRAG: Pan</div>
        </div>
      )}

      {/* Right sidebar — Component info panel */}
      <div style={{
        position: "absolute", top: 0, bottom: 0, right: 0,
        width: 280,
        background: "linear-gradient(90deg, rgba(3,5,12,0) 0%, rgba(3,5,12,0.97) 18%)",
        padding: "70px 16px 20px 20px",
        display: "flex", flexDirection: "column", gap: 12,
        overflowY: "auto",
      }}>

        {/* Live metrics (always visible) */}
        <div style={{ border: "1px solid #0d1a28", borderRadius: 6, padding: 12, background: "rgba(5,10,20,0.7)" }}>
          <div style={{ color: "#333", fontSize: 9, letterSpacing: 3, marginBottom: 10 }}>LIVE FACILITY TELEMETRY</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#444", fontSize: 9 }}>PUE</span>
            <span style={{ color: "#00d4ff", fontSize: 12, fontWeight: "bold", textShadow: "0 0 6px #00d4ff" }}>{pue.toFixed(3)}</span>
          </div>
          <LiveMetric label="Facility Power" value={482} unit=" MW" color="#f59e0b" />
          <LiveMetric label="Avg GPU Temp" value={78} unit="°C" color="#ff6600" />
          <LiveMetric label="Cluster Utilization" value={89} unit="%" color="#00ff88" />
          <LiveMetric label="Cooling Load" value={340} unit=" kW" color="#00d4ff" />
        </div>

        {/* Component info */}
        {compInfo ? (
          <div style={{
            border: `1px solid ${compInfo.color}30`, borderRadius: 6, padding: 12,
            background: "rgba(5,10,20,0.8)", flex: 1,
          }}>
            <div style={{ color: compInfo.color, fontSize: 11, fontWeight: "bold", marginBottom: 2, textShadow: `0 0 8px ${compInfo.color}` }}>
              {compInfo.name}
            </div>
            <div style={{ color: "#444", fontSize: 9, marginBottom: 10 }}>{compInfo.maker}</div>
            <p style={{ color: "#889", fontSize: 9.5, lineHeight: 1.6, marginBottom: 12 }}>
              {compInfo.description}
            </p>
            <div style={{ color: "#333", fontSize: 9, letterSpacing: 2, marginBottom: 8 }}>SPECIFICATIONS</div>
            {compInfo.specs.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5, alignItems: "flex-start" }}>
                <span style={{ color: compInfo.color, fontSize: 9, marginTop: 1, flexShrink: 0 }}>›</span>
                <span style={{ color: "#667", fontSize: 9, lineHeight: 1.4 }}>{s}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            border: "1px solid #0d1a28", borderRadius: 6, padding: 12,
            background: "rgba(5,10,20,0.7)", flex: 1,
          }}>
            <div style={{ color: "#222", fontSize: 9, letterSpacing: 2, marginBottom: 10 }}>{help.title}</div>
            <div style={{ color: "#1a3a2a", fontSize: 9, letterSpacing: 2, marginBottom: 8 }}>CONTROLS</div>
            {help.controls.map((c, i) => (
              <div key={i} style={{ color: "#334", fontSize: 9, marginBottom: 5, lineHeight: 1.4 }}>
                <span style={{ color: "#00ff8830" }}>›</span> {c}
              </div>
            ))}

            {/* Rack status (datacenter view) */}
            {scene === "datacenter" && (
              <div style={{ marginTop: 12 }}>
                <div style={{ color: "#1a3a2a", fontSize: 9, letterSpacing: 2, marginBottom: 8 }}>RACK STATUS</div>
                {Array.from({ length: 18 }, (_, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: i % 7 === 0 ? "#f59e0b" : i % 3 === 0 ? "#00d4ff" : "#00ff44",
                    }} />
                    <span style={{ color: "#223", fontSize: 8 }}>
                      RACK {String(i).padStart(2, "0")} — {i % 7 === 0 ? "CRITICAL" : i % 3 === 0 ? "HIGH" : "NOMINAL"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* GPU component list (gpu view) */}
            {scene === "gpu" && (
              <div style={{ marginTop: 12 }}>
                <div style={{ color: "#1a3a2a", fontSize: 9, letterSpacing: 2, marginBottom: 8 }}>CLICK TO INSPECT</div>
                {[
                  { id: "gpu_die", label: "H100 GPU Die", color: "#ff6600" },
                  { id: "hbm", label: "HBM3 (Micron) × 6", color: "#cc0033" },
                  { id: "nvlink", label: "NVLink 4.0 Connectors", color: "#00cc66" },
                  { id: "cpu", label: "AMD EPYC CPU", color: "#00aaff" },
                  { id: "ram", label: "DDR5 RAM × 32", color: "#8800ff" },
                  { id: "cooling", label: "Liquid Cooling Block", color: "#0088ff" },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
                    <span style={{ color: "#445", fontSize: 9 }}>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom status bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(0deg, rgba(3,5,12,0.98) 0%, rgba(3,5,12,0) 100%)",
        padding: "10px 20px",
        display: "flex", alignItems: "center", gap: 16, fontSize: 9, color: "#333",
        letterSpacing: 1,
      }}>
        <span style={{ color: "#00ff44" }}>● SYSTEM ONLINE</span>
        <span>18 RACKS ACTIVE</span>
        <span>72 H100 NODES</span>
        <span>14 LLM TRAINING JOBS</span>
        <div style={{ flex: 1 }} />
        <span>UPTIME: 99.98%</span>
        <span style={{ color: "#00d4ff" }}>SLA: COMPLIANT</span>
      </div>
    </div>
  );
}
