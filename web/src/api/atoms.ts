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

export interface AtomReferenceItem {
  key: string;
  package?: string | null;
  visibility?: string;
  pillar?: string;
}

export interface AtomReferencesResponse {
  atom_id: string;
  reference_count: number;
  referenced_by_lookups: AtomReferenceItem[];
}

export async function fetchAtomDetail(atomId: string): Promise<AtomDetailResponse> {
  return apiFetch<AtomDetailResponse>(`/api/atoms/${encodeURIComponent(atomId)}`);
}

export async function fetchAtomReferences(atomId: string): Promise<AtomReferencesResponse> {
  return apiFetch<AtomReferencesResponse>(`/api/atoms/${encodeURIComponent(atomId)}/references`);
}

export async function renameAtomApi(
  atomId: string,
  newId: string,
  cascade = true,
): Promise<{
  status: string;
  old_id: string;
  new_id: string;
  file: string;
  cascaded_lookups_count?: number;
}> {
  return apiFetch<{
    status: string;
    old_id: string;
    new_id: string;
    file: string;
    cascaded_lookups_count?: number;
  }>(`/api/atoms/${encodeURIComponent(atomId)}/rename`, {
    method: 'POST',
    body: JSON.stringify({ new_id: newId, cascade }),
  });
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
