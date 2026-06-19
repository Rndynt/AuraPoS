// @ts-nocheck
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Banknote, CreditCard, QrCode, Delete, Wallet, Layers, X, Plus, Trash2, CheckCircle2 } from "lucide-react";
import type { PaymentMethod, CartItem } from "@/hooks/useCart";
import { getItemEffectiveTotal } from "@/hooks/useCart";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (method: PaymentMethod, cashReceived?: number, partialAmount?: number) => void;
  onMethodChange?: (method: PaymentMethod) => void;
  cartTotal: number;
  cartItems?: CartItem[];
  isSubmitting?: boolean;
  defaultPaymentMethod?: PaymentMethod;
  allowPartial?: boolean;
  allowMultiPayment?: boolean;
  allowSplitBill?: boolean;
  initialPartialMode?: boolean;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const fmtNum = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(n);

const NUMPAD = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "000", "0", "⌫"] as const;
type PaymentFlow = "full" | "dp" | "multi" | "split";

const METHODS = [
  { id: "cash" as PaymentMethod, label: "Tunai", Icon: Banknote },
  { id: "ewallet" as PaymentMethod, label: "QRIS", Icon: QrCode },
  { id: "card" as PaymentMethod, label: "Kartu", Icon: CreditCard },
];

const BILL_COLORS = [
  { badge: "bg-blue-100 text-blue-700", border: "border-blue-300", light: "bg-blue-50", text: "text-blue-700" },
  { badge: "bg-violet-100 text-violet-700", border: "border-violet-300", light: "bg-violet-50", text: "text-violet-700" },
  { badge: "bg-amber-100 text-amber-700", border: "border-amber-300", light: "bg-amber-50", text: "text-amber-700" },
  { badge: "bg-rose-100 text-rose-700", border: "border-rose-300", light: "bg-rose-50", text: "text-rose-700" },
];

