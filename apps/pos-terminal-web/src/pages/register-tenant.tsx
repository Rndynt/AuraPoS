import { useState, useEffect, useRef } from "react";
import { CheckCircle2, XCircle, Loader2, Store, ChevronRight } from "lucide-react";

const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || "aurapos.my.id";

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid";
type Step = "business" | "account" | "done";

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
}

export default function RegisterTenantPage() {
  const [step, setStep] = useState<Step>("business");

  // Business info
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [slugMsg, setSlugMsg] = useState("");
  const slugTimer = useRef<ReturnType<typeof setTimeout>>();

  // Account info
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerUsername, setOwnerUsername] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; name: string } | null>(null);

  // Auto-suggest slug dari business name
  useEffect(() => {
    if (businessName && step === "business") {
      const suggested = slugify(businessName);
      setSlug(suggested);
    }
  }, [businessName]);

  // Check slug availability
  useEffect(() => {
    if (!slug) { setSlugStatus("idle"); setSlugMsg(""); return; }
    if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(slug)) {
      setSlugStatus("invalid");
      setSlugMsg("Min 3 karakter, huruf kecil, angka, dan tanda hubung saja.");
      return;
    }
    setSlugStatus("checking");
    clearTimeout(slugTimer.current);
    slugTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/register/check-slug/${slug}`);
        const body = await res.json();
        setSlugStatus(body.available ? "available" : "taken");
        setSlugMsg(body.available ? `${slug}.${BASE_DOMAIN}` : (body.reason ?? "Tidak tersedia"));
      } catch {
        setSlugStatus("idle");
      }
    }, 500);
  }, [slug]);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, businessName, ownerName, ownerEmail, ownerUsername, ownerPassword }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Registrasi gagal");
      setResult({ url: body.tenant.url, name: body.tenant.name });
      setStep("done");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300 transition-all";
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-200">
            <Store size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-800">Daftar AuraPOS</h1>
          <p className="text-slate-400 mt-2 font-medium">Buat akun POS untuk bisnis Anda</p>
        </div>

        {/* Step indicator */}
        {step !== "done" && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {(["business", "account"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  step === s ? "bg-blue-600 text-white" :
                  (step === "account" && s === "business") ? "bg-green-500 text-white" :
                  "bg-slate-200 text-slate-400"
                }`}>
                  {(step === "account" && s === "business") ? "✓" : i + 1}
                </div>
                <span className={`text-xs font-bold ${step === s ? "text-blue-600" : "text-slate-400"}`}>
                  {s === "business" ? "Info Bisnis" : "Akun Owner"}
                </span>
                {i < 1 && <ChevronRight size={14} className="text-slate-300" />}
              </div>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-8 border border-slate-100">

          {/* ── STEP 1: Business ── */}
          {step === "business" && (
            <div className="space-y-5">
              <div>
                <label className={labelClass}>Nama Bisnis</label>
                <input value={businessName} onChange={e => setBusinessName(e.target.value)}
                  placeholder="Thamada Coffee Shop" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>URL Subdomain</label>
                <div className="flex items-center gap-0 border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all bg-white">
                  <input
                    value={slug}
                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="thamada"
                    className="flex-1 bg-transparent px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-400 pr-4 whitespace-nowrap">.{BASE_DOMAIN}</span>
                </div>
                {/* Slug status */}
                {slug && (
                  <div className={`flex items-center gap-2 mt-2 text-xs font-semibold ${
                    slugStatus === "available" ? "text-green-600" :
                    slugStatus === "taken" || slugStatus === "invalid" ? "text-red-500" :
                    "text-slate-400"
                  }`}>
                    {slugStatus === "checking" && <Loader2 size={12} className="animate-spin" />}
                    {slugStatus === "available" && <CheckCircle2 size={12} />}
                    {(slugStatus === "taken" || slugStatus === "invalid") && <XCircle size={12} />}
                    <span>{slugStatus === "checking" ? "Memeriksa..." : slugMsg}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setStep("account")}
                disabled={slugStatus !== "available" || !businessName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 transition-all active:scale-[0.98] disabled:cursor-not-allowed"
              >
                Lanjut →
              </button>
            </div>
          )}

          {/* ── STEP 2: Account ── */}
          {step === "account" && (
            <div className="space-y-5">
              <div>
                <label className={labelClass}>Nama Lengkap</label>
                <input value={ownerName} onChange={e => setOwnerName(e.target.value)}
                  placeholder="Ahmad Thamada" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)}
                  placeholder="ahmad@thamadacoffee.id" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Username</label>
                <input value={ownerUsername} onChange={e => setOwnerUsername(e.target.value.replace(/\s/g, ""))}
                  placeholder="thamada_owner" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Password</label>
                <input type="password" value={ownerPassword} onChange={e => setOwnerPassword(e.target.value)}
                  placeholder="Min. 8 karakter" className={inputClass} />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep("business")}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3.5 rounded-2xl font-bold text-sm transition-all">
                  ← Kembali
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !ownerName || !ownerEmail || !ownerUsername || ownerPassword.length < 8}
                  className="flex-2 flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Mendaftarkan...</> : "Daftar Sekarang"}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Done ── */}
          {step === "done" && result && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-100">
                <CheckCircle2 size={40} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800">{result.name} berhasil didaftarkan!</h2>
                <p className="text-slate-400 mt-2">Akses POS Anda di:</p>
                <a href={result.url} target="_blank" rel="noopener noreferrer"
                  className="inline-block mt-2 text-blue-600 font-black text-lg hover:underline">
                  {result.url}
                </a>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-left space-y-2">
                <p className="text-xs font-black text-blue-700 uppercase tracking-wider">Langkah selanjutnya</p>
                <p className="text-sm text-slate-600">1. Arahkan DNS wildcard <code className="bg-white px-1 rounded font-mono text-xs">*.{BASE_DOMAIN}</code> ke IP server</p>
                <p className="text-sm text-slate-600">2. Buka URL di atas dan login dengan akun yang baru dibuat</p>
                <p className="text-sm text-slate-600">3. Setup produk, kategori, dan mulai berjualan!</p>
              </div>
              <a href={result.url}
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 transition-all text-center">
                Buka POS Saya →
              </a>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Sudah punya akun?{" "}
          <a href="/login" className="text-blue-600 font-bold hover:underline">Masuk di sini</a>
        </p>
      </div>
    </div>
  );
}
