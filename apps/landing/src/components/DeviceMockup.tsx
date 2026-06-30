interface DeviceMockupProps {
  type: "tablet" | "phone";
  src: string;
  className?: string;
  displayWidth?: number;
}

/* Native render resolutions for the embedded mockup iframes.
   AuraPoS terminal is orientation-locked to landscape on tablets — see
   apps/pos-terminal-web/src/main.tsx (screen.orientation.lock("landscape")). */
const NATIVE = {
  tablet: { w: 1180, h: 820 },
  phone: { w: 390, h: 844 },
};

function ScaledIframe({ src, nativeW, nativeH, displayW }: { src: string; nativeW: number; nativeH: number; displayW: number }) {
  const scale = displayW / nativeW;
  const displayH = nativeH * scale;
  return (
    <div style={{ width: displayW, height: displayH, overflow: "hidden", position: "relative", flexShrink: 0 }}>
      <iframe
        src={src}
        title="AuraPoS preview"
        style={{
          width: nativeW,
          height: nativeH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          border: "none",
          display: "block",
          pointerEvents: "none",
        }}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}

export function DeviceMockup({ type, src, className = "", displayWidth }: DeviceMockupProps) {
  const native = NATIVE[type];

  if (type === "tablet") {
    // Landscape tablet: thin uniform bezel, camera pill centered on the
    // short (top) edge — mirrors how the real AuraPoS terminal is held
    // in-store (landscape-locked, mounted on a counter stand).
    const dw = displayWidth ?? 560;
    return (
      <div className={`inline-flex flex-col items-center ${className}`}>
        <div
          className="bg-slate-800 shadow-2xl"
          style={{ borderRadius: 22, padding: 10, width: dw + 20 }}
        >
          <div className="flex justify-center pb-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-600" />
          </div>
          <div className="rounded-[12px] overflow-hidden bg-slate-900">
            <ScaledIframe src={src} nativeW={native.w} nativeH={native.h} displayW={dw} />
          </div>
        </div>
        {/* Counter-mount stand foot, grounds the device as an in-store fixture */}
        <div className="w-16 h-3 bg-slate-700/80 rounded-b-md" style={{ marginTop: -2 }} />
        <div className="w-28 h-1.5 bg-slate-300/60 rounded-full mt-1 blur-[1px]" />
      </div>
    );
  }

  // phone (portrait) — used for the "check sales on the go" report use case
  const dw = displayWidth ?? 200;
  return (
    <div className={`relative ${className}`}>
      <div
        className="bg-slate-800 border-[5px] border-slate-700 shadow-2xl overflow-hidden flex flex-col"
        style={{ borderRadius: 36, width: dw + 20, padding: 6 }}>
        <div className="flex justify-center py-2">
          <div className="w-14 h-4 bg-slate-900 rounded-full flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden">
          <ScaledIframe src={src} nativeW={native.w} nativeH={native.h} displayW={dw} />
        </div>
        <div className="flex justify-center py-2">
          <div className="w-16 h-1 rounded-full bg-slate-600" />
        </div>
      </div>
    </div>
  );
}
