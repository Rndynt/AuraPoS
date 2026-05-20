/**
 * Customer Facing Display (CFD)
 *
 * Halaman full-screen untuk monitor kedua yang menghadap pelanggan.
 * Buka via tombol di POS → terbuka di tab/window baru.
 * Menerima update real-time dari POS via BroadcastChannel.
 */

import { useState, useEffect, useRef } from 'react';
import {
  useCustomerDisplayReceiver,
  type CFDMessage,
  type CFDItem,
} from '@/hooks/useCustomerDisplay';

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n);

// ─── Animated number ─────────────────────────────────────────────────────────
function AnimatedTotal({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number>();

  useEffect(() => {
    const start = display;
    const end = value;
    if (start === end) return;
    const duration = 400;
    const startTime = performance.now();

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

  return <span>{fmt(display)}</span>;
}

// ─── IDLE SCREEN ─────────────────────────────────────────────────────────────
function IdleScreen({ tenantName }: { tenantName: string }) {
  return (
    <div className="cfd-idle">
      <div className="idle-bg" />
      <div className="idle-content">
        <div className="idle-logo">
          {tenantName.slice(0, 2).toUpperCase()}
        </div>
        <h1 className="idle-name">{tenantName}</h1>
        <p className="idle-sub">Selamat datang</p>
        <div className="idle-tagline">
          <span className="dot" /> Siap melayani Anda
        </div>
      </div>
      <div className="idle-footer">
        <span>Powered by AuraPOS</span>
      </div>
    </div>
  );
}

// ─── ORDER ROW ────────────────────────────────────────────────────────────────
function ItemRow({ item, index }: { item: CFDItem; index: number }) {
  return (
    <div
      className="item-row"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="item-qty">{item.quantity}×</div>
      <div className="item-info">
        <span className="item-name">{item.name}</span>
        {(item.variantName || item.optionsSummary) && (
          <span className="item-opts">
            {[item.variantName, item.optionsSummary].filter(Boolean).join(' · ')}
          </span>
        )}
      </div>
      <div className="item-price">{fmt(item.itemTotal)}</div>
    </div>
  );
}

// ─── ORDERING SCREEN ─────────────────────────────────────────────────────────
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
    <div className="cfd-ordering">
      {/* Header */}
      <div className="ord-header">
        <div className="ord-tenant">{props.tenantName}</div>
        <div className="ord-num">Order {props.orderNumber}</div>
      </div>

      {/* Items */}
      <div className="ord-items">
        {props.items.length === 0 ? (
          <div className="ord-empty">Menambahkan item…</div>
        ) : (
          props.items.map((item, i) => (
            <ItemRow key={item.id} item={item} index={i} />
          ))
        )}
      </div>

      {/* Totals */}
      <div className="ord-totals">
        <div className="tot-row">
          <span>Subtotal</span>
          <span>{fmt(props.subtotal)}</span>
        </div>
        {props.serviceCharge > 0 && (
          <div className="tot-row">
            <span>Service Charge</span>
            <span>{fmt(props.serviceCharge)}</span>
          </div>
        )}
        {props.tax > 0 && (
          <div className="tot-row">
            <span>Pajak</span>
            <span>{fmt(props.tax)}</span>
          </div>
        )}
        <div className="tot-row tot-grand">
          <span>Total</span>
          <span className="grand-val">
            <AnimatedTotal value={props.total} />
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── PAYMENT SCREEN ───────────────────────────────────────────────────────────
const METHOD_LABELS: Record<string, string> = {
  cash: 'Tunai',
  card: 'Kartu Debit/Kredit',
  qris: 'QRIS',
  transfer: 'Transfer Bank',
  ewallet: 'E-Wallet',
};

function PaymentScreen(props: {
  tenantName: string;
  orderNumber: string;
  total: number;
  method: string;
}) {
  return (
    <div className="cfd-payment">
      <div className="pay-ring">
        <div className="pay-icon">💳</div>
      </div>
      <h2 className="pay-title">Menunggu Pembayaran</h2>
      <div className="pay-total">{fmt(props.total)}</div>
      <div className="pay-method">
        via {METHOD_LABELS[props.method] ?? props.method}
      </div>
      <div className="pay-order">Order {props.orderNumber}</div>
    </div>
  );
}

// ─── COMPLETED SCREEN ─────────────────────────────────────────────────────────
function CompletedScreen(props: {
  tenantName: string;
  orderNumber: string;
  total: number;
  amountPaid: number;
  change: number;
}) {
  return (
    <div className="cfd-completed">
      <div className="done-check">✓</div>
      <h2 className="done-title">Pembayaran Berhasil!</h2>
      <div className="done-total">{fmt(props.total)}</div>

      {props.amountPaid > 0 && (
        <div className="done-rows">
          <div className="done-row">
            <span>Bayar</span>
            <span>{fmt(props.amountPaid)}</span>
          </div>
          {props.change > 0 && (
            <div className="done-row done-change">
              <span>Kembalian</span>
              <span>{fmt(props.change)}</span>
            </div>
          )}
        </div>
      )}

      <p className="done-thanks">Terima kasih telah berkunjung! 🙏</p>
      <p className="done-sub">{props.tenantName}</p>
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
      <style>{CFD_STYLES}</style>
      <div className="cfd-root">
        {msg.type === 'idle' && <IdleScreen tenantName={tenantName} />}
        {msg.type === 'ordering' && <OrderingScreen {...msg} />}
        {msg.type === 'payment' && <PaymentScreen {...msg} />}
        {msg.type === 'completed' && <CompletedScreen {...msg} />}
      </div>
    </>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const CFD_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Serif+Display&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .cfd-root {
    font-family: 'Plus Jakarta Sans', sans-serif;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: #0d1117;
    color: #f0f0f0;
    display: flex;
    align-items: stretch;
  }

  /* ── IDLE ── */
  .cfd-idle {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    background: linear-gradient(145deg, #0d1117 0%, #111827 60%, #1a1f2e 100%);
  }
  .idle-bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 60% 50% at 30% 40%, rgba(251,191,36,0.08) 0%, transparent 70%),
      radial-gradient(ellipse 40% 60% at 75% 70%, rgba(251,191,36,0.05) 0%, transparent 70%);
    pointer-events: none;
  }
  .idle-content {
    position: relative;
    text-align: center;
    animation: fadeUp 0.8s ease both;
  }
  .idle-logo {
    width: 96px; height: 96px;
    margin: 0 auto 24px;
    border-radius: 24px;
    background: linear-gradient(135deg, #f59e0b, #fbbf24);
    color: #0d1117;
    font-size: 36px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 48px rgba(251,191,36,0.25), 0 8px 32px rgba(0,0,0,0.4);
    letter-spacing: -1px;
  }
  .idle-name {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(2.5rem, 5vw, 4rem);
    color: #fef3c7;
    letter-spacing: -0.5px;
    line-height: 1.1;
    margin-bottom: 8px;
  }
  .idle-sub {
    font-size: 1.1rem;
    color: #6b7280;
    font-weight: 400;
    margin-bottom: 24px;
  }
  .idle-tagline {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(251,191,36,0.1);
    border: 1px solid rgba(251,191,36,0.2);
    border-radius: 999px;
    padding: 8px 20px;
    font-size: 0.9rem;
    color: #fbbf24;
    font-weight: 500;
  }
  .dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 0 3px rgba(34,197,94,0.2);
    animation: pulse 2s ease-in-out infinite;
  }
  .idle-footer {
    position: absolute;
    bottom: 24px;
    left: 0; right: 0;
    text-align: center;
    font-size: 0.75rem;
    color: #374151;
    letter-spacing: 0.05em;
  }

  /* ── ORDERING ── */
  .cfd-ordering {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #0d1117;
  }
  .ord-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 32px;
    background: #111827;
    border-bottom: 1px solid #1f2937;
  }
  .ord-tenant {
    font-family: 'DM Serif Display', serif;
    font-size: 1.4rem;
    color: #fbbf24;
  }
  .ord-num {
    font-size: 0.85rem;
    color: #6b7280;
    font-weight: 500;
    background: #1f2937;
    padding: 4px 12px;
    border-radius: 999px;
  }
  .ord-items {
    flex: 1;
    overflow-y: auto;
    padding: 16px 32px;
    scrollbar-width: thin;
    scrollbar-color: #1f2937 transparent;
  }
  .ord-empty {
    text-align: center;
    color: #374151;
    padding: 48px 0;
    font-size: 1rem;
  }
  .item-row {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 14px 0;
    border-bottom: 1px solid #1a2030;
    animation: slideIn 0.25s ease both;
  }
  .item-qty {
    min-width: 36px;
    font-size: 1.1rem;
    font-weight: 700;
    color: #fbbf24;
    padding-top: 1px;
  }
  .item-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .item-name {
    font-size: 1.05rem;
    font-weight: 600;
    color: #f9fafb;
  }
  .item-opts {
    font-size: 0.8rem;
    color: #6b7280;
    font-weight: 400;
  }
  .item-price {
    font-size: 1rem;
    font-weight: 600;
    color: #d1fae5;
    text-align: right;
    min-width: 120px;
  }
  .ord-totals {
    padding: 20px 32px;
    background: #111827;
    border-top: 1px solid #1f2937;
  }
  .tot-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    color: #9ca3af;
    padding: 4px 0;
  }
  .tot-grand {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #1f2937;
    font-size: 1.8rem;
    font-weight: 800;
    color: #f9fafb;
  }
  .grand-val { color: #fbbf24; }

  /* ── PAYMENT ── */
  .cfd-payment {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 16px;
    background: linear-gradient(145deg, #0d1117, #111827);
    animation: fadeUp 0.4s ease both;
  }
  .pay-ring {
    width: 120px; height: 120px;
    border-radius: 50%;
    border: 3px solid rgba(251,191,36,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: spin 3s linear infinite;
    box-shadow: 0 0 40px rgba(251,191,36,0.1);
    margin-bottom: 8px;
  }
  .pay-icon { font-size: 48px; animation: spin 3s linear infinite reverse; }
  .pay-title {
    font-size: 1.4rem;
    color: #9ca3af;
    font-weight: 500;
  }
  .pay-total {
    font-size: clamp(2.5rem, 6vw, 4.5rem);
    font-weight: 800;
    color: #fbbf24;
    letter-spacing: -1px;
  }
  .pay-method {
    font-size: 1rem;
    color: #6b7280;
  }
  .pay-order {
    font-size: 0.8rem;
    color: #374151;
    background: #1f2937;
    padding: 4px 12px;
    border-radius: 999px;
  }

  /* ── COMPLETED ── */
  .cfd-completed {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 16px;
    background: linear-gradient(145deg, #052e16, #0d1117 50%, #052e16);
    animation: fadeUp 0.4s ease both;
  }
  .done-check {
    width: 96px; height: 96px;
    border-radius: 50%;
    background: linear-gradient(135deg, #16a34a, #22c55e);
    color: white;
    font-size: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 60px rgba(34,197,94,0.3);
    animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
    margin-bottom: 8px;
  }
  .done-title {
    font-size: 1.8rem;
    font-weight: 800;
    color: #f0fdf4;
  }
  .done-total {
    font-size: clamp(2.5rem, 6vw, 4.5rem);
    font-weight: 800;
    color: #4ade80;
    letter-spacing: -1px;
  }
  .done-rows {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 16px 32px;
    min-width: 280px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .done-row {
    display: flex;
    justify-content: space-between;
    gap: 48px;
    font-size: 1rem;
    color: #9ca3af;
  }
  .done-change {
    color: #4ade80;
    font-weight: 700;
    font-size: 1.1rem;
    padding-top: 8px;
    border-top: 1px solid rgba(255,255,255,0.08);
  }
  .done-thanks {
    font-size: 1.15rem;
    color: #d1fae5;
    font-weight: 500;
    margin-top: 8px;
  }
  .done-sub {
    font-family: 'DM Serif Display', serif;
    font-size: 1rem;
    color: #374151;
  }

  /* ── ANIMATIONS ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-12px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes popIn {
    from { opacity: 0; transform: scale(0.5); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.6; transform: scale(0.85); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
`;
