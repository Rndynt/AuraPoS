import { useMemo } from "react";
import { useLocation } from "wouter";
import { useEntitlements } from "@/hooks/api/useEntitlements";
import { useTenant } from "@/context/TenantContext";
import { PageHeader } from "@/components/design";
import {
  ENTITLEMENT_CATALOG,
  getPlanIncludedEntitlements,
  type EntitlementCode,
  type PlanCode,
} from "@pos/application/entitlements";
import { getEntitlementIcon } from "@/lib/entitlementIcons";
import {
  Crown, ShoppingBag, Package, CheckCircle2,
  CalendarClock, Gift, Sparkles,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type GrantSource = "purchase" | "manual_grant" | "trial";

type ActiveFeature = {
  code: EntitlementCode;
  label: string;
  category: string;
  description: string;
  source: "plan" | GrantSource;
  expiresAt?: string | null;
};

// ─── Constants ─────────────────────────────────────────────────────────────────

const SOURCE_META: Record<"plan" | GrantSource, { label: string; className: string }> = {
  plan:         { label: "Termasuk Paket",  className: "bg-blue-50 text-blue-700 border-blue-200" },
  purchase:     { label: "Add-on Berbayar", className: "bg-violet-50 text-violet-700 border-violet-200" },
  manual_grant: { label: "Dari Admin",      className: "bg-amber-50 text-amber-700 border-amber-200" },
  trial:        { label: "Masa Coba",       className: "bg-orange-50 text-orange-700 border-orange-200" },
};

const SOURCE_SORT_ORDER: Record<"plan" | GrantSource, number> = {
  plan: 0, purchase: 1, manual_grant: 2, trial: 3,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  }).format(new Date(dateStr));
}

// ─── Sub-components (module-level, not inside render) ──────────────────────────

