import type { ProfileSummary, PromptChunk } from '@/components/editor/PromptViewer';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface EvaluateLookupPayload {
  selectors: Array<Record<string, unknown>>;
  package?: string | null;
  pillar?: string;
}

export interface MatchedAtomItem {
  id: string;
  type: string;
  priority?: number;
  package?: string;
  source_file?: string;
  domain: string[];
  preview: string;
}

export interface EvaluateLookupResponse {
  matched_atoms?: MatchedAtomItem[];
  count: number;
  error?: string;
}

export interface AdhocLookupCompilePayload {
  key: string;
  selectors: Array<Record<string, unknown>>;
  package?: string | null;
  pillar: string;
  apply_hook?: boolean;
}

export interface BuildResponse {
  prompt: string;
  hooked_prompt?: string | null;
  chunks: PromptChunk[];
  profile?: ProfileSummary | null;
}

export interface SaveLookupPayload {
  package: string;
  key: string;
  pillar: string;
  is_public: boolean;
  description: string;
  selectors: Array<Record<string, unknown>>;
}

export async function evaluateLookupAdhoc(
  payload: EvaluateLookupPayload,
): Promise<EvaluateLookupResponse> {
  return apiFetch<EvaluateLookupResponse>('/api/lookups/evaluate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function compileLookupAdhoc(
  payload: AdhocLookupCompilePayload,
): Promise<BuildResponse> {
  return apiFetch<BuildResponse>('/api/lookups/compile-adhoc', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function useSaveLookupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveLookupPayload) =>
      apiFetch<{ status: string; key: string; package: string }>('/api/lookups', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['lint'] });
    },
  });
}

export function useDeleteLookupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lookupKey: string) =>
      apiFetch<{ status: string; deleted: string }>(
        `/api/lookups/${encodeURIComponent(lookupKey)}`,
        {
          method: 'DELETE',
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['lint'] });
    },
  });
}
