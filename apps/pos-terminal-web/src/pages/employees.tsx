import { useState } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft, UserPlus, Shield, ShieldOff, MoreVertical,
  Loader2, Users, Crown, Briefcase, CreditCard, ChefHat, Eye
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/context/TenantContext";
import { useCurrentUser } from "@/hooks/api/useCurrentUser";
import { buildApiHeaders } from "@/lib/outlet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

type StaffRole = "owner" | "manager" | "cashier" | "kitchen" | "viewer";

interface Employee {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: string;
  banned: boolean;
  banReason: string | null;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  manager: "Manajer",
  cashier: "Kasir",
  kitchen: "Dapur",
  viewer: "Hanya Lihat",
};

const ROLE_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  owner: Crown,
  manager: Briefcase,
  cashier: CreditCard,
  kitchen: ChefHat,
  viewer: Eye,
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-100 text-amber-700",
  manager: "bg-blue-100 text-blue-700",
  cashier: "bg-green-100 text-green-700",
  kitchen: "bg-orange-100 text-orange-700",
  viewer: "bg-slate-100 text-slate-600",
};

const ASSIGNABLE_ROLES: StaffRole[] = ["manager", "cashier", "kitchen", "viewer"];

async function apiCall(path: string, method: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", ...buildApiHeaders() },
    credentials: "include",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

export default function EmployeesPage() {
  const [, setLocation] = useLocation();
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const isOwner = currentUser?.role === "owner" || currentUser?.role === "platform-admin";

  const [showInvite, setShowInvite] = useState(false);
  const [showBanned, setShowBanned] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", password: "", role: "cashier" as StaffRole });
  const [inviteError, setInviteError] = useState<string | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery<{ employees: Employee[] }>({
    queryKey: ["/api/employees", tenantId, showBanned],
    queryFn: async () => {
      const res = await apiCall(`/api/employees?showBanned=${showBanned}`, "GET");
      return res.data;
    },
    enabled: !!tenantId,
  });

  const employees = data?.employees ?? [];
  const active = employees.filter((e) => !e.banned);
  const banned = employees.filter((e) => e.banned);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["/api/employees", tenantId] });
  }

  // ── Mutations ────────────────────────────────────────────────────────────────
  const inviteMutation = useMutation({
    mutationFn: (body: typeof inviteForm) => apiCall("/api/employees/invite", "POST", body),
    onSuccess: () => {
      setShowInvite(false);
      setInviteForm({ name: "", email: "", password: "", role: "cashier" });
      setInviteError(null);
      invalidate();
      toast({ title: "Karyawan berhasil ditambahkan" });
    },
    onError: (err: Error) => setInviteError(err.message),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiCall(`/api/employees/${id}/role`, "PATCH", { role }),
    onSuccess: () => { invalidate(); toast({ title: "Role berhasil diubah" }); },
    onError: (err: Error) => toast({ title: "Gagal mengubah role", description: err.message, variant: "destructive" }),
  });

  const banMutation = useMutation({
    mutationFn: (id: string) => apiCall(`/api/employees/${id}/ban`, "PATCH", {}),
    onSuccess: () => { invalidate(); toast({ title: "Karyawan dinonaktifkan" }); },
    onError: (err: Error) => toast({ title: "Gagal menonaktifkan", description: err.message, variant: "destructive" }),
  });

  const unbanMutation = useMutation({
    mutationFn: (id: string) => apiCall(`/api/employees/${id}/unban`, "PATCH", {}),
    onSuccess: () => { invalidate(); toast({ title: "Karyawan diaktifkan kembali" }); },
    onError: (err: Error) => toast({ title: "Gagal mengaktifkan", description: err.message, variant: "destructive" }),
  });

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in slide-in-from-bottom-4">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setLocation("/hub")} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-800 leading-tight">Karyawan</h1>
            <p className="text-[11px] text-slate-400 leading-none">{active.length} aktif</p>
          </div>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowInvite(true)}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-blue-700 shadow-md shadow-blue-200 transition-colors"
          >
            <UserPlus size={15} />
            Tambah
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-lg mx-auto w-full">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)
        ) : active.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
            <Users size={40} className="opacity-30" />
            <p className="text-sm">Belum ada karyawan</p>
          </div>
        ) : (
          active.map((emp) => <EmployeeCard key={emp.id} employee={emp} isOwner={isOwner} onRoleChange={(role) => roleMutation.mutate({ id: emp.id, role })} onBan={() => banMutation.mutate(emp.id)} />)
        )}

        {/* Banned section */}
        {isOwner && (
          <button onClick={() => setShowBanned((v) => !v)} className="w-full text-xs text-slate-400 flex items-center gap-1 py-2 hover:text-slate-600 transition-colors">
            <ShieldOff size={12} />
            {showBanned ? "Sembunyikan" : "Tampilkan"} karyawan nonaktif ({banned.length})
          </button>
        )}
        {showBanned && banned.map((emp) => (
          <EmployeeCard key={emp.id} employee={emp} isOwner={isOwner} isBanned onUnban={() => unbanMutation.mutate(emp.id)} />
        ))}
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Karyawan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            {inviteError && <p className="text-xs text-red-500 bg-red-50 rounded-lg p-2">{inviteError}</p>}
            {[
              { label: "Nama Lengkap", key: "name", type: "text", placeholder: "Budi Santoso" },
              { label: "Email", key: "email", type: "email", placeholder: "budi@toko.com" },
              { label: "Password", key: "password", type: "password", placeholder: "Minimal 8 karakter" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} className="space-y-1">
                <label className="text-xs font-bold text-slate-500">{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={(inviteForm as any)[key]}
                  onChange={(e) => setInviteForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            ))}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Role</label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value as StaffRole }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => inviteMutation.mutate(inviteForm)}
              disabled={inviteMutation.isPending}
              className="w-full bg-blue-600 text-white rounded-xl py-2.5 font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-60"
            >
              {inviteMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
              {inviteMutation.isPending ? "Menyimpan..." : "Tambah Karyawan"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmployeeCard({
  employee,
  isOwner,
  isBanned = false,
  onRoleChange,
  onBan,
  onUnban,
}: {
  employee: Employee;
  isOwner: boolean;
  isBanned?: boolean;
  onRoleChange?: (role: string) => void;
  onBan?: () => void;
  onUnban?: () => void;
}) {
  const RoleIcon = ROLE_ICONS[employee.role] ?? Eye;
  const roleLabel = ROLE_LABELS[employee.role] ?? employee.role;
  const roleColor = ROLE_COLORS[employee.role] ?? ROLE_COLORS.viewer;

  return (
    <div className={`bg-white rounded-2xl border p-4 flex items-center gap-3 ${isBanned ? "opacity-60 border-slate-200" : "border-slate-200"}`}>
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
        <span className="text-base font-bold text-slate-500">
          {employee.name.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{employee.name}</p>
        <p className="text-xs text-slate-400 truncate">{employee.email}</p>
        <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${roleColor}`}>
          <RoleIcon size={9} />
          {roleLabel}
        </span>
      </div>

      {isOwner && !isBanned && employee.role !== "owner" && (
        <DropdownMenu>
          <DropdownMenuTrigger className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <MoreVertical size={16} className="text-slate-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <p className="px-2 py-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ubah Role</p>
            {ASSIGNABLE_ROLES.filter((r) => r !== employee.role).map((r) => {
              const Icon = ROLE_ICONS[r] ?? Eye;
              return (
                <DropdownMenuItem key={r} onClick={() => onRoleChange?.(r)} className="gap-2">
                  <Icon size={13} />
                  {ROLE_LABELS[r]}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onBan} className="text-red-500 gap-2">
              <ShieldOff size={13} />
              Nonaktifkan
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {isBanned && isOwner && (
        <button onClick={onUnban} className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
          <Shield size={12} />
          Aktifkan
        </button>
      )}
    </div>
  );
}
