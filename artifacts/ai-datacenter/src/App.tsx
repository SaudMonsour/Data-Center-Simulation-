import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type View = "floor" | "rack" | "component";

interface LiveMetrics {
  temp: number;
  power: number;
  util: number;
}

interface ComponentInfo {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  description: string;
  details: string[];
  baseMetrics: { temp: number; power: number; util: number };
  statusColor: "green" | "amber" | "cyan" | "red";
}

interface RackNode {
  id: string;
  label: string;
  type: "server" | "switch" | "pdu" | "cooling";
  units: number;
}

interface Rack {
  id: string;
  row: string;
  num: number;
  label: string;
  type: string;
  load: "nominal" | "high" | "critical";
  nodes: RackNode[];
}

// ─── Data ────────────────────────────────────────────────────────────────────

const COMPONENT_DATA: Record<string, ComponentInfo> = {
  gpu: {
    id: "gpu",
    name: "NVIDIA H100 SXM5 Tensor Core GPU",
    subtitle: "AI Compute Accelerator",
    icon: "▣",
    description:
      "The H100 is NVIDIA's flagship AI accelerator, built on the Hopper architecture with 4th-gen Tensor Cores optimized for transformer-based LLM training and inference. Each chip packs 80 GB of HBM3 memory with 3.35 TB/s bandwidth, delivering 3.9 PFLOPS of FP8 AI compute. Eight units are interconnected via NVLink 4.0 at 900 GB/s aggregate bandwidth, enabling models larger than a single GPU's memory through seamless tensor parallelism.",
    details: [
      "80 GB HBM3 @ 3.35 TB/s memory bandwidth",
      "3.9 PFLOPS FP8 / 1.979 PFLOPS FP16 Tensor Core performance",
      "NVLink 4.0 — 900 GB/s all-reduce across 8-GPU node",
      "700W TDP — requires direct liquid cooling",
      "PCIe Gen5 x16 host interface",
      "4th-gen Tensor Cores with FP8, BF16, TF32 support",
      "Transformer Engine accelerates attention layers natively",
    ],
    baseMetrics: { temp: 78, power: 680, util: 94 },
    statusColor: "amber",
  },
  cpu: {
    id: "cpu",
    name: "AMD EPYC 9654 'Genoa' Processor",
    subtitle: "Host System Controller",
    icon: "◈",
    description:
      "The EPYC 9654 is a 96-core server processor built on TSMC 5nm with Zen 4 microarchitecture. In an AI server node, the CPU acts as the orchestration hub — it manages PCIe Gen 5 fabric connecting GPUs, handles OS scheduling, coordinates network I/O via RDMA, and runs inference pre/post-processing. Its 12 memory channels support up to 6TB of DDR5-4800 ECC RAM, providing ample headroom for large batch caching and model-parameter staging.",
    details: [
      "96 cores / 192 threads @ up to 3.7 GHz base / 3.85 GHz boost",
      "384 MB L3 cache (32 MB per 8-core CCD)",
      "12-channel DDR5-4800, up to 6 TB ECC RAM",
      "128 lanes PCIe Gen 5 — connects all 8 GPUs + NIC + NVMe",
      "280W TDP configurable cTDP",
      "NUMA: dual-socket configs double compute density",
      "AMD IOMMU for SR-IOV GPU virtualization",
    ],
    baseMetrics: { temp: 62, power: 240, util: 58 },
    statusColor: "green",
  },
  ram: {
    id: "ram",
    name: "DDR5-4800 ECC Registered DIMM",
    subtitle: "System Memory (2 TB per node)",
    icon: "▬",
    description:
      "AI training workloads require enormous amounts of system memory for data pipeline buffering, gradient checkpointing, and model checkpoint storage. Each HGX-H100 node is configured with 32× 64 GB DDR5-4800 ECC RDIMMs totaling 2 TB of system RAM. DDR5's on-die ECC provides bit-error correction at the DRAM die level, while the motherboard's RAS features detect and correct multi-bit errors — essential for 24/7 training runs lasting weeks.",
    details: [
      "32× 64 GB RDIMM = 2 TB per node, 12-channel interleaved",
      "DDR5-4800 — 76.8 GB/s per channel, 921 GB/s total",
      "On-die ECC + RDIMM ECC: dual-layer bit-error protection",
      "Stores training data batches, gradient buffers, and checkpoints",
      "NUMA-aware allocation reduces cross-socket latency by 30%",
      "1.1V — 40% lower power than DDR4 at equivalent bandwidth",
      "CXL 2.0-compatible slots for memory pool expansion",
    ],
    baseMetrics: { temp: 48, power: 96, util: 72 },
    statusColor: "cyan",
  },
  cooling: {
    id: "cooling",
    name: "Direct-to-Chip Liquid Cooling Manifold",
    subtitle: "Thermal Management System",
    icon: "≋",
    description:
      "At 700W per GPU × 8 GPUs = 5.6 kW per server node, traditional air cooling is physically impossible. Direct-to-Chip (DTC) liquid cooling pipes chilled dielectric fluid directly to cold plates bolted onto each GPU die. Heat transfers into the fluid at 40°C inlet, exits at ~55°C, then routes to Computer Room Air Handlers (CRAHs) via the overhead manifold. This enables rack densities of 100+ kW versus air cooling's 15–20 kW limit.",
    details: [
      "Coolant flow: 2 L/min per GPU cold plate at 3.5 PSI",
      "Inlet/outlet delta-T: 40°C → 55°C (15°C rise per pass)",
      "Supports up to 1,000W TDP per GPU cold plate",
      "30% of heat offloaded as hot water — recaptured for building HVAC",
      "PUE impact: enables facility PUE of 1.1 vs. air-cooled 1.4+",
      "Leak detection sensors every 0.5 m with auto-shutoff valves",
      "ASHRAE A4-compliant for 45°C ambient tolerance",
    ],
    baseMetrics: { temp: 52, power: 18, util: 85 },
    statusColor: "cyan",
  },
  switch: {
    id: "switch",
    name: "NVIDIA Quantum-2 InfiniBand Switch",
    subtitle: "400Gb/s HDR200 Fabric Node",
    icon: "⊞",
    description:
      "The Quantum-2 switch provides the high-speed fabric backbone of an AI cluster. Each port delivers 400 Gbps HDR200 InfiniBand with hardware-offloaded RDMA, allowing GPUs to read and write each other's memory directly without CPU involvement. A fat-tree topology of these switches creates a non-blocking, bisection-bandwidth network where every GPU can communicate with every other GPU at full line rate — the prerequisite for efficient gradient synchronization during distributed training.",
    details: [
      "40-port 400Gb/s HDR200 non-blocking switch",
      "3.2 Tbps aggregate fabric bandwidth per switch",
      "RDMA hardware offload — zero CPU cycles for data movement",
      "Sub-100 ns port-to-port latency",
      "Adaptive routing for congestion avoidance",
      "SHARP in-network compute: reduces AllReduce traffic by 50%",
      "Hot-swappable PSUs and fan modules — zero-downtime maintenance",
    ],
    baseMetrics: { temp: 55, power: 300, util: 76 },
    statusColor: "green",
  },
  pdu: {
    id: "pdu",
    name: "Vertiv Geist 3-Phase 208V Intelligent PDU",
    subtitle: "Power Distribution Unit",
    icon: "⚡",
    description:
      "An Intelligent PDU is the power nervous system of a server rack. It accepts high-voltage 3-phase 208V AC from the facility's UPS system and distributes it to individual servers via metered C13/C19 outlets. The 'intelligent' part means every outlet reports real-time current, voltage, and kWh consumption, enabling per-server power capping — a critical feature when training jobs must fit within a rack's power budget without triggering circuit breakers.",
    details: [
      "3-phase 208V input, 60A circuit capacity per PDU",
      "42× metered C13 + 6× metered C19 outlets",
      "Per-outlet current accuracy: ±1% full-scale",
      "SNMP/REST API for remote outlet switching and monitoring",
      "Peak load tracking with configurable circuit-breaker alerts",
      "Dual-corded servers connect to PDU-A and PDU-B for redundancy",
      "Environmental sensor: temperature, humidity per rack",
    ],
    baseMetrics: { temp: 38, power: 4200, util: 82 },
    statusColor: "amber",
  },
  rack_manifold: {
    id: "rack_manifold",
    name: "Rear-Door Heat Exchanger / Cooling Manifold",
    subtitle: "Rack-Level Liquid Cooling Infrastructure",
    icon: "≈",
    description:
      "The rack-level cooling manifold distributes chilled water from the facility's Computer Room Water System (CRWS) to the direct-liquid-cooling (DLC) cold plates on every server in the rack. Quick-disconnect couplings on each server allow hot-swap without draining the entire rack loop. A secondary passive rear-door heat exchanger (RDHx) captures residual air-borne heat from components not directly cooled (storage, networking) before it enters the hot aisle.",
    details: [
      "Chilled water supply: 18°C facility water, 4–6 L/min per server",
      "Supply/return manifold: 3/4\" stainless steel with EPDM seals",
      "Per-server quick-disconnect couplings (hot-swap capable)",
      "Rear-door HEX: passive 10–15 kW sensible heat capture",
      "Facility integration: BACnet/Modbus for DCIM platform",
      "Maximum rack-level heat rejection: 100 kW continuous",
      "Leak detection tape embedded in manifold housing",
    ],
    baseMetrics: { temp: 44, power: 8, util: 78 },
    statusColor: "cyan",
  },
};

