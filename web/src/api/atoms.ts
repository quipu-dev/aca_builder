import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface AtomDetailResponse {
  id: string;
  package: string | null;
  meta: Record<string, unknown>;
  content: string;
  raw: string;
  source_file: string;
}

export interface CreateAtomPayload {
  package?: string;
  id?: string;
  type: string;
  priority?: number;
  description?: string;
  domain?: string[];
  uses?: string[];
  content: string;
}

export interface UpdateAtomPayload {
  raw_content?: string;
  content?: string;
  meta?: Record<string, unknown>;
}

export async function fetchAtomDetail(atomId: string): Promise<AtomDetailResponse> {
  return apiFetch<AtomDetailResponse>(`/api/atoms/${encodeURIComponent(atomId)}`);
}

export function useCreateAtomMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAtomPayload) =>
      apiFetch<{ status: string; file: string; id: string }>('/api/atoms', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['lint'] });
    },
  });
}

export function useUpdateAtomMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ atomId, payload }: { atomId: string; payload: UpdateAtomPayload }) =>
      apiFetch<{ status: string; id: string }>(`/api/atoms/${encodeURIComponent(atomId)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['lint'] });
      queryClient.invalidateQueries({ queryKey: ['atom', variables.atomId] });
    },
  });
}

export function useDeleteAtomMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (atomId: string) =>
      apiFetch<{ status: string; deleted: string }>(`/api/atoms/${encodeURIComponent(atomId)}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['lint'] });
    },
  });
}
