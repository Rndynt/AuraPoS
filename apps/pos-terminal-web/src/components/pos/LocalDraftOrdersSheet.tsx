import { useMemo, useState } from "react";
import { Drawer } from "vaul";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { Clock, ArrowRight, PackageOpen, User, Trash2, Loader2, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/context/TenantContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteLocalDraftOrder, listLocalDraftOrders, type LocalDraftOrder } from "@pos/offline";

interface LocalDraftOrdersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResumeLocalDraft: (draft: LocalDraftOrder) => void;
}

export function LocalDraftOrdersSheet({ open, onOpenChange, onResumeLocalDraft }: LocalDraftOrdersSheetProps) {
  const isMobile = useIsMobile();
  const { tenantId } = useTenant();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ["local-drafts", tenantId],
    queryFn: () => listLocalDraftOrders(tenantId),
    enabled: open,
  });

  const draftCount = useMemo(() => drafts.length, [drafts]);

  const handleDelete = async (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation();
    setDeletingId(draftId);
    try {
      await deleteLocalDraftOrder(tenantId, draftId);
      queryClient.invalidateQueries({ queryKey: ["local-drafts", tenantId] });
    } finally {
      setDeletingId(null);
    }
  };

  const content = (
    <div className="flex flex-col overflow-hidden" style={{ maxHeight: isMobile ? "70dvh" : "480px" }}>
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Smartphone className="w-4 h-4 text-blue-500" />
        </div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-800">Draft Lokal</h2>
          <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">{draftCount}</Badge>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 min-h-0 px-4 py-3 space-y-2">
        {isLoading ? <div className="text-xs text-slate-500">Memuat draft lokal...</div> : draftCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3"><PackageOpen className="w-6 h-6 text-slate-400" /></div>
            <p className="text-sm font-medium text-slate-600">Tidak ada draft lokal</p>
          </div>
        ) : drafts.map((draft) => (
          <div key={draft.id} className="w-full flex items-center gap-2 p-3 rounded-xl border border-slate-100 bg-white">
            <button onClick={() => { onResumeLocalDraft(draft); onOpenChange(false); }} className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-700">LOCAL-{draft.id.slice(0,8)}</span>
                {draft.tableNumber && <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Meja {draft.tableNumber}</span>}
              </div>
              {draft.customerName && <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 truncate"><User className="w-3 h-3" />{draft.customerName}</p>}
              <p className="text-sm font-bold text-slate-800 mt-0.5">Rp {Number(draft.total ?? 0).toLocaleString("id-ID")}</p>
              <p className="text-[10px] text-slate-400 mt-0.5"><Clock className="w-3 h-3 inline" /> {new Date(draft.updatedAt).toLocaleString("id-ID")}</p>
            </button>
            <button onClick={(e) => handleDelete(e, draft.id)} disabled={deletingId===draft.id} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50">{deletingId===draft.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4"/>}</button>
            <button onClick={() => { onResumeLocalDraft(draft); onOpenChange(false); }} className="flex items-center gap-1 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">Lanjut<ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );

  if (isMobile) return <Drawer.Root open={open} onOpenChange={onOpenChange}><Drawer.Portal><Drawer.Overlay className="fixed inset-0 bg-black/40 z-[55]" /><Drawer.Content className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-2xl flex flex-col"><div className="flex justify-center pt-3 pb-1"><Drawer.Handle className="w-10 h-1 rounded-full bg-slate-300" /></div>{content}</Drawer.Content></Drawer.Portal></Drawer.Root>;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md p-0 overflow-hidden"><DialogHeader className="sr-only"><DialogTitle>Draft Lokal</DialogTitle></DialogHeader>{content}</DialogContent></Dialog>;
}
