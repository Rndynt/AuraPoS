import { useState } from "react";
import { Users, ChevronRight, Banknote, QrCode, CheckCircle2, CreditCard } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const TOTAL = 85500;

const ITEMS = [
  { name: "Nasi Goreng Special", qty: 2, price: 18000 },
  { name: "Es Teh Manis", qty: 2, price: 5000 },
  { name: "Ayam Bakar", qty: 1, price: 22000 },
  { name: "Jus Alpukat", qty: 1, price: 12000 },
  { name: "Pajak 5%", qty: 1, price: 4025 },
  { name: "Biaya Layanan", qty: 1, price: 475 },
];

const COLORS = [
  { bg: "bg-blue-500", light: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", label: "text-blue-500" },
  { bg: "bg-violet-500", light: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", label: "text-violet-500" },
  { bg: "bg-amber-500", light: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", label: "text-amber-500" },
  { bg: "bg-rose-500", light: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", label: "text-rose-500" },
];

const METHODS = [
  { id: "cash", label: "Tunai", Icon: Banknote },
  { id: "qris", label: "QRIS", Icon: QrCode },
  { id: "card", label: "Kartu", Icon: CreditCard },
];

type Step = "pick-count" | "assign" | "pay";

export function SplitBill() {
  const [step, setStep] = useState<Step>("pick-count");
  const [count, setCount] = useState(2);
  const [paidBills, setPaidBills] = useState<Set<number>>(new Set());
  const [selectedBill, setSelectedBill] = useState<number | null>(null);

  const perPerson = Math.round(TOTAL / count);
  const lastPerson = TOTAL - perPerson * (count - 1);

  const bills = Array.from({ length: count }, (_, i) => ({
    index: i,
    label: String.fromCharCode(65 + i), // A, B, C, D
    amount: i === count - 1 ? lastPerson : perPerson,
  }));

  const allPaid = paidBills.size === count;

  if (step === "pick-count") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 px-5 pt-5 pb-5">
            <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest">Split Bill</p>
            <p className="text-white font-black text-3xl tabular-nums">{fmt(TOTAL)}</p>
            <p className="text-indigo-200 text-sm mt-1">Bagi tagihan ke beberapa orang</p>
          </div>

          {/* Items summary */}
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Item Pesanan</p>
            <div className="space-y-1.5">
              {ITEMS.slice(0, 4).map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-xs text-slate-600">{item.qty > 1 ? `${item.qty}× ` : ""}{item.name}</span>
                  <span className="text-xs font-semibold text-slate-700">{fmt(item.qty * item.price)}</span>
                </div>
              ))}
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">+ 2 lainnya (pajak & layanan)</span>
                <span className="text-xs text-slate-400">{fmt(4500)}</span>
              </div>
            </div>
          </div>

          {/* Jumlah orang */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Berapa Orang?</p>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {[2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`py-3 rounded-xl text-sm font-black border-2 transition-all ${
                    count === n
                      ? "bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-200"
                      : "bg-white border-slate-200 text-slate-500"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Per person preview */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} className="text-indigo-500" />
                <p className="text-xs font-bold text-indigo-600">{count} orang</p>
              </div>
              <div className="space-y-1">
                {bills.map(b => (
                  <div key={b.index} className="flex justify-between">
                    <span className="text-xs text-indigo-500">Bill {b.label}</span>
                    <span className="text-sm font-black text-indigo-700">{fmt(b.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep("pay")}
              className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all"
            >
              Lanjut ke Pembayaran
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pay step
  if (allPaid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-green-500 px-6 pt-8 pb-10 text-center">
            <CheckCircle2 size={56} className="text-white mx-auto mb-3" />
            <p className="text-white font-black text-2xl">Split Bill Selesai!</p>
            <p className="text-green-100 text-sm mt-1">{count} orang sudah bayar</p>
          </div>
          <div className="px-5 py-4 space-y-2">
            {bills.map(b => {
              const c = COLORS[b.index % COLORS.length];
              return (
                <div key={b.index} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${c.light} border ${c.border}`}>
                  <span className={`w-6 h-6 rounded-full ${c.bg} text-white text-xs font-black flex items-center justify-center flex-shrink-0`}>
                    {b.label}
                  </span>
                  <span className={`text-sm font-bold ${c.text} flex-1`}>Bill {b.label}</span>
                  <CheckCircle2 size={14} className="text-green-500" />
                  <span className={`text-sm font-black tabular-nums ${c.text}`}>{fmt(b.amount)}</span>
                </div>
              );
            })}
          </div>
          <div className="px-5 pb-5">
            <button
              onClick={() => { setPaidBills(new Set()); setStep("pick-count"); setCount(2); }}
              className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm"
            >
              Reset Demo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 px-5 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest">Split Bill</p>
              <p className="text-white font-black text-2xl tabular-nums">{fmt(TOTAL)}</p>
            </div>
            <div className="text-right">
              <p className="text-indigo-200 text-xs">Terbayar</p>
              <p className="text-white font-bold text-sm">{paidBills.size}/{count} orang</p>
            </div>
          </div>
          {/* Progress dots */}
          <div className="flex gap-1.5 mt-3">
            {bills.map(b => (
              <div
                key={b.index}
                className={`flex-1 h-1.5 rounded-full transition-colors ${paidBills.has(b.index) ? "bg-white" : "bg-indigo-800/40"}`}
              />
            ))}
          </div>
        </div>

        {/* Bill cards */}
        <div className="px-4 py-3 space-y-2.5 max-h-[420px] overflow-y-auto">
          {bills.map(b => {
            const c = COLORS[b.index % COLORS.length];
            const isPaid = paidBills.has(b.index);
            const isOpen = selectedBill === b.index;

            return (
              <div key={b.index} className={`rounded-2xl border-2 overflow-hidden transition-all ${
                isPaid ? "border-green-200 bg-green-50 opacity-70" : isOpen ? `${c.border} ${c.light}` : "border-slate-100 bg-white"
              }`}>
                {/* Bill header */}
                <button
                  onClick={() => !isPaid && setSelectedBill(isOpen ? null : b.index)}
                  className="w-full flex items-center gap-3 px-4 py-3"
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0 ${isPaid ? "bg-green-400" : c.bg}`}>
                    {isPaid ? "✓" : b.label}
                  </span>
                  <div className="flex-1 text-left">
                    <p className={`text-xs font-bold ${isPaid ? "text-green-600" : "text-slate-600"}`}>
                      {isPaid ? `Bill ${b.label} · Lunas` : `Bill ${b.label}`}
                    </p>
                    <p className={`text-base font-black tabular-nums ${isPaid ? "text-green-500" : c.text}`}>
                      {fmt(b.amount)}
                    </p>
                  </div>
                  {!isPaid && (
                    <ChevronRight size={16} className={`transition-transform ${isOpen ? "rotate-90" : ""} ${c.label}`} />
                  )}
                </button>

                {/* Payment methods — only when open */}
                {isOpen && !isPaid && (
                  <div className="px-4 pb-4 border-t border-indigo-100 pt-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Pilih Metode</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {METHODS.map(m => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setPaidBills(prev => new Set([...prev, b.index]));
                            setSelectedBill(null);
                          }}
                          className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-bold transition-all border-slate-200 bg-white ${c.text} hover:${c.border} hover:${c.light}`}
                        >
                          <m.Icon size={16} />
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={() => setStep("pick-count")}
            className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs"
          >
            ← Ubah Jumlah Orang
          </button>
        </div>
      </div>
    </div>
  );
}
