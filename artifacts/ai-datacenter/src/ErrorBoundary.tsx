import { Component, ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; errorMsg: string; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMsg: "" };
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }
  render() {
    if (this.state.hasError) {
      const isWebGL = this.state.errorMsg.toLowerCase().includes("webgl");
      return (
        <div style={{
          width: "100vw", height: "100vh", background: "#050810",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'JetBrains Mono', monospace", color: "#fff",
        }}>
          <div style={{
            textAlign: "center", maxWidth: 500,
            border: "1px solid #00d4ff30", borderRadius: 12, padding: 40,
            background: "rgba(0,30,50,0.6)",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠</div>
            <div style={{ color: "#00d4ff", fontSize: 16, fontWeight: "bold", marginBottom: 12, textShadow: "0 0 12px #00d4ff" }}>
              {isWebGL ? "WebGL Not Available" : "Render Error"}
            </div>
            <p style={{ color: "#667", fontSize: 12, lineHeight: 1.7, marginBottom: 20 }}>
              {isWebGL
                ? "This 3D Data Center Simulator requires WebGL, which is supported in all modern desktop browsers (Chrome, Firefox, Edge, Safari). Please open this in your browser — not in a restricted iframe or headless environment."
                : this.state.errorMsg}
            </p>
            <div style={{ color: "#333", fontSize: 10, letterSpacing: 2 }}>
              CHROME 90+ · FIREFOX 88+ · EDGE 90+ · SAFARI 15+
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