function FeatureCard({ feature }: { feature: ActiveFeature }) {
  const { icon: Icon, iconBg, iconColor } = getEntitlementIcon(feature.code);
  const sourceMeta = SOURCE_META[feature.source];
  const expiryStr = formatDate(feature.expiresAt);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center ${iconBg}`}>
        <Icon size={18} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{feature.category}</span>
            <h3 className="font-black text-slate-800 text-sm leading-tight">{feature.label}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{feature.description}</p>
          </div>
          <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${sourceMeta.className}`}>
            {sourceMeta.label}
          </span>
        </div>
        {expiryStr && (
          <div className="flex items-center gap-1 mt-1.5">
            <CalendarClock size={10} className="text-amber-500" />
            <span className="text-[10px] text-amber-600 font-semibold">Aktif hingga {expiryStr}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureSection({
  title, icon, features, emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  features: ActiveFeature[];
  emptyText?: string;
}) {
  if (features.length === 0 && !emptyText) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-0.5">
        {icon}
        <span className="text-xs font-black text-slate-600 uppercase tracking-wide">{title}</span>
        <span className="text-xs font-semibold text-slate-400 ml-auto">{features.length} fitur</span>
      </div>
      {features.length === 0 ? (
        <p className="text-[11px] text-slate-400 px-1">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {features.map((f) => <FeatureCard key={f.code} feature={f} />)}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse flex gap-3">
      <div className="w-10 h-10 bg-slate-100 rounded-2xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-2.5 bg-slate-100 rounded w-1/4" />
        <div className="h-4 bg-slate-100 rounded w-2/3" />
        <div className="h-3 bg-slate-100 rounded w-full" />
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function MyFeaturesPage() {
  const [, setLocation] = useLocation();
  const { planTier } = useTenant();
  const { entitlements, grants, isLoading } = useEntitlements();

  const currentPlan: PlanCode =
    (planTier as PlanCode) && ENTITLEMENT_CATALOG.plans[planTier as PlanCode]
      ? (planTier as PlanCode)
      : "starter";

  const planLabel = ENTITLEMENT_CATALOG.plans[currentPlan]?.label ?? "Starter";

  const { planFeatures, addonFeatures, trialFeatures } = useMemo(() => {
    const allCodes = Object.keys(ENTITLEMENT_CATALOG.entitlements) as EntitlementCode[];
    const planCodes = new Set(getPlanIncludedEntitlements(currentPlan));

    const grantByCode = new Map<EntitlementCode, { source: GrantSource; expiresAt?: string | null }>();
    for (const grant of grants) {
      if (grant.status === "active") {
        grantByCode.set(grant.entitlement_code as EntitlementCode, {
          source: grant.source as GrantSource,
          expiresAt: grant.expires_at,
        });
      }
    }

    const active: ActiveFeature[] = [];
    for (const code of allCodes) {
      if (!entitlements[code]) continue;
      const meta = ENTITLEMENT_CATALOG.entitlements[code] as {
        label: string; category?: string; area?: string; description?: string;
      };
      const grant = grantByCode.get(code);
      // Plan inclusion takes priority over a redundant grant for the same code
      const source: "plan" | GrantSource = planCodes.has(code) ? "plan" : (grant?.source ?? "plan");

      active.push({
        code,
        label: meta.label,
        category: meta.category ?? meta.area ?? "Lainnya",
        description: meta.description ?? "",
        source,
        expiresAt: grant?.expiresAt,
      });
    }

    active.sort((a, b) => SOURCE_SORT_ORDER[a.source] - SOURCE_SORT_ORDER[b.source]);

    return {
      planFeatures:  active.filter((f) => f.source === "plan"),
      addonFeatures: active.filter((f) => f.source === "purchase" || f.source === "manual_grant"),
      trialFeatures: active.filter((f) => f.source === "trial"),
    };
  }, [entitlements, grants, currentPlan]);

  const totalActive = planFeatures.length + addonFeatures.length + trialFeatures.length;

  return (
    <div className="flex-1 h-full bg-slate-50 overflow-y-auto pb-8">
      <PageHeader
        title="Fitur Saya"
        subtitle="Semua fitur yang sedang aktif di akun kamu"
        onBack={() => setLocation("/hub")}
      />

      <div className="px-4 pt-4 space-y-5">

        {/* ── Plan banner ── */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles size={11} className="text-yellow-400" />
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-wide">Paket Aktif</span>
            </div>
            <h2 className="text-lg font-black">{planLabel}</h2>
            {!isLoading && (
              <p className="text-white/50 text-[11px] mt-0.5">{totalActive} fitur aktif</p>
            )}
          </div>
          <CheckCircle2 size={32} className="text-white/20" />
        </div>

        {/* ── Content ── */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : totalActive === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Package size={24} className="text-slate-400" />
            </div>
            <h3 className="font-black text-slate-700 text-base mb-1">Belum ada fitur aktif</h3>
            <p className="text-[12px] text-slate-400 mb-5 max-w-xs leading-relaxed">
              Aktifkan fitur dari marketplace untuk melengkapi operasional bisnis kamu.
            </p>
            <button
              onClick={() => setLocation("/marketplace")}
              className="flex items-center gap-2 bg-violet-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-violet-700 transition-colors"
            >
              <ShoppingBag size={14} /> Lihat Marketplace
            </button>
          </div>
        ) : (
          <>
            <FeatureSection
              title="Termasuk Paket"
              icon={<Crown size={13} className="text-blue-500" />}
              features={planFeatures}
            />
            <FeatureSection
              title="Fitur Tambahan"
              icon={<Gift size={13} className="text-violet-500" />}
              features={addonFeatures}
              emptyText="Belum ada add-on aktif."
            />
            <FeatureSection
              title="Masa Coba"
              icon={<CalendarClock size={13} className="text-orange-500" />}
              features={trialFeatures}
            />

            {/* ── CTA ── */}
            <button
              onClick={() => setLocation("/marketplace")}
              className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 font-bold text-sm py-3.5 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              <ShoppingBag size={15} className="text-violet-500" />
              Lihat semua fitur di Marketplace
            </button>
          </>
        )}
      </div>
    </div>
  );
}