function useIsLandscape() {
  const [isLandscape, setIsLandscape] = useState(
    () => typeof window !== "undefined" && window.innerWidth > window.innerHeight && window.innerWidth < 1024
  );
  useEffect(() => {
    const check = () =>
      setIsLandscape(window.innerWidth > window.innerHeight && window.innerWidth < 1024);
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);
  return isLandscape;
}

export function PaymentMethodDialog({
  open,
  onClose,
  onConfirm,
  onMethodChange,
  cartTotal,
  cartItems = [],
  isSubmitting = false,
  defaultPaymentMethod = "cash",
  allowPartial = false,
  allowMultiPayment = false,
  allowSplitBill = false,
  initialPartialMode = false,
}: Props) {
  const [method, setMethod] = useState<PaymentMethod>(defaultPaymentMethod);
  const [cashRaw, setCashRaw] = useState("");
  const [partialRaw, setPartialRaw] = useState("");
  const [flow, setFlow] = useState<PaymentFlow>(initialPartialMode ? "dp" : "full");
  const [isProcessing, setIsProcessing] = useState(false);
  const isLandscape = useIsLandscape();

  // ── Multi payment state ──────────────────────────────────────────────────
  const [multiEntries, setMultiEntries] = useState<Array<{ id: number; method: PaymentMethod; amount: number }>>([]);
  const [multiRaw, setMultiRaw] = useState("");
  const [multiMethod, setMultiMethod] = useState<PaymentMethod>("cash");

  // ── Split bill state ─────────────────────────────────────────────────────
  const [splitBills, setSplitBills] = useState<string[]>(["A", "B"]);
  const [itemBillMap, setItemBillMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setMethod(defaultPaymentMethod);
    setCashRaw("");
    setPartialRaw("");
    setFlow(initialPartialMode ? "dp" : "full");
    setIsProcessing(false);
    setMultiEntries([]);
    setMultiRaw("");
    setMultiMethod("cash");
    setSplitBills(["A", "B"]);
    setItemBillMap({});
  }, [open, defaultPaymentMethod, initialPartialMode]);

  // ── Full payment derived ─────────────────────────────────────────────────
  const cashAmount = parseInt(cashRaw) || 0;
  const change = cashAmount - cartTotal;
  const isEnough = change >= 0;
  const partialAmount = parseInt(partialRaw) || 0;
  const remaining = cartTotal - partialAmount;
  const isValidPartial = partialAmount > 0 && partialAmount < cartTotal;
  const loading = isProcessing || isSubmitting;

  // ── Multi payment derived ────────────────────────────────────────────────
  const multiPaid = multiEntries.reduce((s, e) => s + e.amount, 0);
  const multiRemaining = Math.max(0, cartTotal - multiPaid);
  const multiInputAmount = parseInt(multiRaw) || 0;
  const multiCanAdd = multiInputAmount > 0 && multiInputAmount <= multiRemaining;
  const multiComplete = multiRemaining === 0;

  // ── Split bill helpers ───────────────────────────────────────────────────
  const getBillForItem = (itemId: string) => itemBillMap[itemId] || splitBills[0];
  const getBillTotal = (bill: string) =>
    cartItems.reduce((sum, item) => getBillForItem(item.id) === bill ? sum + getItemEffectiveTotal(item) : sum, 0);
  const cycleBill = (itemId: string) => {
    const current = getBillForItem(itemId);
    const idx = splitBills.indexOf(current);
    const next = splitBills[(idx + 1) % splitBills.length];
    setItemBillMap(prev => ({ ...prev, [itemId]: next }));
  };

  const selectMethod = (nextMethod: PaymentMethod) => {
    setMethod(nextMethod);
    onMethodChange?.(nextMethod);
  };

  const getRaw = () => flow === "dp" ? partialRaw : cashRaw;
  const setRaw = (next: string) => flow === "dp" ? setPartialRaw(next) : setCashRaw(next);

  const handleKey = (key: string) => {
    const current = getRaw();
    if (key === "⌫") { setRaw(current.slice(0, -1)); return; }
    const next = key === "000" ? (current === "" ? "" : current + "000") : current + key;
    if (parseInt(next || "0") <= 99_999_999) setRaw(next);
  };

  const handleProcess = () => {
    if (loading) return;
    if (flow === "dp") {
      if (!isValidPartial) return;
      setIsProcessing(true);
      setTimeout(() => { setIsProcessing(false); onConfirm(method, undefined, partialAmount); }, 400);
      return;
    }
    if (flow === "multi") {
      if (!multiComplete) return;
      setIsProcessing(true);
      setTimeout(() => { setIsProcessing(false); onConfirm(method); }, 400);
      return;
    }
    if (flow === "split") {
      setIsProcessing(true);
      setTimeout(() => { setIsProcessing(false); onConfirm(method); }, 400);
      return;
    }
    if (flow === "full") {
      if (method === "cash" && !isEnough) return;
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        onConfirm(method, method === "cash" ? cashAmount || cartTotal : undefined);
      }, 400);
    }
  };

  const close = () => { if (loading) return; setCashRaw(""); setPartialRaw(""); onClose(); };

  const showNumpad = flow === "full" ? method === "cash" : flow === "dp";
  const hasExtraFlows = allowPartial || allowMultiPayment || allowSplitBill;

  /* ── Left panel ── */
  const LeftPanel = () => (
    <div className={`flex flex-col ${isLandscape ? "w-[180px] border-r border-slate-100 flex-shrink-0" : "w-full"}`}>
      <div className={`flex items-center justify-between px-4 pt-4 pb-3 ${isLandscape ? "" : "px-5 pt-5"}`}>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Pembayaran</p>
          <p className="text-xl font-black text-slate-900 tabular-nums leading-tight" data-testid="text-payment-total">
            {fmt(cartTotal)}
          </p>
        </div>
      </div>

      {hasExtraFlows && (
        <div className={`px-4 mb-3 flex gap-1.5 flex-wrap ${isLandscape ? "" : "px-5"}`}>
          {([
            ["full", "Bayar Penuh"],
            ...(allowPartial ? [["dp", "DP"]] : []),
            ...(allowMultiPayment ? [["multi", "Multi"]] : []),
            ...(allowSplitBill ? [["split", "Split"]] : []),
          ] as [PaymentFlow, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setFlow(id); setCashRaw(""); setPartialRaw(""); }}
              className={`flex-1 text-xs font-bold py-1.5 px-2 rounded-lg transition-all ${
                flow === id ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
              data-testid={`button-payment-flow-${id}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className={`px-4 mb-3 ${isLandscape ? "" : "px-5 mb-4"}`}>
        <div className={`grid gap-2 ${isLandscape ? "grid-cols-1" : "grid-cols-3"}`}>
          {METHODS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => selectMethod(id)}
              className={`flex items-center gap-2 py-2.5 px-3 rounded-xl border-2 transition-all font-bold text-xs ${
                isLandscape ? "justify-start" : "flex-col justify-center"
              } ${
                method === id
                  ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                  : "bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600"
              }`}
              data-testid={`sidebar-payment-${id}`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  /* ── Right panel / content area ── */
  const ContentArea = () => (
    <div className={`flex flex-col flex-1 min-h-0 ${isLandscape ? "overflow-y-auto" : ""}`}>

      {/* ── DP MODE ── */}
      {flow === "dp" && (
        <>
          <div className="px-4 mb-2">
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1.5">Jumlah DP</p>
            <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl px-4 py-2.5 flex items-center gap-2 min-h-[50px]">
              <span className="text-sm font-bold text-amber-400">Rp</span>
              <span className="flex-1 text-xl font-black text-slate-800 tabular-nums" data-testid="input-partial-amount">
                {partialRaw === "" ? <span className="text-slate-300">0</span> : fmtNum(partialAmount)}
              </span>
            </div>
          </div>
          <div className="px-4 mb-2 grid grid-cols-4 gap-1.5">
            {[{ l: "25%", v: Math.round(cartTotal * 0.25) }, { l: "50%", v: Math.round(cartTotal * 0.5) }, { l: "75%", v: Math.round(cartTotal * 0.75) }, { l: "Reset", v: 0 }].map((p) => (
              <button key={p.l} onClick={() => setPartialRaw(p.v > 0 ? String(p.v) : "")}
                className={`py-1.5 text-xs font-bold rounded-lg transition-colors border ${partialAmount === p.v && p.v > 0 ? "bg-amber-400 text-white border-amber-400" : p.l === "Reset" ? "bg-slate-100 border-transparent text-slate-400 hover:bg-red-50 hover:text-red-500" : "bg-slate-100 border-transparent text-slate-500 hover:bg-amber-50 hover:text-amber-600"}`}>
                {p.l}
              </button>
            ))}
          </div>
          <div className="px-4 grid grid-cols-3 gap-1.5 mb-2">
            {NUMPAD.map((key) => (
              <button key={key} onClick={() => handleKey(key)}
                className={`h-11 rounded-xl font-bold text-lg flex items-center justify-center transition-all active:scale-95 select-none border ${
                  key === "⌫" ? "bg-red-50 border-red-100 text-red-500 hover:bg-red-100" : "bg-white border-slate-200 text-slate-700 hover:bg-amber-50 hover:border-amber-300 shadow-sm"
                }`}>
                {key === "⌫" ? <Delete size={16} /> : key}
              </button>
            ))}
          </div>
          <div className="px-4 pb-4 flex items-center gap-2">
            <div className={`flex-1 rounded-xl px-3 py-2 text-center border ${isValidPartial ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${isValidPartial ? "text-amber-500" : "text-slate-400"}`}>Sisa Tagihan</p>
              <p className={`text-sm font-black tabular-nums ${isValidPartial ? "text-amber-700" : "text-slate-400"}`} data-testid="text-remaining-balance">
                {fmt(isValidPartial ? remaining : cartTotal)}
              </p>
            </div>
            <button onClick={handleProcess} disabled={loading || !isValidPartial}
              className="flex-1 h-11 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-200 transition-all active:scale-[0.98]"
              data-testid="button-confirm-partial">
              {loading ? "Memproses…" : partialAmount > 0 ? `DP ${fmt(partialAmount)}` : "Masukkan Jumlah"}
            </button>
          </div>
        </>
      )}

      {/* ── FULL CASH MODE ── */}
      {flow === "full" && method === "cash" && (
        <>
          <div className="px-4 mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Uang Diterima</p>
            <div className="bg-slate-50 border-2 border-blue-500 rounded-2xl px-4 py-2.5 flex items-center gap-2 min-h-[50px]">
              <span className="text-sm font-bold text-slate-400">Rp</span>
              <span className="flex-1 text-xl font-black text-slate-800 tabular-nums" data-testid="input-cash-received">
                {cashRaw === "" ? <span className="text-slate-300">0</span> : fmtNum(cashAmount)}
              </span>
            </div>
          </div>
          <div className="px-4 mb-2 grid grid-cols-4 gap-1.5">
            {[{ l: "Pas", v: cartTotal }, { l: "50K", v: 50000 }, { l: "100K", v: 100000 }, { l: "200K", v: 200000 }].map((p) => (
              <button key={p.l} onClick={() => setCashRaw(String(p.v))}
                className="py-1.5 text-xs font-bold bg-slate-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 border border-transparent text-slate-500 rounded-lg transition-colors">
                {p.l}
              </button>
            ))}
          </div>
          <div className="px-4 grid grid-cols-3 gap-1.5 mb-2">
            {NUMPAD.map((key) => (
              <button key={key} onClick={() => handleKey(key)}
                className={`h-11 rounded-xl font-bold text-lg flex items-center justify-center transition-all active:scale-95 select-none border ${
                  key === "⌫" ? "bg-red-50 border-red-100 text-red-500 hover:bg-red-100" : "bg-white border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 shadow-sm"
                }`}>
                {key === "⌫" ? <Delete size={16} /> : key}
              </button>
            ))}
          </div>
          <div className="px-4 pb-4 flex items-center gap-2">
            <div className={`flex-1 rounded-xl px-3 py-2 text-center border ${isEnough ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${isEnough ? "text-green-500" : "text-red-400"}`}>{isEnough ? "Kembalian" : "Kurang"}</p>
              <p className={`text-sm font-black tabular-nums ${isEnough ? "text-green-700" : "text-red-600"}`} data-testid="text-change-amount">
                {fmt(Math.abs(change))}
              </p>
            </div>
            <button onClick={handleProcess} disabled={loading || !isEnough}
              className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
              data-testid="button-confirm-payment">
              {loading ? "Memproses…" : "Bayar"}
            </button>
          </div>
        </>
      )}

      {/* ── QRIS MODE ── */}
      {flow === "full" && method === "ewallet" && (
        <div className="flex flex-col items-center justify-center gap-3 px-6 pb-6">
          <div className="bg-white p-4 rounded-2xl border-2 border-slate-800 shadow-sm">
            <QrCode size={isLandscape ? 80 : 100} className="text-slate-800" />
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-800">Scan QRIS</p>
            <p className="text-sm text-slate-400 mt-0.5">Menunggu pembayaran…</p>
          </div>
          <button onClick={handleProcess} disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
            data-testid="button-confirm-payment">
            {loading ? "Memproses…" : "Konfirmasi Pembayaran"}
          </button>
        </div>
      )}

      {/* ── CARD MODE ── */}
      {flow === "full" && method === "card" && (
        <div className="flex flex-col items-center justify-center gap-3 px-6 pb-6">
          <div className="bg-blue-50 p-6 rounded-full">
            <CreditCard size={isLandscape ? 36 : 44} className="text-blue-600" />
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-800">Kartu Debit / Kredit</p>
            <p className="text-sm text-slate-400 mt-0.5 max-w-[200px]">Silakan gesek / tap kartu pada mesin EDC.</p>
          </div>
          <button onClick={handleProcess} disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
            data-testid="button-confirm-payment">
            {loading ? "Memproses…" : "Konfirmasi Pembayaran"}
          </button>
        </div>
      )}

      {/* ── MULTI PAYMENT ── */}
      {flow === "multi" && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Progress bar */}
          <div className="bg-gradient-to-br from-teal-500 to-teal-700 px-4 py-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-teal-100">Terbayar {fmt(multiPaid)}</span>
              <span className="text-white font-bold">Sisa {fmt(multiRemaining)}</span>
            </div>
            <div className="bg-teal-800/40 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, cartTotal > 0 ? (multiPaid / cartTotal) * 100 : 0)}%` }}
              />
            </div>
          </div>

          {/* Entries list */}
          {multiEntries.length > 0 && (
            <div className="px-4 pt-3 pb-1 space-y-1.5 max-h-[110px] overflow-y-auto">
              {multiEntries.map(e => {
                const m = METHODS.find(m => m.id === e.method)!;
                return (
                  <div key={e.id} className="flex items-center gap-2 rounded-xl px-3 py-2 bg-slate-50 border border-slate-200">
                    <m.Icon size={13} className="text-slate-500 flex-shrink-0" />
                    <span className="text-xs text-slate-600 flex-1">{m.label}</span>
                    <span className="text-sm font-black text-slate-800 tabular-nums">{fmt(e.amount)}</span>
                    <button
                      onClick={() => setMultiEntries(prev => prev.filter(x => x.id !== e.id))}
                      className="text-slate-300 hover:text-red-400 transition-colors ml-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add payment section */}
          {!multiComplete && (
            <div className="px-4 pt-3 pb-2 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tambah Pembayaran</p>

              {/* Method selector */}
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {METHODS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setMultiMethod(id)}
                    className={`flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                      multiMethod === id
                        ? "bg-teal-50 border-teal-400 text-teal-700"
                        : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Amount input */}
              <div className="bg-slate-50 border-2 border-teal-400 rounded-2xl px-4 py-2 flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-slate-400">Rp</span>
                <span className="flex-1 text-lg font-black text-slate-800 tabular-nums">
                  {multiRaw === "" ? <span className="text-slate-300">0</span> : fmtNum(multiInputAmount)}
                </span>
                <button
                  onClick={() => setMultiRaw(String(multiRemaining))}
                  className="text-[10px] font-bold text-teal-600 bg-teal-50 border border-teal-200 px-2 py-1 rounded-lg"
                >
                  Sisa
                </button>
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-1 mb-2">
                {NUMPAD.map((key) => (
                  <button key={key}
                    onClick={() => {
                      if (key === "⌫") { setMultiRaw(r => r.slice(0, -1)); return; }
                      const next = key === "000" ? (multiRaw === "" ? "" : multiRaw + "000") : multiRaw + key;
                      if (parseInt(next || "0") <= 99_999_999) setMultiRaw(next);
                    }}
                    className={`h-9 rounded-lg font-bold text-base flex items-center justify-center transition-all active:scale-95 select-none border ${
                      key === "⌫"
                        ? "bg-red-50 border-red-100 text-red-500 hover:bg-red-100"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-teal-50 hover:border-teal-200 shadow-sm"
                    }`}>
                    {key === "⌫" ? <Delete size={14} /> : key}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  if (!multiCanAdd) return;
                  setMultiEntries(prev => [...prev, { id: Date.now(), method: multiMethod, amount: multiInputAmount }]);
                  setMultiRaw("");
                }}
                disabled={!multiCanAdd}
                className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus size={14} />
                Tambah {METHODS.find(m => m.id === multiMethod)?.label}
                {multiInputAmount > 0 ? ` · ${fmt(multiInputAmount)}` : ""}
              </button>
            </div>
          )}

          {/* Selesaikan */}
          {multiComplete && (
            <div className="px-4 pb-4 pt-3">
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-3">
                <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                <p className="text-xs font-bold text-green-700">Semua pembayaran terpenuhi!</p>
              </div>
              <button
                onClick={handleProcess}
                disabled={loading}
                className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-slate-200 text-white font-bold rounded-xl shadow-lg shadow-green-200 transition-all active:scale-[0.98]"
                data-testid="button-confirm-payment"
              >
                {loading ? "Memproses…" : "Selesaikan Pembayaran"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── SPLIT BILL ── */}
      {flow === "split" && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Bills header */}
          <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex-1">Bagi per Bill</p>
            <div className="flex gap-1">
              {splitBills.map((bill, idx) => {
                const colors = BILL_COLORS[idx % BILL_COLORS.length];
                return (
                  <span key={bill} className={`text-xs font-black px-2 py-1 rounded-lg ${colors.badge}`}>
                    {bill}
                  </span>
                );
              })}
            </div>
            {splitBills.length < 4 && (
              <button
                onClick={() => {
                  const next = String.fromCharCode(65 + splitBills.length);
                  setSplitBills(prev => [...prev, next]);
                }}
                className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold hover:bg-slate-200 transition-colors"
              >
                +
              </button>
            )}
          </div>

          {/* Item list */}
          <div className="flex-1 px-4 py-2 overflow-y-auto space-y-1.5">
            {cartItems.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Tidak ada item di keranjang</p>
            ) : (
              cartItems.map(item => {
                const assignedBill = getBillForItem(item.id);
                const billIdx = splitBills.indexOf(assignedBill);
                const colors = BILL_COLORS[billIdx % BILL_COLORS.length];
                return (
                  <div key={item.id} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 active:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{item.product.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {item.quantity}× · {fmt(getItemEffectiveTotal(item))}
                      </p>
                    </div>
                    <button
                      onClick={() => cycleBill(item.id)}
                      className={`text-xs font-black px-2.5 py-1.5 rounded-lg border-2 transition-all active:scale-95 ${colors.badge} ${colors.border}`}
                    >
                      {assignedBill}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Per-bill totals */}
          <div className="px-4 py-2 border-t border-slate-100 space-y-1">
            {splitBills.map((bill, idx) => {
              const colors = BILL_COLORS[idx % BILL_COLORS.length];
              const total = getBillTotal(bill);
              return (
                <div key={bill} className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${colors.light}`}>
                  <span className={`text-xs font-bold ${colors.text}`}>Bill {bill}</span>
                  <span className={`text-sm font-black tabular-nums ${colors.text}`}>{fmt(total)}</span>
                </div>
              );
            })}
          </div>

          {/* Confirm */}
          <div className="px-4 pb-4 pt-2">
            <button
              onClick={handleProcess}
              disabled={loading || cartItems.length === 0}
              className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
              data-testid="button-confirm-payment"
            >
              {loading ? "Memproses…" : `Bayar Semua · ${fmt(cartTotal)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogTitle className="sr-only">Pembayaran</DialogTitle>
      <DialogContent
        className="p-0 gap-0 w-full rounded-2xl overflow-hidden"
        hideCloseButton
        style={{
          maxWidth: isLandscape ? 640 : 400,
          maxHeight: isLandscape ? "95vh" : "92vh",
        }}
        data-testid="dialog-payment-method"
      >
        <button
          onClick={close}
          disabled={loading}
          className="absolute right-3 top-3 z-10 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
        >
          <X size={14} className="text-slate-500" />
        </button>

        <div
          className={`flex overflow-hidden ${isLandscape ? "flex-row" : "flex-col overflow-y-auto"}`}
          style={{ maxHeight: isLandscape ? "95vh" : "92vh" }}
        >
          <LeftPanel />
          <ContentArea />
        </div>
      </DialogContent>
    </Dialog>
  );
}
