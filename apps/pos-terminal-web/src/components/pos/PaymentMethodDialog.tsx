// @ts-nocheck
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Banknote, CreditCard, QrCode, Delete, SplitSquareVertical, Wallet, Layers } from "lucide-react";
import type { PaymentMethod } from "@/hooks/useCart";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (method: PaymentMethod, cashReceived?: number, partialAmount?: number) => void;
  onMethodChange?: (method: PaymentMethod) => void;
  cartTotal: number;
  isSubmitting?: boolean;
  defaultPaymentMethod?: PaymentMethod;
  allowPartial?: boolean;
  allowMultiPayment?: boolean;
  allowSplitBill?: boolean;
  initialPartialMode?: boolean;
};

const fmt = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(n);
const NUMPAD = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "000", "0", "⌫"] as const;
type PaymentFlow = "full" | "dp" | "multi" | "split";

const headerClass = "px-5 pt-5 pb-3 border-b border-slate-100";
const titleClass = "text-[10px] font-black uppercase tracking-widest mb-1.5 h-4 flex items-center";
const amountBoxClass = "flex items-center gap-2 rounded-2xl border-2 px-4 h-[72px]";
const valueClass = "flex-1 text-3xl font-black text-slate-800 tabular-nums min-h-[40px] leading-tight";
const bodyClass = "flex flex-1 min-h-0";
const keypadClass = "flex-1 grid grid-cols-3 gap-2 p-4";
const sideClass = "w-44 flex-shrink-0 flex flex-col gap-2 p-4 pl-0";

