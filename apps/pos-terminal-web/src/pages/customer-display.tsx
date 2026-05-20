/**
 * Customer Facing Display (CFD)
 * Design mengikuti sistem desain aplikasi utama:
 * - Font: Inter (sama dengan app)
 * - Warna: white/slate background, blue-600 primary (sama dengan CartPanel, dll)
 * - Border radius, shadow, spacing konsisten
 */

import { useState, useEffect, useRef } from 'react';
import { Monitor } from 'lucide-react';
import {
  useCustomerDisplayReceiver,
  type CFDMessage,
  type CFDItem,
} from '@/hooks/useCustomerDisplay';

// ─── Formatters ───────────────────────────────────────────────────────────────
const formatIDR = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n);

// ─── Animated total number ────────────────────────────────────────────────────
function AnimatedTotal({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number>();

  useEffect(() => {
    const start = display;
    const end = value;
    if (start === end) return;
    const startTime = performance.now();
    const duration = 350;
    const tick = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{formatIDR(display)}</>;
}

// ─── IDLE SCREEN ─────────────────────────────────────────────────────────────
function IdleScreen({ tenantName }: { tenantName: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 gap-8">
      {/* Logo / Inisial */}
      <div className="flex flex-col items-center gap-6">
        <div className="w-28 h-28 rounded-3xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-200">
          <span className="text-4xl font-black text-white tracking-tight">
            {tenantName.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">{tenantName}</h1>
          <p className="mt-2 text-slate-400 font-medium text-lg">Selamat datang</p>
        </div>
        {/* Status pill */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-5 py-2.5 shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-semibold text-slate-600">Siap melayani Anda</span>
        </div>
      </div>

      {/* Dekorasi bawah */}
      <div className="absolute bottom-6 flex items-center gap-2 text-slate-300">
        <Monitor size={14} />
        <span className="text-xs font-medium">Customer Display · AuraPOS</span>
      </div>
    </div>
  );
}

// ─── ITEM ROW ─────────────────────────────────────────────────────────────────
function ItemRow({ item, index }: { item: CFDItem; index: number }) {
  return (
    <div
      className="flex items-start gap-4 py-3.5 border-b border-slate-100 last:border-0"
      style={{
        animation: 'slideIn 0.2s ease both',
        animationDelay: `${index * 35}ms`,
      }}
    >
      {/* Qty badge */}
      <div className="min-w-[36px] h-9 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center">
        <span className="text-sm font-black text-blue-600">{item.quantity}×</span>
      </div>

      {/* Name + options */}
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold text-slate-800 leading-tight">{item.name}</p>
        {(item.variantName || item.optionsSummary) && (
          <p className="text-sm text-slate-400 mt-0.5">
            {[item.variantName, item.optionsSummary].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {/* Price */}
      <div className="text-base font-bold text-slate-700 text-right tabular-nums">
        {formatIDR(item.itemTotal)}
      </div>
    </div>
  );
}

// ─── ORDERING SCREEN ──────────────────────────────────────────────────────────
function OrderingScreen(props: {
  tenantName: string;
  orderNumber: string;
  items: CFDItem[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
}) {
  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      {/* Header — mirip CartPanel header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="text-xs font-black text-white">
              {props.tenantName.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <span className="text-lg font-bold text-slate-800">{props.tenantName}</span>
        </div>
        <div className="px-3 py-1.5 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg border border-blue-100">
          Order {props.orderNumber}
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-8 py-4">
        {props.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Monitor size={28} className="text-slate-300" />
            </div>
            <p className="text-base font-medium">Menambahkan item…</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 px-5">
            {props.items.map((item, i) => (
              <ItemRow key={item.id} item={item} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Totals — persis seperti CartPanel totals */}
      <div className="flex-shrink-0 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="px-8 py-4 space-y-2">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Subtotal</span>
            <span className="font-medium tabular-nums">{formatIDR(props.subtotal)}</span>
          </div>
          {props.serviceCharge > 0 && (
            <div className="flex justify-between text-sm text-slate-500">
              <span>Service Charge</span>
              <span className="font-medium tabular-nums">{formatIDR(props.serviceCharge)}</span>
            </div>
          )}
          {props.tax > 0 && (
            <div className="flex justify-between text-sm text-slate-500">
              <span>Pajak</span>
              <span className="font-medium tabular-nums">{formatIDR(props.tax)}</span>
            </div>
          )}
        </div>
        <div className="px-8 pb-6 pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xl font-black text-slate-800">Total</span>
          <span className="text-3xl font-black text-blue-600 tabular-nums">
            <AnimatedTotal value={props.total} />
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── PAYMENT SCREEN ───────────────────────────────────────────────────────────
const METHOD_LABELS: Record<string, string> = {
  cash: 'Tunai', card: 'Kartu Debit/Kredit',
  qris: 'QRIS', transfer: 'Transfer Bank', ewallet: 'E-Wallet',
};

function PaymentScreen(props: {
  tenantName: string; orderNumber: string; total: number; method: string;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 gap-6">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-lg px-16 py-12 flex flex-col items-center gap-5 min-w-[420px]">
        {/* Spinning indicator */}
        <div className="w-20 h-20 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />

        <div className="text-center">
          <p className="text-base font-semibold text-slate-500 mb-1">Menunggu Pembayaran</p>
          <p className="text-4xl font-black text-slate-800 tabular-nums">{formatIDR(props.total)}</p>
        </div>

        {/* Method badge */}
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-5 py-2.5">
          <span className="text-sm font-bold text-blue-700">
            {METHOD_LABELS[props.method] ?? props.method}
          </span>
        </div>

        <p className="text-xs text-slate-400 font-medium">Order {props.orderNumber}</p>
      </div>

      <p className="text-sm font-medium text-slate-400">{props.tenantName}</p>
    </div>
  );
}

// ─── COMPLETED SCREEN ─────────────────────────────────────────────────────────
function CompletedScreen(props: {
  tenantName: string; orderNumber: string;
  total: number; amountPaid: number; change: number;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 gap-6">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-lg px-16 py-12 flex flex-col items-center gap-5 min-w-[420px]">
        {/* Check icon */}
        <div
          className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-100"
          style={{ animation: 'popIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) both' }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <div className="text-center">
          <p className="text-lg font-bold text-green-600 mb-1">Pembayaran Berhasil!</p>
          <p className="text-4xl font-black text-slate-800 tabular-nums">{formatIDR(props.total)}</p>
        </div>

        {/* Breakdown */}
        {props.amountPaid > 0 && (
          <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Dibayar</span>
              <span className="font-semibold tabular-nums">{formatIDR(props.amountPaid)}</span>
            </div>
            {props.change > 0 && (
              <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                <span className="font-bold text-slate-700">Kembalian</span>
                <span className="font-black text-green-600 tabular-nums">{formatIDR(props.change)}</span>
              </div>
            )}
          </div>
        )}

        <p className="text-base font-semibold text-slate-500">
          Terima kasih telah berkunjung! 🙏
        </p>
      </div>

      <p className="text-sm font-medium text-slate-400">{props.tenantName} · Order {props.orderNumber}</p>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function CustomerDisplayPage() {
  const [msg, setMsg] = useState<CFDMessage>({ type: 'idle', tenantName: 'AuraPOS' });

  useCustomerDisplayReceiver((incoming) => {
    if (incoming.type !== 'ping') setMsg(incoming);
  });

  const tenantName =
    msg.type !== 'ping' && 'tenantName' in msg ? msg.tenantName : 'AuraPOS';

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1); }
        }
        body { overflow: hidden; }
      `}</style>
      <div className="w-screen h-screen flex flex-col bg-slate-50 relative">
        {msg.type === 'idle'      && <IdleScreen tenantName={tenantName} />}
        {msg.type === 'ordering'  && <OrderingScreen {...msg} />}
        {msg.type === 'payment'   && <PaymentScreen {...msg} />}
        {msg.type === 'completed' && <CompletedScreen {...msg} />}
      </div>
    </>
  );
}
