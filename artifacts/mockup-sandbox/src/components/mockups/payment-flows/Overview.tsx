import { useState } from "react";
import { Banknote, QrCode, Layers, Wallet, Clock, ArrowRight, ChevronRight, CreditCard } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const TOTAL = 85500;

type FlowId = "full" | "dp" | "multi" | "split";

const FLOWS: {
  id: FlowId;
  icon: typeof Banknote;
  label: string;
  sublabel: string;
  color: string;
  bg: string;
  border: string;
  text: string;
  steps: string[];
  badge?: string;
  badgeColor?: string;
}[] = [
  {
    id: "full",
    icon: Banknote,
    label: "Bayar Penuh",
    sublabel: "Satu transaksi, langsung lunas",
    color: "from-blue-500 to-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    steps: ["Pilih metode", "Masukkan jumlah", "Konfirmasi"],
    badge: "Paling Umum",
    badgeColor: "bg-blue-100 text-blue-600",
  },
  {
    id: "dp",
    icon: Clock,
    label: "DP / Cicil",
    sublabel: "Bayar sebagian, sisa nanti",
    color: "from-amber-500 to-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    steps: ["Pilih % DP", "Bayar DP", "Bayar sisa"],
  },
  {
    id: "multi",
    icon: Wallet,
    label: "Multi Payment",
    sublabel: "Gabung beberapa metode pembayaran",
    color: "from-teal-500 to-teal-600",
    bg: "bg-teal-50",
    border: "border-teal-200",
    text: "text-teal-700",
    steps: ["Tambah Tunai", "Tambah QRIS", "Selesai"],
    badge: "Baru",
    badgeColor: "bg-teal-100 text-teal-600",
  },
  {
    id: "split",
    icon: Layers,
    label: "Split Bill",
    sublabel: "Bagi tagihan per orang",
    color: "from-indigo-500 to-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-700",
    steps: ["Pilih jumlah orang", "Tiap orang bayar bill-nya", "Semua lunas"],
    badge: "Baru",
    badgeColor: "bg-indigo-100 text-indigo-600",
  },
];

function FlowCard({ flow, selected, onClick }: { flow: typeof FLOWS[0]; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl border-2 transition-all overflow-hidden ${
        selected ? `${flow.border} ${flow.bg}` : "border-slate-100 bg-white hover:border-slate-200"
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${flow.color} flex items-center justify-center flex-shrink-0`}>
            <flow.icon size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`font-bold text-sm ${selected ? flow.text : "text-slate-700"}`}>{flow.label}</p>
              {flow.badge && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-lg ${flow.badgeColor}`}>{flow.badge}</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{flow.sublabel}</p>
          </div>
          <ChevronRight size={14} className={`flex-shrink-0 transition-transform mt-0.5 ${selected ? `${flow.text} rotate-90` : "text-slate-300"}`} />
        </div>

        {selected && (
          <div className="mt-3 pl-1">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Alur</p>
            <div className="flex items-center gap-1 flex-wrap">
              {flow.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${flow.bg} ${flow.text} border ${flow.border}`}>
                    {step}
                  </span>
                  {i < flow.steps.length - 1 && (
                    <ArrowRight size={10} className="text-slate-300 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

export function Overview() {
  const [selected, setSelected] = useState<FlowId>("multi");
  const active = FLOWS.find(f => f.id === selected)!;

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center p-4 pt-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Tagihan</p>
              <p className="font-black text-2xl text-slate-900 tabular-nums">{fmt(TOTAL)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Pilih alur pembayaran</p>
            </div>
            <div className="flex gap-1.5">
              {[Banknote, QrCode, CreditCard].map((Icon, i) => (
                <div key={i} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Icon size={14} className="text-slate-400" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Flow cards */}
        <div className="px-4 py-3 space-y-2">
          {FLOWS.map(flow => (
            <FlowCard
              key={flow.id}
              flow={flow}
              selected={selected === flow.id}
              onClick={() => setSelected(flow.id)}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="px-4 pb-5">
          <button
            className={`w-full py-3.5 rounded-xl bg-gradient-to-r ${active.color} text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all`}
          >
            Lanjut dengan {active.label}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
