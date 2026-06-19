import { useState } from "react";
import { Banknote, QrCode, CreditCard, Plus, Trash2, CheckCircle2, Delete } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const fmtNum = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(n);

const TOTAL = 85500;
const NUMPAD = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "000", "0", "⌫"] as const;
const METHODS = [
  { id: "cash", label: "Tunai", Icon: Banknote, color: "text-green-600", bg: "bg-green-50", border: "border-green-300" },
  { id: "qris", label: "QRIS", Icon: QrCode, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-300" },
  { id: "card", label: "Kartu", Icon: CreditCard, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-300" },
] as const;

type MethodId = "cash" | "qris" | "card";
type Entry = { id: number; method: MethodId; amount: number; label: string };

let _id = 1;

export function MultiPayment() {
  const [entries, setEntries] = useState<Entry[]>([
    { id: _id++, method: "cash", amount: 50000, label: "Tunai" },
  ]);
  const [method, setMethod] = useState<MethodId>("qris");
  const [raw, setRaw] = useState("");
  const [done, setDone] = useState(false);

  const paid = entries.reduce((s, e) => s + e.amount, 0);
  const remaining = Math.max(0, TOTAL - paid);
  const isComplete = remaining === 0;
  const inputAmount = parseInt(raw) || 0;
  const canAdd = inputAmount > 0 && inputAmount <= remaining;

  const handleKey = (key: string) => {
    if (key === "⌫") { setRaw(r => r.slice(0, -1)); return; }
    const next = key === "000" ? (raw === "" ? "" : raw + "000") : raw + key;
    if (parseInt(next || "0") <= 99_999_999) setRaw(next);
  };

  const addEntry = () => {
    if (!canAdd) return;
    const m = METHODS.find(m => m.id === method)!;
    setEntries(prev => [...prev, { id: _id++, method, amount: inputAmount, label: m.label }]);
    setRaw("");
  };

  const removeEntry = (id: number) => setEntries(prev => prev.filter(e => e.id !== id));

  const quickFill = () => setRaw(String(remaining));

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-green-500 px-6 pt-8 pb-10 text-center">
            <CheckCircle2 size={56} className="text-white mx-auto mb-3" />
            <p className="text-white font-black text-2xl">Pembayaran Selesai!</p>
            <p className="text-green-100 text-sm mt-1">{fmt(TOTAL)} terbayar lunas</p>
          </div>
          <div className="px-5 py-4 space-y-2">
            {entries.map(e => {
              const m = METHODS.find(m => m.id === e.method)!;
              return (
                <div key={e.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${m.bg} border ${m.border}`}>
                  <m.Icon size={15} className={m.color} />
                  <span className="text-sm font-semibold text-slate-700 flex-1">{e.label}</span>
                  <span className={`text-sm font-black ${m.color}`}>{fmt(e.amount)}</span>
                </div>
              );
            })}
          </div>
          <div className="px-5 pb-5">
            <button
              onClick={() => { setDone(false); setEntries([{ id: _id++, method: "cash", amount: 50000, label: "Tunai" }]); setRaw(""); }}
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
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-br from-teal-500 to-teal-700 px-5 pt-5 pb-4">
          <p className="text-teal-100 text-xs font-bold uppercase tracking-widest">Multi Payment</p>
          <p className="text-white font-black text-3xl tabular-nums leading-tight">{fmt(TOTAL)}</p>

          {/* Progress bar */}
          <div className="mt-3 bg-teal-800/40 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (paid / TOTAL) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-teal-100 text-[11px]">Terbayar {fmt(paid)}</span>
            <span className="text-white font-bold text-[11px]">Sisa {fmt(remaining)}</span>
          </div>
        </div>

        {/* Payment entries */}
        <div className="px-4 pt-3 pb-2 space-y-2 max-h-[140px] overflow-y-auto">
          {entries.map(e => {
            const m = METHODS.find(m => m.id === e.method)!;
            return (
              <div key={e.id} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 border ${m.border} ${m.bg}`}>
                <m.Icon size={14} className={m.color} />
                <span className="text-xs font-bold text-slate-700 flex-1">{e.label}</span>
                <span className={`text-sm font-black tabular-nums ${m.color}`}>{fmt(e.amount)}</span>
                <button onClick={() => removeEntry(e.id)} className="text-slate-300 hover:text-red-400 transition-colors ml-1">
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Add payment section */}
        {!isComplete && (
          <div className="px-4 pb-3 border-t border-slate-100 pt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tambah Pembayaran</p>

            {/* Method selector */}
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                    method === m.id
                      ? `${m.bg} ${m.border} ${m.color}`
                      : "bg-white border-slate-200 text-slate-400"
                  }`}
                >
                  <m.Icon size={16} />
                  {m.label}
                </button>
              ))}
            </div>

            {/* Amount input */}
            <div className="bg-slate-50 border-2 border-teal-400 rounded-2xl px-4 py-2.5 flex items-center gap-2 mb-2">
              <span className="text-sm font-bold text-slate-400">Rp</span>
              <span className="flex-1 text-xl font-black text-slate-800 tabular-nums">
                {raw === "" ? <span className="text-slate-300">0</span> : fmtNum(inputAmount)}
              </span>
              <button onClick={quickFill} className="text-[10px] font-bold text-teal-600 bg-teal-50 border border-teal-200 px-2 py-1 rounded-lg">
                Sisa
              </button>
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {NUMPAD.map(key => (
                <button
                  key={key}
                  onClick={() => handleKey(key)}
                  className={`h-10 rounded-xl font-bold text-base flex items-center justify-center transition-all active:scale-95 border ${
                    key === "⌫"
                      ? "bg-red-50 border-red-100 text-red-400"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-teal-50 hover:border-teal-300"
                  }`}
                >
                  {key === "⌫" ? <Delete size={15} /> : key}
                </button>
              ))}
            </div>

            <button
              onClick={addEntry}
              disabled={!canAdd}
              className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Plus size={15} />
              Tambah {method === "cash" ? "Tunai" : method === "qris" ? "QRIS" : "Kartu"}
              {inputAmount > 0 ? ` · ${fmt(inputAmount)}` : ""}
            </button>
          </div>
        )}

        {/* Complete button */}
        {isComplete && (
          <div className="px-4 pb-5 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 mb-3">
              <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
              <p className="text-sm font-bold text-green-700">Semua pembayaran terpenuhi!</p>
            </div>
            <button
              onClick={() => setDone(true)}
              className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold shadow-lg shadow-green-200 transition-all"
            >
              Selesaikan Pembayaran
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
