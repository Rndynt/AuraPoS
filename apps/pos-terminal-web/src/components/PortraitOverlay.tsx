import { useState, useEffect } from "react";

export function PortraitOverlay() {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    // Only show on touch/tablet devices, not desktop
    const isTouch = () => window.matchMedia("(pointer: coarse)").matches;

    const check = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsPortrait(e.matches && isTouch());
    };

    check(mq);
    mq.addEventListener("change", check);
    return () => mq.removeEventListener("change", check);
  }, []);

  if (!isPortrait) return null;

  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-sm">
      <style>{`
        @keyframes rotatePhone {
          0%   { transform: rotate(0deg); }
          25%  { transform: rotate(-15deg); }
          50%  { transform: rotate(90deg); }
          75%  { transform: rotate(90deg) scale(1.05); }
          100% { transform: rotate(90deg); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1); }
        }
        .phone-anim {
          animation: rotatePhone 2.4s cubic-bezier(0.4,0,0.2,1) infinite;
        }
        .text-anim {
          animation: fadeSlideUp 0.5s ease both;
        }
        .dot1 { animation: pulseDot 1.4s ease infinite 0s; }
        .dot2 { animation: pulseDot 1.4s ease infinite 0.2s; }
        .dot3 { animation: pulseDot 1.4s ease infinite 0.4s; }
      `}</style>

      {/* Phone icon animasi rotate */}
      <div className="mb-10 phone-anim">
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          {/* Phone body */}
          <rect x="16" y="8" width="40" height="56" rx="6" fill="white" opacity="0.15" />
          <rect x="18" y="10" width="36" height="52" rx="5" stroke="white" strokeWidth="2.5" fill="none" />
          {/* Screen */}
          <rect x="21" y="15" width="30" height="38" rx="3" fill="white" opacity="0.1" />
          {/* Home button */}
          <circle cx="36" cy="58" r="3" fill="white" opacity="0.6" />
          {/* Speaker */}
          <rect x="29" y="11.5" width="14" height="2" rx="1" fill="white" opacity="0.4" />
          {/* Arrow indicating rotation */}
          <path d="M 62 24 C 68 32 68 44 62 52" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" fill="none" strokeDasharray="4 3" />
          <path d="M 60 50 L 63 53 L 66 50" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>

      {/* Teks */}
      <div className="text-center space-y-3 text-anim px-8">
        <h2 className="text-2xl font-black text-white tracking-tight">
          Putar Perangkat
        </h2>
        <p className="text-slate-400 text-base font-medium leading-relaxed">
          Aplikasi ini dirancang untuk<br />tampilan <span className="text-blue-400 font-bold">landscape</span>
        </p>
      </div>

      {/* Dots loading */}
      <div className="flex items-center gap-2 mt-10">
        <span className="dot1 w-2 h-2 rounded-full bg-blue-400 inline-block" />
        <span className="dot2 w-2 h-2 rounded-full bg-blue-400 inline-block" />
        <span className="dot3 w-2 h-2 rounded-full bg-blue-400 inline-block" />
      </div>

      {/* Overlay hilang otomatis saat rotate */}
      <p className="absolute bottom-8 text-xs text-slate-600 font-medium">
        Overlay akan hilang otomatis saat landscape
      </p>
    </div>
  );
}