function buildRacks(): Rack[] {
  const rows = ["A", "B", "C"];
  const types = [
    ["AI Training", "AI Training", "AI Training", "AI Training", "AI Inference", "AI Inference"],
    ["AI Training", "AI Training", "AI Inference", "AI Inference", "Storage", "Networking"],
    ["AI Inference", "AI Inference", "AI Training", "Storage", "Networking", "Management"],
  ];
  const loads: Array<"nominal" | "high" | "critical"> = [
    "high", "critical", "high", "nominal", "high", "nominal",
    "critical", "high", "nominal", "high", "nominal", "nominal",
    "high", "nominal", "high", "nominal", "nominal", "nominal",
  ];
  const racks: Rack[] = [];
  let idx = 0;
  for (let r = 0; r < rows.length; r++) {
    for (let n = 0; n < 6; n++) {
      const rackNum = n + 1;
      racks.push({
        id: `${rows[r]}${String(rackNum).padStart(2, "0")}`,
        row: rows[r],
        num: rackNum,
        label: `${types[r][n]} Rack #${String(idx + 1).padStart(2, "0")}`,
        type: types[r][n],
        load: loads[idx],
        nodes: buildRackNodes(types[r][n]),
      });
      idx++;
    }
  }
  return racks;
}

function buildRackNodes(type: string): RackNode[] {
  const serverCount = type === "Networking" ? 2 : type === "Storage" ? 3 : 4;
  const nodes: RackNode[] = [];
  nodes.push({ id: "manifold", label: "Cooling Manifold / RDHx", type: "cooling", units: 2 });
  for (let i = 0; i < serverCount; i++) {
    nodes.push({
      id: `server-${i}`,
      label: type === "Storage"
        ? `NVMe Storage Node ${i + 1} (192 TB)`
        : type === "Networking"
        ? `Spine Switch Node ${i + 1}`
        : `HGX H100 8×GPU Server Node ${i + 1}`,
      type: "server",
      units: type === "Storage" ? 4 : 10,
    });
  }
  nodes.push({ id: "ib-switch", label: "Quantum-2 InfiniBand 400G Switch", type: "switch", units: 1 });
  nodes.push({ id: "eth-switch", label: "Arista 7050CX3 100GbE Mgmt Switch", type: "switch", units: 1 });
  nodes.push({ id: "pdu-a", label: "PDU-A — 3-Phase 208V 60A (Primary)", type: "pdu", units: 2 });
  nodes.push({ id: "pdu-b", label: "PDU-B — 3-Phase 208V 60A (Redundant)", type: "pdu", units: 2 });
  return nodes;
}

