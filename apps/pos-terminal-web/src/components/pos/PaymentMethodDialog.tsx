// @ts-nocheck
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Banknote, CreditCard, QrCode, Delete } from "lucide-react";
import type { PaymentMethod } from "@/hooks/useCart";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (method: PaymentMethod, cashReceived?: number) => void;
  onMethodChange?: (method: PaymentMethod) => void;
  cartTotal: number;
  isSubmitting?: boolean;
  defaultPaymentMethod?: PaymentMethod;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

// ─── Custom Numpad ─────────────────────────────────────────────────────────────
const KEYS = ["7","8","9","4","5","6","1","2","3","000","0","⌫"];

function Numpad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 p-4 bg-slate-50 border-l border-slate-200 select-none">
      {KEYS.map(k => (
        <button
          key={k}
          onClick={() => onKey(k)}
          className={`h-12 rounded-xl font-bold text-lg flex items-center justify-center transition-all active:scale-95 ${
            k === "⌫"
              ? "bg-red-50 border border-red-100 text-red-500 hover:bg-red-100"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 shadow-sm"
          }`}
        >
          {k === "⌫" ? <Delete size={18} /> : k}
        </button>
      ))}
    </div>
  );
}

export function PaymentMethodDialog({
  open, onClose, onConfirm, onMethodChange,
  cartTotal, isSubmitting = false, defaultPaymentMethod = "cash",
}: Props) {
  const [method, setMethod] = useState<PaymentMethod>(defaultPaymentMethod);
  const [cashRaw, setCashRaw] = useState(""); // raw digit string e.g. "65550"
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (open) {
      setMethod(defaultPaymentMethod);
      setCashRaw("");
      setIsProcessing(false);
    }
  }, [open, defaultPaymentMethod]);

  const selectMethod = (m: PaymentMethod) => {
    setMethod(m);
    onMethodChange?.(m);
  };

  // Numpad handler — no device keyboard involved
  const handleKey = (k: string) => {
    if (k === "⌫") {
      setCashRaw(prev => prev.slice(0, -1));
    } else if (k === "000") {
      setCashRaw(prev => (prev === "" ? "" : prev + "000"));
    } else {
      setCashRaw(prev => {
        const next = prev + k;
        // Limit to reasonable amount
        if (parseInt(next) > 100_000_000) return prev;
        return next;
      });
    }
  };

  const handleQuick = (amount: number) => setCashRaw(String(amount));

  const cashAmount = parseInt(cashRaw) || 0;
  const change = cashAmount - cartTotal;
  const isEnough = change >= 0;

  const handleProcess = () => {
    if (isSubmitting || isProcessing) return;
    if (method === "cash" && !isEnough) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onConfirm(method, method === "cash" ? cashAmount || cartTotal : undefined);
    }, 400);
  };

  const handleCancel = () => {
    if (!isSubmitting && !isProcessing) { setCashRaw(""); onClose(); }
  };

  const MethodBtn = ({ id, label, Icon }: { id: PaymentMethod; label: string; Icon: any }) => (
    <button
      onClick={() => selectMethod(id)}
      className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl transition-all ${
        method === id
          ? "bg-white border-2 border-blue-600 text-blue-600 shadow-sm"
          : "hover:bg-white border border-transparent text-slate-500 hover:text-slate-700"
      }`}
      data-testid={`sidebar-payment-${id}`}
    >
      <Icon size={16} />
      <span className="font-bold text-sm">{label}</span>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={next => { if (!isSubmitting && !isProcessing && !next) handleCancel(); }}>
      <DialogTitle className="sr-only">Payment</DialogTitle>
      <DialogContent
        className="p-0 gap-0 w-full max-w-3xl rounded-2xl overflow-hidden flex flex-row"
        style={{ height: "480px" }}
        data-testid="dialog-payment-method"
      >
        {/* ── Kolom 1: Metode ── */}
        <div className="w-36 flex-shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col p-3 gap-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-1">Metode</p>
          <MethodBtn id="cash"    label="Tunai"  Icon={Banknote}    />
          <MethodBtn id="ewallet" label="QRIS"   Icon={QrCode}      />
          <MethodBtn id="card"    label="Kartu"  Icon={CreditCard}  />
        </div>

        {/* ── Kolom 2: Detail pembayaran ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Total tagihan */}
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex-shrink-0">
            <p className="text-xs text-slate-400 font-medium">Total Tagihan</p>
            <p className="text-3xl font-black text-slate-800 tabular-nums" data-testid="text-payment-total">
              {fmt(cartTotal)}
            </p>
          </div>

          <div className="flex-1 px-5 py-3 flex flex-col gap-3 overflow-auto">
            {method === "cash" && (
              <>
                {/* Input — readOnly, diisi numpad */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Uang Diterima</p>
                  <div className="bg-slate-50 border-2 border-blue-500 rounded-xl px-4 py-2.5 flex items-center gap-2">
                    <span className="text-slate-400 font-bold text-sm">Rp</span>
                    <span
                      className="flex-1 text-2xl font-black text-slate-800 tabular-nums min-h-[32px]"
                      data-testid="input-cash-received"
                    >
                      {cashRaw === "" ? <span className="text-slate-300">0</span> : new Intl.NumberFormat("id-ID").format(cashAmount)}
                    </span>
                  </div>
                </div>

                {/* Quick amounts */}
                <div className="grid grid-cols-2 gap-1.5">
                  {[{ label: "Uang Pas", val: cartTotal }, { label: "50.000", val: 50000 }, { label: "100.000", val: 100000 }, { label: "200.000", val: 200000 }].map(q => (
                    <button
                      key={q.label}
                      onClick={() => handleQuick(q.val)}
                      className="py-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 border border-transparent text-slate-600 rounded-lg text-xs font-bold transition-colors"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>

                {/* Kembalian / Kurang */}
                <div className={`px-4 py-3 rounded-xl flex justify-between items-center ${isEnough ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                  <span className={`text-sm font-bold ${isEnough ? "text-green-700" : "text-red-700"}`}>
                    {isEnough ? "Kembalian" : "Kurang"}
                  </span>
                  <span className={`text-xl font-black tabular-nums ${isEnough ? "text-green-700" : "text-red-700"}`} data-testid="text-change-amount">
                    {fmt(Math.abs(change))}
                  </span>
                </div>
              </>
            )}

            {method === "ewallet" && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                <div className="bg-white p-4 rounded-xl border-2 border-slate-800 shadow-sm">
                  <QrCode size={100} className="text-slate-800" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Scan QRIS</p>
                  <p className="text-xs text-slate-400">Menunggu pembayaran…</p>
                </div>
              </div>
            )}

            {method === "card" && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                <div className="bg-blue-50 p-6 rounded-full">
                  <CreditCard size={48} className="text-blue-600" />
                </div>
                <p className="text-sm text-slate-500 max-w-[180px]">Silakan gesek kartu pada mesin EDC terpisah.</p>
              </div>
            )}
          </div>

          {/* Confirm button */}
          <div className="px-5 pb-4 pt-2 flex-shrink-0">
            <button
              onClick={handleProcess}
              disabled={isProcessing || isSubmitting || (method === "cash" && !isEnough)}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-base shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
              data-testid="button-confirm-payment"
            >
              {isProcessing || isSubmitting ? "Memproses…" : method === "cash" ? "Bayar & Cetak Struk" : "Konfirmasi Pembayaran"}
            </button>
          </div>
        </div>

        {/* ── Kolom 3: Numpad (hanya untuk tunai) ── */}
        {method === "cash" && <Numpad onKey={handleKey} />}
      </DialogContent>
    </Dialog>
  );
}