export function PaymentMethodDialog({
  open,
  onClose,
  onConfirm,
  onMethodChange,
  cartTotal,
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

  useEffect(() => {
    if (!open) return;
    setMethod(defaultPaymentMethod);
    setCashRaw("");
    setPartialRaw("");
    setFlow(initialPartialMode ? "dp" : "full");
    setIsProcessing(false);
  }, [open, defaultPaymentMethod, initialPartialMode]);

  const cashAmount = parseInt(cashRaw) || 0;
  const change = cashAmount - cartTotal;
  const isEnough = change >= 0;
  const partialAmount = parseInt(partialRaw) || 0;
  const remaining = cartTotal - partialAmount;
  const isValidPartial = partialAmount > 0 && partialAmount < cartTotal;
  const loading = isProcessing || isSubmitting;

  const selectMethod = (nextMethod: PaymentMethod) => {
    setMethod(nextMethod);
    onMethodChange?.(nextMethod);
  };

  const setRaw = (target: "cash" | "partial", next: string) => {
    target === "cash" ? setCashRaw(next) : setPartialRaw(next);
  };

  const handleKey = (key: string, target: "cash" | "partial") => {
    const current = target === "cash" ? cashRaw : partialRaw;
    if (key === "⌫") {
      setRaw(target, current.slice(0, -1));
      return;
    }
    const next = key === "000" ? (current === "" ? "" : current + "000") : current + key;
    if (parseInt(next || "0") <= 99_999_999) setRaw(target, next);
  };

  const handleProcess = () => {
    if (loading) return;

    if (flow === "dp") {
      if (!isValidPartial) return;
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        onConfirm(method, undefined, partialAmount);
      }, 400);
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

  const renderNumpad = (target: "cash" | "partial", tone: "blue" | "amber") => (
    <div className={keypadClass}>
      {NUMPAD.map((key) => (
        <button
          key={key}
          onClick={() => handleKey(key, target)}
          className={`rounded-xl font-bold text-lg flex items-center justify-center transition-all active:scale-95 select-none ${
            key === "⌫"
              ? "bg-red-50 border border-red-100 text-red-500 hover:bg-red-100"
              : tone === "amber"
                ? "bg-white border border-slate-200 text-slate-700 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 shadow-sm"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 shadow-sm"
          }`}
        >
          {key === "⌫" ? <Delete size={18} /> : key}
        </button>
      ))}
    </div>
  );

  const close = () => {
    if (loading) return;
    setCashRaw("");
    setPartialRaw("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogTitle className="sr-only">Pembayaran</DialogTitle>
      <DialogContent className="p-0 gap-0 max-w-2xl w-full rounded-2xl overflow-hidden flex flex-row" style={{ height: 520 }} data-testid="dialog-payment-method">
        <div className="w-44 flex-shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col p-3 gap-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Alur Bayar</p>
          {([
            ["full", "Bayar Penuh", CreditCard],
            ...(allowPartial ? [["dp", "DP / Bayar Sebagian", SplitSquareVertical]] : []),
            ...(allowMultiPayment ? [["multi", "Multi Payment", Wallet]] : []),
            ...(allowSplitBill ? [["split", "Split Bill", Layers]] : []),
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => { setFlow(id as PaymentFlow); setCashRaw(""); setPartialRaw(""); }}
              className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-xl transition-all text-left border-2 ${flow === id ? "bg-white border-blue-600 text-blue-600 shadow-sm" : "hover:bg-white border-transparent text-slate-500 hover:text-slate-700"}`}
              data-testid={`button-payment-flow-${id}`}
            >
              <Icon size={16} />
              <span className="font-bold text-xs leading-tight">{label}</span>
            </button>
          ))}

          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mt-4 mb-2">Metode</p>
          {([ ["cash", "Tunai", Banknote], ["ewallet", "QRIS", QrCode], ["card", "Kartu", CreditCard] ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => selectMethod(id)}
              className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl transition-all text-left ${method === id ? "bg-white border-2 border-blue-600 text-blue-600 shadow-sm" : "hover:bg-white border-2 border-transparent text-slate-500 hover:text-slate-700"}`}
              data-testid={`sidebar-payment-${id}`}
            >
              <Icon size={18} />
              <span className="font-bold text-sm">{label}</span>
            </button>
          ))}

          <div className="mt-auto pt-4 border-t border-slate-200">
            <p className="text-[10px] text-slate-400 font-semibold px-1 mb-1">Total Tagihan</p>
            <p className="text-xl font-black text-slate-800 px-1 tabular-nums leading-tight" data-testid="text-payment-total">{fmt(cartTotal)}</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {flow === "dp" && (
            <div className="flex-1 flex flex-col">
              <div className={headerClass}>
                <p className={`${titleClass} text-amber-500`}>Jumlah DP / Uang Muka</p>
                <div className={`${amountBoxClass} bg-amber-50 border-amber-400`}>
                  <span className="text-base font-bold text-amber-400">Rp</span>
                  <span className={valueClass} data-testid="input-partial-amount">
                    {partialRaw === "" ? <span className="text-slate-300 font-black">0</span> : fmtNum(partialAmount)}
                  </span>
                </div>
              </div>

              <div className={bodyClass}>
                {renderNumpad("partial", "amber")}
                <div className={sideClass}>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[{ l: "25%", v: Math.round(cartTotal * 0.25) }, { l: "50%", v: Math.round(cartTotal * 0.5) }, { l: "75%", v: Math.round(cartTotal * 0.75) }, { l: "Reset", v: 0 }].map((preset) => (
                      <button
                        key={preset.l}
                        onClick={() => setPartialRaw(preset.v > 0 ? String(preset.v) : "")}
                        className={`py-2 text-xs font-bold border border-transparent rounded-lg transition-colors ${partialAmount === preset.v && preset.v > 0 ? "bg-amber-400 text-white border-amber-400" : preset.l === "Reset" ? "bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-400" : "bg-slate-100 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 text-slate-500"}`}
                      >
                        {preset.l}
                      </button>
                    ))}
                  </div>

                  <div className={`flex-1 rounded-xl flex flex-col items-center justify-center text-center px-2 ${isValidPartial ? "bg-amber-50 border border-amber-200" : "bg-slate-50 border border-slate-200"}`}>
                    <p className={`text-xs font-bold mb-0.5 ${isValidPartial ? "text-amber-600" : "text-slate-400"}`}>Sisa Tagihan</p>
                    <p className={`text-lg font-black tabular-nums leading-tight ${isValidPartial ? "text-amber-700" : "text-slate-400"}`} data-testid="text-remaining-balance">
                      {fmt(isValidPartial ? remaining : cartTotal)}
                    </p>
                  </div>

                  <button
                    onClick={handleProcess}
                    disabled={loading || !isValidPartial}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-200 transition-all active:scale-[0.98]"
                    data-testid="button-confirm-partial"
                  >
                    {loading ? "Memproses…" : partialAmount > 0 ? `DP ${fmt(partialAmount)}` : "Masukkan Jumlah"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {flow === "multi" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
              <div className="bg-teal-50 p-8 rounded-full"><Wallet size={56} className="text-teal-600" /></div>
              <div>
                <p className="font-bold text-slate-800 text-lg">Multi Payment</p>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">Multi Payment memakai satu sesi pembayaran dengan beberapa metode dan harus lunas.</p>
              </div>
              <div className="rounded-xl bg-teal-50 border border-teal-100 px-4 py-3 text-xs text-teal-700">Total metode harus sama dengan {fmt(cartTotal)}.</div>
            </div>
          )}

          {flow === "split" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
              <div className="bg-indigo-50 p-8 rounded-full"><Layers size={56} className="text-indigo-600" /></div>
              <div>
                <p className="font-bold text-slate-800 text-lg">Split Bill</p>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">Split Bill diproses dari order yang sudah confirmed dengan pemilihan item/quantity.</p>
              </div>
              <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 text-xs text-indigo-700">Pilih item/quantity, buat Bill A/B/C, lalu bayar tiap bill.</div>
            </div>
          )}

          {flow === "full" && method === "cash" && (
            <div className="flex-1 flex flex-col">
              <div className={headerClass}>
                <p className={`${titleClass} text-slate-400`}>Uang Diterima</p>
                <div className={`${amountBoxClass} bg-slate-50 border-blue-500`}>
                  <span className="text-base font-bold text-slate-400">Rp</span>
                  <span className={valueClass} data-testid="input-cash-received">
                    {cashRaw === "" ? <span className="text-slate-300 font-black">0</span> : fmtNum(cashAmount)}
                  </span>
                </div>
              </div>

              <div className={bodyClass}>
                {renderNumpad("cash", "blue")}
                <div className={sideClass}>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[{ l: "Pas", v: cartTotal }, { l: "50K", v: 50000 }, { l: "100K", v: 100000 }, { l: "200K", v: 200000 }].map((preset) => (
                      <button key={preset.l} onClick={() => setCashRaw(String(preset.v))} className="py-2 text-xs font-bold bg-slate-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 border border-transparent text-slate-500 rounded-lg transition-colors">
                        {preset.l}
                      </button>
                    ))}
                  </div>

                  <div className={`flex-1 rounded-xl flex flex-col items-center justify-center text-center px-2 ${isEnough ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                    <p className={`text-xs font-bold mb-0.5 ${isEnough ? "text-green-600" : "text-red-500"}`}>{isEnough ? "Kembalian" : "Kurang"}</p>
                    <p className={`text-lg font-black tabular-nums leading-tight ${isEnough ? "text-green-700" : "text-red-600"}`} data-testid="text-change-amount">{fmt(Math.abs(change))}</p>
                  </div>

                  <button onClick={handleProcess} disabled={loading || !isEnough} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 transition-all active:scale-[0.98]" data-testid="button-confirm-payment">
                    {loading ? "Memproses…" : "Bayar"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {flow === "full" && method === "ewallet" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-800 shadow-sm"><QrCode size={140} className="text-slate-800" /></div>
              <div className="text-center"><p className="font-bold text-slate-800 text-lg">Scan QRIS</p><p className="text-sm text-slate-400 mt-1">Menunggu pembayaran…</p></div>
              <button onClick={handleProcess} disabled={loading} className="mt-2 px-10 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-[0.98]" data-testid="button-confirm-payment">
                {loading ? "Memproses…" : "Konfirmasi Pembayaran"}
              </button>
            </div>
          )}

          {flow === "full" && method === "card" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
              <div className="bg-blue-50 p-8 rounded-full"><CreditCard size={56} className="text-blue-600" /></div>
              <div className="text-center"><p className="font-bold text-slate-800 text-lg">Kartu Debit / Kredit</p><p className="text-sm text-slate-400 mt-1 max-w-[200px]">Silakan gesek / tap kartu pada mesin EDC.</p></div>
              <button onClick={handleProcess} disabled={loading} className="mt-2 px-10 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-[0.98]" data-testid="button-confirm-payment">
                {loading ? "Memproses…" : "Konfirmasi Pembayaran"}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