const RACKS = buildRacks();

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useLiveMetrics(base: LiveMetrics, active: boolean): LiveMetrics {
  const [metrics, setMetrics] = useState(base);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setMetrics({
        temp: Math.round(base.temp + (Math.random() - 0.5) * 6),
        power: Math.round(base.power + (Math.random() - 0.5) * base.power * 0.06),
        util: Math.min(100, Math.max(0, Math.round(base.util + (Math.random() - 0.5) * 8))),
      });
    }, 1800);
    return () => clearInterval(id);
  }, [active, base.temp, base.power, base.util]);
  return metrics;
}

function useGlobalMetrics() {
  const [pue, setPue] = useState(1.14);
  const [power, setPower] = useState(4.82);
  useEffect(() => {
    const id = setInterval(() => {
      setPue(+(1.10 + Math.random() * 0.08).toFixed(3));
      setPower(+(4.5 + Math.random() * 0.7).toFixed(2));
    }, 2500);
    return () => clearInterval(id);
  }, []);
  return { pue, power };
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function MetricBar({ label, value, max, unit, color }: {
  label: string; value: number; max: number; unit: string; color: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className={color}>{value}{unit}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full metric-bar-inner"
          style={{ width: `${pct}%`, background: pct > 85 ? "#f59e0b" : pct > 60 ? "#00d4ff" : "#00ff88" }}
        />
      </div>
    </div>
  );
}

function StatusDot({ load }: { load: "nominal" | "high" | "critical" }) {
  const cls = load === "critical" ? "bg-amber-400" : load === "high" ? "bg-cyan-400" : "bg-green-400";
  return <span className={`inline-block w-2 h-2 rounded-full pulse-dot ${cls}`} />;
}

function Breadcrumb({ view, rack, onFloor, onRack }: {
  view: View; rack: Rack | null;
  onFloor: () => void; onRack: () => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 select-none">
      <button onClick={onFloor} className="hover:text-cyan-400 transition-colors">
        FLOOR PLAN
      </button>
      {view !== "floor" && rack && (
        <>
          <span className="text-gray-700">/</span>
          <button onClick={onRack} className="hover:text-cyan-400 transition-colors">
            RACK {rack.id}
          </button>
        </>
      )}
      {view === "component" && (
        <>
          <span className="text-gray-700">/</span>
          <span className="text-green-400">COMPONENT</span>
        </>
      )}
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({ info }: { info: ComponentInfo | null }) {
  const base = info?.baseMetrics ?? { temp: 45, power: 200, util: 50 };
  const metrics = useLiveMetrics(base, !!info);

  if (!info) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="text-5xl mb-4 opacity-20">⊡</div>
        <p className="text-gray-600 text-sm">
          Click any component on the floor plan, rack, or hardware view to see detailed information here.
        </p>
      </div>
    );
  }

  const colorMap = {
    green: "neon-green",
    amber: "neon-amber",
    cyan: "neon-cyan",
    red: "neon-red",
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full view-enter">
      {/* Header */}
      <div className="border border-gray-700 rounded-lg p-3 bg-gray-900/60">
        <div className={`text-3xl mb-1 ${colorMap[info.statusColor]}`}>{info.icon}</div>
        <div className={`text-sm font-bold leading-tight ${colorMap[info.statusColor]}`}>{info.name}</div>
        <div className="text-xs text-gray-500 mt-0.5">{info.subtitle}</div>
      </div>

      {/* Live Metrics */}
      <div className="border border-gray-800 rounded-lg p-3 bg-gray-900/40">
        <div className="text-xs text-gray-500 mb-2 tracking-widest">LIVE TELEMETRY</div>
        <MetricBar label="Temperature" value={metrics.temp} max={100} unit="°C" color="neon-amber" />
        <MetricBar
          label="Power Draw"
          value={metrics.power}
          max={info.id === "pdu" ? 8000 : info.id === "gpu" ? 900 : 500}
          unit="W"
          color="neon-cyan"
        />
        <MetricBar label="Utilization" value={metrics.util} max={100} unit="%" color="neon-green" />
      </div>

      {/* Description */}
      <div className="border border-gray-800 rounded-lg p-3 bg-gray-900/40">
        <div className="text-xs text-gray-500 mb-2 tracking-widest">FUNCTION</div>
        <p className="text-xs text-gray-300 leading-relaxed">{info.description}</p>
      </div>

      {/* Specs */}
      <div className="border border-gray-800 rounded-lg p-3 bg-gray-900/40">
        <div className="text-xs text-gray-500 mb-2 tracking-widest">KEY SPECIFICATIONS</div>
        <ul className="space-y-1.5">
          {info.details.map((d, i) => (
            <li key={i} className="flex gap-2 text-xs text-gray-300">
              <span className="text-green-400 mt-0.5 shrink-0">›</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Floor Plan View ──────────────────────────────────────────────────────────

function FloorPlanView({
  racks,
  onRackClick,
  onSidebarInfo,
}: {
  racks: Rack[];
  onRackClick: (rack: Rack) => void;
  onSidebarInfo: (info: ComponentInfo) => void;
}) {
  const [tooltip, setTooltip] = useState<{ rack: Rack; x: number; y: number } | null>(null);
  const rows = ["A", "B", "C"];
  const { pue, power } = useGlobalMetrics();

  const loadColor = (load: "nominal" | "high" | "critical") =>
    load === "critical" ? "border-amber-500 bg-amber-500/10" :
    load === "high" ? "border-cyan-500 bg-cyan-500/10" :
    "border-green-500 bg-green-500/10";

  const loadTextColor = (load: "nominal" | "high" | "critical") =>
    load === "critical" ? "text-amber-400" :
    load === "high" ? "text-cyan-400" :
    "text-green-400";

  return (
    <div className="flex-1 flex flex-col min-h-0 view-enter">
      {/* Global metrics bar */}
      <div className="flex gap-3 mb-4">
        {[
          { label: "TOTAL POWER", value: `${power} MW`, color: "neon-amber", icon: "⚡" },
          { label: "PUE INDEX", value: pue.toFixed(3), color: "neon-cyan", icon: "◎" },
          { label: "COOLING STATUS", value: "OPTIMAL", color: "neon-green", icon: "≋" },
          { label: "ACTIVE RACKS", value: "18 / 18", color: "neon-green", icon: "▣" },
          { label: "NETWORK", value: "3.2 Tbps", color: "neon-cyan", icon: "⊞" },
        ].map((m) => (
          <div key={m.label} className="flex-1 border border-gray-700 rounded-lg p-3 bg-gray-900/60 relative overflow-hidden">
            <div className="text-gray-600 text-xs mb-1 tracking-widest">{m.icon} {m.label}</div>
            <div className={`text-lg font-bold ${m.color}`}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Floor grid */}
      <div className="flex-1 dc-grid rounded-xl border border-gray-700 p-4 relative overflow-auto scanlines">
        <div className="relative z-10">
          {rows.map((row) => (
            <div key={row} className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-600 tracking-widest font-bold w-6">ROW</span>
                <span className="text-base neon-cyan font-bold">{row}</span>
                <div className="flex-1 h-px bg-gray-800" />
              </div>
              <div className="flex gap-3">
                {racks.filter(r => r.row === row).map((rack) => (
                  <div
                    key={rack.id}
                    className={`relative border-2 rounded-lg p-2.5 cursor-pointer rack-hover flex-1 ${loadColor(rack.load)}`}
                    onClick={() => onRackClick(rack)}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({ rack, x: rect.left, y: rect.top });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    {/* Rack visual */}
                    <div className="flex flex-col gap-0.5 mb-2">
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="h-1.5 rounded-sm"
                          style={{
                            background: i < 4
                              ? rack.load === "critical" ? "#f59e0b60" : rack.load === "high" ? "#00d4ff60" : "#00ff8860"
                              : "#1a2030",
                          }}
                        />
                      ))}
                    </div>
                    <div className="text-center">
                      <div className={`text-base font-bold ${loadTextColor(rack.load)}`}>{rack.id}</div>
                      <div className="text-gray-500 text-[9px] leading-tight mt-0.5">{rack.type}</div>
                      <div className="flex items-center justify-center gap-1 mt-1.5">
                        <StatusDot load={rack.load} />
                        <span className={`text-[9px] ${loadTextColor(rack.load)}`}>{rack.load.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 border border-cyan-500/50 bg-gray-900/95 rounded-lg p-3 text-xs pointer-events-none"
          style={{ left: tooltip.x + 10, top: tooltip.y - 80 }}
        >
          <div className="neon-cyan font-bold mb-1">{tooltip.rack.label}</div>
          <div className="text-gray-400">Rack ID: <span className="text-white">{tooltip.rack.id}</span></div>
          <div className="text-gray-400">Status: <span className={
            tooltip.rack.load === "critical" ? "text-amber-400" :
            tooltip.rack.load === "high" ? "text-cyan-400" : "text-green-400"
          }>{tooltip.rack.load.toUpperCase()}</span></div>
          <div className="text-gray-500 mt-1 text-[10px]">Click to inspect rack →</div>
        </div>
      )}
    </div>
  );
}

// ─── Rack View ────────────────────────────────────────────────────────────────

function RackView({
  rack,
  onNodeClick,
  onSidebarInfo,
}: {
  rack: Rack;
  onNodeClick: (nodeId: string) => void;
  onSidebarInfo: (info: ComponentInfo) => void;
}) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const nodeStyle = (node: RackNode) => {
    const base = "rack-item border rounded px-3 py-1.5 flex items-center gap-2 text-xs w-full";
    if (node.type === "server") return `${base} border-cyan-500/60 bg-cyan-500/10 hover:bg-cyan-500/20`;
    if (node.type === "switch") return `${base} border-green-500/60 bg-green-500/10 hover:bg-green-500/20`;
    if (node.type === "pdu") return `${base} border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20`;
    if (node.type === "cooling") return `${base} border-blue-400/60 bg-blue-400/10 hover:bg-blue-400/20`;
    return base;
  };

  const nodeIcon = (type: RackNode["type"]) =>
    type === "server" ? "▣" : type === "switch" ? "⊞" : type === "pdu" ? "⚡" : "≋";

  const nodeColor = (type: RackNode["type"]) =>
    type === "server" ? "text-cyan-400" : type === "switch" ? "text-green-400" :
    type === "pdu" ? "text-amber-400" : "text-blue-400";

  const handleNodeClick = (node: RackNode) => {
    setSelectedNode(node.id);
    if (node.type === "server") {
      onNodeClick(node.id);
    } else if (node.type === "switch") {
      onSidebarInfo(COMPONENT_DATA.switch);
    } else if (node.type === "pdu") {
      onSidebarInfo(COMPONENT_DATA.pdu);
    } else if (node.type === "cooling") {
      onSidebarInfo(COMPONENT_DATA.rack_manifold);
    }
  };

  return (
    <div className="flex gap-4 flex-1 min-h-0 view-enter">
      {/* Rack chassis */}
      <div className="flex flex-col" style={{ width: 420 }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="neon-cyan text-lg font-bold">RACK {rack.id}</div>
          <div className="text-gray-500 text-sm">— {rack.label}</div>
          <StatusDot load={rack.load} />
        </div>
        <div className="flex-1 border-2 border-gray-600 rounded-xl overflow-hidden bg-gray-950 relative">
          {/* Rack top panel */}
          <div className="bg-gray-800 px-3 py-2 flex items-center gap-2 border-b border-gray-600">
            <div className="text-xs text-gray-400">42U RACK ENCLOSURE</div>
            <div className="flex-1" />
            <div className="w-2 h-2 rounded-full bg-green-400 pulse-dot" />
            <div className="text-green-400 text-xs">ONLINE</div>
          </div>

          {/* Rail guides */}
          <div className="flex">
            <div className="w-6 bg-gray-900 flex flex-col items-center border-r border-gray-800 py-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="text-gray-700 text-[8px] mb-3">{(i + 1) * 7}</div>
              ))}
            </div>

            {/* Components */}
            <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
              {rack.nodes.map((node) => (
                <button
                  key={node.id}
                  className={`${nodeStyle(node)} ${selectedNode === node.id ? "ring-1 ring-white/30" : ""}`}
                  style={{ height: `${node.units * 8 + 16}px` }}
                  onClick={() => handleNodeClick(node)}
                >
                  <span className={`text-base shrink-0 ${nodeColor(node.type)}`}>{nodeIcon(node.type)}</span>
                  <div className="flex-1 text-left min-w-0">
                    <div className={`font-bold truncate ${nodeColor(node.type)}`}>{node.label}</div>
                    <div className="text-gray-600 text-[9px]">{node.units}U</div>
                  </div>
                  {node.type === "server" && (
                    <div className="flex gap-0.5 shrink-0">
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-3 rounded-sm"
                          style={{
                            background: rack.load === "critical" ? "#f59e0b" :
                              rack.load === "high" ? "#00d4ff" : "#00ff88",
                            opacity: 0.6 + Math.random() * 0.4,
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {node.type !== "server" && (
                    <span className="text-gray-700 text-[10px] shrink-0">click →</span>
                  )}
                </button>
              ))}
            </div>

            <div className="w-6 bg-gray-900 flex flex-col items-center border-l border-gray-800 py-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="text-gray-700 text-[8px] mb-3">{(i + 1) * 7}</div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-600 text-center">
          Click an <span className="text-cyan-400">AI Server Node</span> to inspect hardware components
        </div>
      </div>

      {/* Rack info panel */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        <div className="border border-gray-700 rounded-lg p-4 bg-gray-900/60">
          <div className="text-xs text-gray-500 tracking-widest mb-3">RACK OVERVIEW</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Rack Type", value: rack.type },
              { label: "Load Status", value: rack.load.toUpperCase(), colored: true },
              { label: "Total Servers", value: rack.nodes.filter(n => n.type === "server").length.toString() },
              { label: "IB Switches", value: "2" },
              { label: "Power Feeds", value: "2× 60A 3-Phase" },
              { label: "Cooling Type", value: "Direct Liquid" },
            ].map((item) => (
              <div key={item.label} className="bg-gray-800/50 rounded p-2">
                <div className="text-gray-500 text-[10px]">{item.label}</div>
                <div className={`text-sm font-bold mt-0.5 ${
                  item.colored
                    ? rack.load === "critical" ? "text-amber-400"
                    : rack.load === "high" ? "text-cyan-400"
                    : "text-green-400"
                    : "text-white"
                }`}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-gray-700 rounded-lg p-4 bg-gray-900/60">
          <div className="text-xs text-gray-500 tracking-widest mb-3">COMPONENT LEGEND</div>
          {[
            { color: "bg-cyan-400", label: "AI Server Nodes — HGX H100 8×GPU" },
            { color: "bg-green-400", label: "Network Switches — IB 400G / 100GbE" },
            { color: "bg-amber-400", label: "Power Distribution Units — 3-Phase" },
            { color: "bg-blue-400", label: "Liquid Cooling Manifold / RDHx" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 mb-2 text-xs text-gray-400">
              <div className={`w-2 h-2 rounded-sm ${item.color} shrink-0`} />
              {item.label}
            </div>
          ))}
        </div>

        <div className="border border-gray-700 rounded-lg p-4 bg-gray-900/60">
          <div className="text-xs text-gray-500 tracking-widest mb-2">RACK POWER BUDGET</div>
          <MetricBar label="Power Consumed" value={rack.load === "critical" ? 88 : rack.load === "high" ? 76 : 61} max={100} unit="kW" color="neon-amber" />
          <MetricBar label="Cooling Capacity" value={rack.load === "critical" ? 91 : rack.load === "high" ? 79 : 65} max={100} unit="%" color="neon-cyan" />
          <MetricBar label="Avg GPU Utilization" value={rack.load === "critical" ? 96 : rack.load === "high" ? 84 : 72} max={100} unit="%" color="neon-green" />
        </div>
      </div>
    </div>
  );
}

// ─── Component Inspector ──────────────────────────────────────────────────────

function ComponentInspector({
  rack,
  nodeId,
  onSelectComponent,
}: {
  rack: Rack;
  nodeId: string;
  onSelectComponent: (info: ComponentInfo) => void;
}) {
  const node = rack.nodes.find(n => n.id === nodeId);
  const [selectedComp, setSelectedComp] = useState<string | null>(null);

  const handleClick = (id: string) => {
    setSelectedComp(id);
    onSelectComponent(COMPONENT_DATA[id]);
  };

  const gpuLoad = rack.load === "critical" ? "HIGH" : rack.load === "high" ? "TRAINING" : "INFERENCE";
  const gpuUtil = rack.load === "critical" ? 97 : rack.load === "high" ? 91 : 74;

  return (
    <div className="flex-1 min-h-0 flex flex-col view-enter">
      <div className="flex items-center gap-3 mb-3">
        <div className="neon-cyan text-base font-bold">NODE INSPECTOR</div>
        <div className="text-gray-500 text-sm">— {node?.label}</div>
      </div>

      {/* Server chassis */}
      <div className="border border-cyan-500/40 rounded-xl overflow-hidden bg-gray-950 flex-1 flex flex-col">
        {/* Server front panel */}
        <div className="bg-gray-800 px-4 py-2.5 flex items-center gap-3 border-b border-gray-700">
          <div className="w-2 h-2 rounded-full bg-cyan-400 pulse-dot" />
          <div className="text-xs text-gray-300 font-bold">HGX H100 SERVER NODE — 10U CHASSIS</div>
          <div className="flex-1" />
          <div className="text-xs text-amber-400 font-bold">{gpuLoad} MODE</div>
          <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${gpuUtil}%` }} />
          </div>
          <div className="text-xs text-amber-400">{gpuUtil}%</div>
        </div>

        {/* Components layout */}
        <div className="flex-1 p-4 overflow-y-auto">

          {/* GPUs — 2×4 grid */}
          <div className="mb-4">
            <div className="text-xs text-gray-500 tracking-widest mb-2">GPU ARRAY — 8× NVIDIA H100 SXM5</div>
            <div className="grid grid-cols-4 gap-2">
              {[...Array(8)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleClick("gpu")}
                  className={`component-card border rounded-lg p-2.5 text-left ${
                    selectedComp === "gpu" ? "border-amber-400 bg-amber-400/15 selected-highlight" : "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20"
                  }`}
                >
                  <div className="neon-amber text-xl font-bold mb-1">▣</div>
                  <div className="text-amber-300 text-[10px] font-bold">H100 #{i}</div>
                  <div className="text-gray-500 text-[9px]">80GB HBM3</div>
                  <div className="mt-1.5 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${gpuUtil - 5 + Math.floor(Math.random() * 10)}%` }}
                    />
                  </div>
                  <div className="text-amber-400/70 text-[9px] mt-0.5">{gpuUtil - 2 + Math.floor(Math.random() * 6)}%</div>
                </button>
              ))}
            </div>
          </div>

          {/* NVLink interconnect bar */}
          <div className="border border-green-500/20 rounded-lg p-2 mb-4 bg-green-500/5">
            <div className="text-xs text-green-500/70 tracking-widest mb-1">NVLink 4.0 INTERCONNECT FABRIC — 900 GB/s ALL-REDUCE</div>
            <div className="flex gap-1">
              {[...Array(18)].map((_, i) => (
                <div key={i} className="flex-1 h-1.5 rounded-full bg-green-400/60" style={{ opacity: 0.4 + Math.random() * 0.6 }} />
              ))}
            </div>
          </div>

          {/* CPU + RAM + Cooling */}
          <div className="grid grid-cols-3 gap-3">
            {/* CPUs */}
            <div className="space-y-2">
              <div className="text-xs text-gray-500 tracking-widest">HOST CPU</div>
              {[0, 1].map((i) => (
                <button
                  key={i}
                  onClick={() => handleClick("cpu")}
                  className={`component-card border rounded-lg p-3 w-full text-left ${
                    selectedComp === "cpu" ? "border-green-400 bg-green-400/15 selected-highlight" : "border-green-500/40 bg-green-500/10 hover:bg-green-500/20"
                  }`}
                >
                  <div className="neon-green text-xl font-bold">◈</div>
                  <div className="text-green-300 text-[10px] font-bold mt-1">EPYC 9654</div>
                  <div className="text-gray-500 text-[9px]">96C / 192T</div>
                  <div className="text-green-400 text-[9px] mt-1">Socket {i === 0 ? "P0" : "P1"}</div>
                </button>
              ))}
            </div>

            {/* RAM */}
            <div>
              <div className="text-xs text-gray-500 tracking-widest mb-2">SYSTEM RAM</div>
              <button
                onClick={() => handleClick("ram")}
                className={`component-card border rounded-lg p-3 w-full text-left ${
                  selectedComp === "ram" ? "border-cyan-400 bg-cyan-400/15 selected-highlight" : "border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20"
                }`}
              >
                <div className="neon-cyan text-xl font-bold mb-1">▬</div>
                <div className="text-cyan-300 text-[10px] font-bold">2 TB DDR5</div>
                <div className="text-gray-500 text-[9px]">32× 64GB ECC</div>
                <div className="text-xs text-gray-500 mt-1.5">Slots:</div>
                <div className="grid grid-cols-8 gap-0.5 mt-1">
                  {[...Array(32)].map((_, i) => (
                    <div key={i} className="h-3 w-1 bg-cyan-400/50 rounded-sm" />
                  ))}
                </div>
                <div className="text-cyan-400 text-[9px] mt-1.5">12-Ch @ 921 GB/s</div>
              </button>
            </div>

            {/* Cooling */}
            <div>
              <div className="text-xs text-gray-500 tracking-widest mb-2">LIQUID COOLING</div>
              <button
                onClick={() => handleClick("cooling")}
                className={`component-card border rounded-lg p-3 w-full text-left h-full ${
                  selectedComp === "cooling" ? "border-blue-400 bg-blue-400/15 selected-highlight" : "border-blue-400/40 bg-blue-400/10 hover:bg-blue-400/20"
                }`}
              >
                <div className="text-blue-400 text-xl font-bold" style={{ textShadow: "0 0 8px #60a5fa" }}>≋</div>
                <div className="text-blue-300 text-[10px] font-bold mt-1">DTC Manifold</div>
                <div className="text-gray-500 text-[9px]">8× Cold Plates</div>
                <div className="text-blue-400/70 text-[9px] mt-1">40°C → 55°C</div>
                <div className="mt-2 flex flex-col gap-0.5">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex gap-0.5 items-center">
                      <div className="w-1 h-1 rounded-full bg-blue-400/60" />
                      <div className="flex-1 h-0.5 bg-blue-400/40 rounded-full" />
                    </div>
                  ))}
                </div>
                <div className="text-blue-400 text-[9px] mt-1.5">5.6 kW per node</div>
              </button>
            </div>
          </div>

          {/* PCIe + NVMe storage */}
          <div className="mt-3 border border-gray-700/50 rounded-lg p-3 bg-gray-900/30">
            <div className="text-xs text-gray-500 tracking-widest mb-2">PCIe Gen5 FABRIC + NVMe STORAGE</div>
            <div className="flex gap-2 flex-wrap">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="border border-gray-700 rounded px-2 py-1 text-[9px] text-gray-500">
                  x16 Lane {i}
                </div>
              ))}
              {[...Array(4)].map((_, i) => (
                <div key={i} className="border border-purple-700/50 rounded px-2 py-1 text-[9px] text-purple-400/70">
                  NVMe {i * 7.68}TB
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>("floor");
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [sidebarInfo, setSidebarInfo] = useState<ComponentInfo | null>(null);
  const [tick, setTick] = useState(0);
  const { pue, power } = useGlobalMetrics();

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const goToFloor = useCallback(() => {
    setView("floor");
    setSelectedRack(null);
    setSelectedNodeId(null);
    setSidebarInfo(null);
  }, []);

  const goToRack = useCallback(() => {
    setView("rack");
    setSelectedNodeId(null);
    setSidebarInfo(null);
  }, []);

  const handleRackClick = (rack: Rack) => {
    setSelectedRack(rack);
    setView("rack");
    setSidebarInfo(null);
  };

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setView("component");
    setSidebarInfo(COMPONENT_DATA.gpu);
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour12: false });
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">

      {/* Top header */}
      <div className="border-b border-gray-800 px-4 py-2.5 flex items-center gap-4 bg-gray-950 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-cyan-400 rounded-full" style={{ boxShadow: "0 0 8px #00d4ff" }} />
          <div>
            <div className="neon-cyan text-sm font-bold tracking-wider">AI DATA CENTER SIMULATOR</div>
            <div className="text-gray-600 text-[10px] tracking-widest">HYPERSCALE AI INFRASTRUCTURE — EDUCATIONAL PLATFORM</div>
          </div>
        </div>
        <div className="flex-1" />

        {/* Ticker */}
        <div className="flex-1 overflow-hidden border border-gray-800 rounded px-2 py-0.5">
          <div className="ticker-content text-[10px] text-gray-600 whitespace-nowrap" style={{ display: "inline-block", width: "200%" }}>
            <span className="mr-8">⚡ POWER: {power} MW</span>
            <span className="mr-8">◎ PUE: {pue.toFixed(3)}</span>
            <span className="mr-8">▣ ACTIVE GPU NODES: 72</span>
            <span className="mr-8">≋ COOLING: OPTIMAL</span>
            <span className="mr-8">⊞ IB FABRIC: 3.2 Tbps</span>
            <span className="mr-8">◈ CPU UTILIZATION: 61%</span>
            <span className="mr-8">▬ MEMORY: 144 TB TOTAL</span>
            <span className="mr-8">⚡ POWER: {power} MW</span>
            <span className="mr-8">◎ PUE: {pue.toFixed(3)}</span>
            <span className="mr-8">▣ ACTIVE GPU NODES: 72</span>
            <span className="mr-8">≋ COOLING: OPTIMAL</span>
            <span className="mr-8">⊞ IB FABRIC: 3.2 Tbps</span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="neon-cyan text-sm font-bold">{timeStr}</div>
          <div className="text-gray-600 text-[10px]">{dateStr}</div>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex min-h-0">

        {/* Left content */}
        <div className="flex-1 flex flex-col min-w-0 p-4">

          {/* Breadcrumb */}
          <Breadcrumb
            view={view}
            rack={selectedRack}
            onFloor={goToFloor}
            onRack={goToRack}
          />

          {/* View title */}
          <div className="flex items-center gap-3 mb-4">
            <div className="text-xl font-bold text-white">
              {view === "floor" && <><span className="neon-cyan">LEVEL 1</span> — Data Center Floor Plan</>}
              {view === "rack" && <><span className="neon-cyan">LEVEL 2</span> — Rack View: {selectedRack?.id}</>}
              {view === "component" && <><span className="neon-cyan">LEVEL 3</span> — Component Inspector</>}
            </div>
            {view === "floor" && (
              <div className="ml-auto flex items-center gap-3 text-xs text-gray-600">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-green-400 rounded-full inline-block" /> NOMINAL</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-cyan-400 rounded-full inline-block" /> HIGH LOAD</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-amber-400 rounded-full inline-block" /> CRITICAL</span>
              </div>
            )}
            {view !== "floor" && (
              <button
                onClick={view === "component" ? goToRack : goToFloor}
                className="ml-auto text-xs border border-gray-700 rounded px-3 py-1.5 text-gray-400 hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
              >
                ← Back to {view === "component" ? "Rack View" : "Floor Plan"}
              </button>
            )}
          </div>

          {/* Views */}
          {view === "floor" && (
            <FloorPlanView
              racks={RACKS}
              onRackClick={handleRackClick}
              onSidebarInfo={setSidebarInfo}
            />
          )}
          {view === "rack" && selectedRack && (
            <RackView
              rack={selectedRack}
              onNodeClick={handleNodeClick}
              onSidebarInfo={setSidebarInfo}
            />
          )}
          {view === "component" && selectedRack && selectedNodeId && (
            <ComponentInspector
              rack={selectedRack}
              nodeId={selectedNodeId}
              onSelectComponent={setSidebarInfo}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="w-72 shrink-0 border-l border-gray-800 bg-gray-950 flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-800 flex items-center gap-2 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot" />
            <div className="text-xs text-gray-500 tracking-widest font-bold">COMPONENT INSPECTOR</div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <Sidebar info={sidebarInfo} />
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="border-t border-gray-800 px-4 py-1.5 flex items-center gap-4 text-[10px] text-gray-600 bg-gray-950 shrink-0">
        <span className="text-green-400">● SYSTEM ONLINE</span>
        <span>RACKS: 18 ACTIVE</span>
        <span>GPU NODES: 72 RUNNING</span>
        <span>JOBS: 14 TRAINING / 8 INFERENCE</span>
        <div className="flex-1" />
        <span>UPTIME: 99.98%</span>
        <span className="text-cyan-400">SLA: COMPLIANT</span>
      </div>
    </div>
  );
}
