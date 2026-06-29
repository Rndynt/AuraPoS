import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Store, ChevronLeft, Save, Loader2 } from "lucide-react";
import { InputField } from "@/components/design";
import { useTenant } from "@/context/TenantContext";
import { useTenantProfile } from "@/hooks/api/useTenantProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { buildApiHeaders } from "@/lib/outlet";

export default function StoreProfilePage() {
  const [, setLocation] = useLocation();
  const { tenantId } = useTenant();
  const { data: profile, isLoading } = useTenantProfile(tenantId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    businessName: "",
    phone: "",
    address: "",
    email: "",
    taxRate: "",
    serviceChargeRate: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile?.tenant) {
      setFormData({
        businessName: profile.tenant.business_name || profile.tenant.name || "",
        phone: profile.tenant.business_phone || "",
        address: profile.tenant.business_address || "",
        email: profile.tenant.business_email || "",
        taxRate: profile.tenant.tax_rate != null ? String(Math.round(Number(profile.tenant.tax_rate) * 100)) : "",
        serviceChargeRate: profile.tenant.service_charge_rate != null ? String(Math.round(Number(profile.tenant.service_charge_rate) * 100)) : "",
      });
    }
  }, [profile]);

  const handleBack = () => setLocation("/hub");

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/tenants/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...buildApiHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({
          businessName: formData.businessName || undefined,
          businessPhone: formData.phone || null,
          businessAddress: formData.address || null,
          businessEmail: formData.email || null,
          taxRate: formData.taxRate !== "" ? Number(formData.taxRate) / 100 : undefined,
          serviceChargeRate: formData.serviceChargeRate !== "" ? Number(formData.serviceChargeRate) / 100 : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }

      // Invalidate tenant profile cache so header/context refreshes
      await queryClient.invalidateQueries({ queryKey: ["/api/me/entitlements", tenantId] });

      toast({ title: "Profil toko berhasil disimpan", variant: "default" });
    } catch (err) {
      toast({
        title: "Gagal menyimpan",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in slide-in-from-bottom-4">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            data-testid="button-back"
          >
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-800 leading-tight">Profil Toko</h1>
            <p className="text-[11px] text-slate-400 leading-none">Informasi &amp; identitas bisnis kamu</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-blue-700 shadow-md shadow-blue-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          data-testid="button-save"
        >
          {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {isSaving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-lg mx-auto w-full">

        {/* Store icon placeholder */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center">
            <Store size={28} className="text-blue-500" />
          </div>
          <p className="text-xs text-slate-400">Foto toko belum tersedia</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Informasi Bisnis</p>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : (
            <>
              <InputField
                label="Nama Bisnis"
                value={formData.businessName}
                onChange={(e) => setFormData((f) => ({ ...f, businessName: e.target.value }))}
                placeholder="Nama toko atau bisnis"
                data-testid="input-business-name"
              />
              <InputField
                label="Nomor Telepon"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                placeholder="08xxxxxxxxxx"
                data-testid="input-phone"
              />
              <InputField
                label="Alamat"
                value={formData.address}
                onChange={(e) => setFormData((f) => ({ ...f, address: e.target.value }))}
                placeholder="Jalan, kota, provinsi"
                data-testid="input-address"
              />
              <InputField
                label="Email Bisnis"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@toko.com"
                data-testid="input-email"
              />
            </>
          )}
        </div>

        {/* Pajak & Biaya Layanan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pajak &amp; Biaya Layanan</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Diterapkan otomatis ke setiap transaksi. Isi 0 untuk menonaktifkan.</p>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">PPN / Pajak (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={formData.taxRate}
                    onChange={(e) => setFormData((f) => ({ ...f, taxRate: e.target.value }))}
                    placeholder="11"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    data-testid="input-tax-rate"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">%</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Contoh: 11 untuk PPN 11%</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Biaya Layanan / Service Charge (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={formData.serviceChargeRate}
                    onChange={(e) => setFormData((f) => ({ ...f, serviceChargeRate: e.target.value }))}
                    placeholder="5"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    data-testid="input-service-charge-rate"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">%</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Contoh: 5 untuk service charge 5%</p>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
