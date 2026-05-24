import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ChefHat, QrCode, ExternalLink, Lock, Eye, EyeOff,
  Copy, Check, Maximize2, Shield, RefreshCcw, Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/design";
import { useToast } from "@/hooks/use-toast";

const KDS_PIN_KEY = "kds_pin";
const KDS_UNLOCKED_KEY = "kds_unlocked_until";

function getKdsUrl(): string {
  return `${window.location.origin}/kds`;
}

function QRCodeImage({ url }: { url: string }) {
  const encoded = encodeURIComponent(url);
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}&qzone=1&color=1e293b&bgcolor=ffffff&format=png`;
  return (
    <img
      src={src}
      alt="QR Code KDS"
      className="w-40 h-40 rounded-xl border border-slate-200"
      data-testid="img-kds-qr"
    />
  );
}

export default function KitchenDisplayPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [pin, setPin] = useState(() => localStorage.getItem(KDS_PIN_KEY) ?? "");
  const [pinInput, setPinInput] = useState(pin);
  const [showPin, setShowPin] = useState(false);
  const [pinSaved, setPinSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const kdsUrl = getKdsUrl();
  const isLocked = !localStorage.getItem(KDS_UNLOCKED_KEY) || Date.now() >= parseInt(localStorage.getItem(KDS_UNLOCKED_KEY) ?? "0", 10);

  const handleSavePin = () => {
    const trimmed = pinInput.trim();
    if (trimmed.length < 4 || trimmed.length > 6 || !/^\d+$/.test(trimmed)) {
      toast({ title: "PIN tidak valid", description: "PIN harus 4–6 angka.", variant: "destructive" });
      return;
    }
    localStorage.setItem(KDS_PIN_KEY, trimmed);
    localStorage.removeItem(KDS_UNLOCKED_KEY);
    setPin(trimmed);
    setPinSaved(true);
    setTimeout(() => setPinSaved(false), 2000);
    toast({ title: "PIN disimpan", description: "Sesi KDS yang aktif akan terkunci. PIN baru berlaku mulai sekarang." });
  };

  const handleResetPin = () => {
    localStorage.removeItem(KDS_PIN_KEY);
    localStorage.removeItem(KDS_UNLOCKED_KEY);
    setPin("");
    setPinInput("");
    toast({ title: "PIN dihapus", description: "KDS tidak bisa dibuka sampai PIN baru diatur." });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(kdsUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleOpenKds = () => {
    window.open(kdsUrl, "_blank", "noopener");
  };

  const handleForceUnlock = () => {
    if (!pin) {
      toast({ title: "Belum ada PIN", description: "Atur PIN dulu sebelum membuka KDS.", variant: "destructive" });
      return;
    }
    localStorage.setItem(KDS_UNLOCKED_KEY, String(Date.now() + 8 * 60 * 60 * 1000));
    window.open(kdsUrl, "_blank", "noopener");
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <PageHeader
        title="Kitchen Display"
        subtitle="Kelola akses layar dapur (KDS)"
        onBack={() => setLocation("/hub")}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto w-full">

        {/* Status Card */}
        <div className={`rounded-2xl border p-4 flex items-center gap-4 ${
          pin ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            pin ? "bg-green-500" : "bg-amber-500"
          }`}>
            <Shield size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <p className={`text-sm font-extrabold ${pin ? "text-green-800" : "text-amber-800"}`}>
              {pin ? "PIN sudah diatur" : "PIN belum diatur"}
            </p>
            <p className={`text-xs mt-0.5 ${pin ? "text-green-600" : "text-amber-600"}`}>
              {pin
                ? `KDS dilindungi PIN ${pin.length} digit. Sesi aktif 8 jam setelah buka.`
                : "KDS tidak bisa diakses sampai PIN diatur."}
            </p>
          </div>
          {pin && (
            <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              isLocked ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-700"
            }`}>
              {isLocked ? "Terkunci" : "Aktif"}
            </div>
          )}
        </div>

        {/* PIN Setting */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Lock size={16} className="text-slate-500" />
            <h2 className="text-sm font-extrabold text-slate-800">Pengaturan PIN</h2>
          </div>
          <p className="text-xs text-slate-500">
            PIN 4–6 digit ini wajib dimasukkan setiap kali perangkat dapur membuka halaman KDS.
          </p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                maxLength={6}
                placeholder="Masukkan PIN (4–6 digit)"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono tracking-widest focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none pr-10"
                data-testid="input-kds-pin"
              />
              <button
                onClick={() => setShowPin((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <button
              onClick={handleSavePin}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold rounded-xl transition-colors flex items-center gap-1.5"
              data-testid="button-save-pin"
            >
              {pinSaved ? <Check size={15} /> : null}
              {pinSaved ? "Tersimpan" : "Simpan"}
            </button>
          </div>

          {pin && (
            <button
              onClick={handleResetPin}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-semibold transition-colors"
              data-testid="button-reset-pin"
            >
              <Trash2 size={13} /> Hapus PIN & kunci KDS
            </button>
          )}
        </div>

        {/* QR & Link */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <QrCode size={16} className="text-slate-500" />
            <h2 className="text-sm font-extrabold text-slate-800">Buka di Perangkat Dapur</h2>
          </div>
          <p className="text-xs text-slate-500">
            Scan QR code di bawah dari tablet/layar dapur, atau salin link-nya.
            Setelah terbuka, masukkan PIN untuk akses.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <QRCodeImage url={kdsUrl} />
            </div>
            <div className="flex-1 space-y-3 w-full">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
                <code className="text-xs text-slate-600 flex-1 truncate font-mono">{kdsUrl}</code>
                <button
                  onClick={handleCopyLink}
                  className="flex-shrink-0 text-slate-400 hover:text-blue-600 transition-colors"
                  data-testid="button-copy-kds-link"
                >
                  {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
                </button>
              </div>

              <button
                onClick={handleOpenKds}
                className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold py-2.5 rounded-xl transition-colors"
                data-testid="button-open-kds-new-tab"
              >
                <ExternalLink size={15} /> Buka di Tab Baru
              </button>

              <button
                onClick={handleForceUnlock}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
                data-testid="button-open-kds-unlocked"
              >
                <Maximize2 size={15} /> Buka & Lewati PIN (perangkat ini)
              </button>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-slate-100 rounded-2xl p-4 space-y-2">
          <h3 className="text-xs font-extrabold text-slate-600 uppercase tracking-wide">Cara pakai</h3>
          <ol className="text-xs text-slate-500 space-y-1.5 list-decimal list-inside">
            <li>Atur PIN 4–6 digit di atas, klik <strong className="text-slate-700">Simpan</strong></li>
            <li>Di tablet dapur, scan QR code atau ketik URL: <code className="bg-white px-1 rounded text-slate-700">{kdsUrl}</code></li>
            <li>Masukkan PIN — sesi aktif selama 8 jam tanpa perlu login ulang</li>
            <li>Tekan ikon fullscreen di KDS agar tampil maksimal di layar dapur</li>
          </ol>
        </div>

      </div>
    </div>
  );
}
