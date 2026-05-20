/**
 * Customer Facing Display (CFD)
 * Design mengikuti sistem desain aplikasi utama.
 */

import { useState, useEffect, useRef } from 'react';
import { Monitor, ShoppingCart } from 'lucide-react';
import {
  useCustomerDisplayReceiver,
  type CFDMessage,
  type CFDItem,
} from '@/hooks/useCustomerDisplay';

// ─── Formatter ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

// ─── Animated total ───────────────────────────────────────────────────────────
function AnimatedTotal({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number>();
  useEffect(() => {
    const start = display;
    if (start === value) return;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / 380, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (value - start) * e));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span className={className}>{fmt(display)}</span>;
}

// ─── IDLE ─────────────────────────────────────────────────────────────────────
function IdleScreen({ tenantName }: { tenantName: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 relative">
      <div className="flex flex-col items-center gap-6">
        <div className="w-32 h-32 rounded-3xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-200">
          <span className="text-5xl font-black text-white tracking-tight select-none">
            {tenantName.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black text-slate-800 tracking-tight">{tenantName}</h1>
          <p className="text-xl text-slate-400 font-medium">Selamat datang</p>
        </div>
        <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-full px-6 py-3 shadow-sm mt-2">
          <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          <span className="text-base font-semibold text-slate-600">Siap melayani Anda</span>
        </div>
      </div>
      <div className="absolute bottom-6 flex items-center gap-2 text-slate-300">
        <Monitor size={13} />
        <span className="text-xs font-medium">Customer Display · AuraPOS</span>
      </div>
    </div>
  );
}

// ─── ORDERING ─────────────────────────────────────────────────────────────────
function OrderingScreen(props: {
  tenantName: string; orderNumber: string; items: CFDItem[];
  subtotal: number; tax: number; serviceCharge: number; total: number;
}) {
  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="text-sm font-black text-white">{props.tenantName.slice(0, 2).toUpperCase()}</span>
          </div>
          <span className="text-xl font-bold text-slate-800">{props.tenantName}</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-xl">
          <ShoppingCart size={14} className="text-blue-500" />
          <span className="text-sm font-bold text-blue-600">Order {props.orderNumber}</span>
        </div>
      </div>

      {/* ── Body: 2 kolom ── */}
      <div className="flex-1 flex min-h-0">

        {/* Kiri: daftar item */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Pesanan</p>

          {props.items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-300 py-20">
              <ShoppingCart size={40} />
              <p className="text-base font-medium">Menambahkan item…</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
              {props.items.map((item, i) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 px-5 py-4"
                  style={{ animation: 'slideIn .2s ease both', animationDelay: `${i * 35}ms` }}
                >
                  <div className="min-w-[40px] h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-black text-blue-600">{item.quantity}×</span>
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <p className="text-base font-bold text-slate-800 leading-tight">{item.name}</p>
                    {(item.variantName || item.optionsSummary) && (
                      <p className="text-sm text-slate-400 mt-0.5">
                        {[item.variantName, item.optionsSummary].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="text-base font-bold text-slate-700 tabular-nums whitespace-nowrap py-0.5">
                    {fmt(item.itemTotal)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kanan: ringkasan total — sticky, menonjol */}
        <div className="w-72 flex-shrink-0 border-l border-slate-200 bg-white flex flex-col">
          <div className="flex-1 p-6 flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Ringkasan</p>

              <div className="space-y-3">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-semibold tabular-nums">{fmt(props.subtotal)}</span>
                </div>
                {props.serviceCharge > 0 && (
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Service Charge</span>
                    <span className="font-semibold tabular-nums">{fmt(props.serviceCharge)}</span>
                  </div>
                )}
                {props.tax > 0 && (
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Pajak</span>
                    <span className="font-semibold tabular-nums">{fmt(props.tax)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Total besar di bawah */}
            <div className="mt-6 pt-5 border-t-2 border-slate-100">
              <p className="text-sm font-bold text-slate-400 mb-1">Total Pembayaran</p>
              <AnimatedTotal
                value={props.total}
                className="text-4xl font-black text-blue-600 tabular-nums leading-none"
              />
              <p className="text-xs text-slate-400 mt-2">
                {props.items.reduce((s, i) => s + i.quantity, 0)} item
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PAYMENT ──────────────────────────────────────────────────────────────────
const METHOD_LABELS: Record<string, string> = {
  cash: 'Tunai', card: 'Kartu Debit/Kredit',
  qris: 'QRIS', transfer: 'Transfer Bank', ewallet: 'E-Wallet',
};
const METHOD_ICON: Record<string, string> = {
  cash: '💵', card: '💳', qris: '📱', transfer: '🏦', ewallet: '📲',
};

function PaymentScreen(props: {
  tenantName: string; orderNumber: string; total: number; method: string;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 gap-6">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-lg px-14 py-12 flex flex-col items-center gap-5 min-w-[400px] max-w-md w-full">
        <div className="w-20 h-20 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
        <div className="text-center">
          <p className="text-base font-semibold text-slate-500 mb-2">Menunggu Pembayaran</p>
          <p className="text-4xl font-black text-slate-800 tabular-nums">{fmt(props.total)}</p>
        </div>
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-6 py-3 w-full justify-center">
          <span className="text-2xl">{METHOD_ICON[props.method] ?? '💰'}</span>
          <span className="text-base font-bold text-blue-700">
            {METHOD_LABELS[props.method] ?? props.method}
          </span>
        </div>
        <p className="text-xs text-slate-400">Order {props.orderNumber}</p>
      </div>
      <p className="text-sm text-slate-400 font-medium">{props.tenantName}</p>
    </div>
  );
}

// ─── COMPLETED ────────────────────────────────────────────────────────────────
function CompletedScreen(props: {
  tenantName: string; orderNumber: string;
  total: number; amountPaid: number; change: number;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 gap-6">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-lg px-14 py-12 flex flex-col items-center gap-5 min-w-[400px] max-w-md w-full">
        <div
          className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-100"
          style={{ animation: 'popIn .5s cubic-bezier(.175,.885,.32,1.275) both' }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-green-600 mb-1">Pembayaran Berhasil!</p>
          <p className="text-4xl font-black text-slate-800 tabular-nums">{fmt(props.total)}</p>
        </div>
        {props.amountPaid > 0 && (
          <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Dibayar</span>
              <span className="font-semibold tabular-nums">{fmt(props.amountPaid)}</span>
            </div>
            {props.change > 0 && (
              <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                <span className="font-bold text-slate-700">Kembalian</span>
                <span className="font-black text-green-600 tabular-nums">{fmt(props.change)}</span>
              </div>
            )}
          </div>
        )}
        <p className="text-base font-semibold text-slate-500">Terima kasih telah berkunjung! 🙏</p>
      </div>
      <p className="text-sm text-slate-400 font-medium">{props.tenantName} · Order {props.orderNumber}</p>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function CustomerDisplayPage() {
  const [msg, setMsg] = useState<CFDMessage>({ type: 'idle', tenantName: 'AuraPOS' });
  useCustomerDisplayReceiver((m) => { if (m.type !== 'ping') setMsg(m); });
  const name = msg.type !== 'ping' && 'tenantName' in msg ? msg.tenantName : 'AuraPOS';

  return (
    <>
      <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
        @keyframes popIn   { from{opacity:0;transform:scale(.5)} to{opacity:1;transform:scale(1)} }
        body { overflow:hidden; }
      `}</style>
      <div className="w-screen h-screen flex flex-col bg-slate-50 relative">
        {msg.type === 'idle'      && <IdleScreen tenantName={name} />}
        {msg.type === 'ordering'  && <OrderingScreen {...msg} />}
        {msg.type === 'payment'   && <PaymentScreen {...msg} />}
        {msg.type === 'completed' && <CompletedScreen {...msg} />}
      </div>
    </>
  );
}
