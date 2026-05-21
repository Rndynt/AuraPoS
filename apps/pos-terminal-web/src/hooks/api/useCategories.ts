import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { getActiveTenantId } from '@/lib/tenant';

async function req(url: string, init?: RequestInit) {
  const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json', 'x-tenant-id': getActiveTenantId(), ...(init?.headers || {}) }, ...init });
  const payload = await res.json().catch(() => null);
  if (!res.ok || (payload && payload.success === false)) {
    const message = payload?.error?.message || payload?.message || payload?.error || (await res.text().catch(() => 'Request failed'));
    throw new Error(message || 'Request failed');
  }
  return payload;
}

export type CategoryItem = { id: string; name: string; is_active: boolean; display_order: number };

export function useCategories() {
  return useQuery<CategoryItem[]>({
    queryKey: ['/api/catalog/categories'],
    queryFn: async () => (await req('/api/catalog/categories')).data.categories ?? [],
  });
}

export function useRenameCategory() {
  return useMutation({
    mutationFn: (payload: { old_name: string; new_name: string }) => req('/api/catalog/categories', { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/catalog/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/catalog/products'] });
    },
  });
}

export function useCreateCategory() {
  return useMutation({
    mutationFn: (payload: { name: string; description?: string }) => req('/api/catalog/categories', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/catalog/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/catalog/products'] });
    },
  });
}

export function useDeleteCategory() {
  return useMutation({
    mutationFn: (payload: { id?: string; name?: string; fallback_name: string }) =>
      req('/api/catalog/categories', { method: 'DELETE', body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/catalog/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/catalog/products'] });
    },
  });
}
