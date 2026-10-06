import type { BuildResponse } from '@/api/lookups';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface ManifestDetailResponse {
  name: string;
  version?: string;
  description?: string;
  imports?: Array<{
    lookup?: string;
    query?: Record<string, unknown>;
    with?: Record<string, string>;
  }>;
}

export interface SaveManifestPayload {
  name: string;
  version: string;
  description: string;
  imports: Array<{
    lookup: string;
    with?: Record<string, string>;
  }>;
  identifier?: string;
  workspace_path?: string;
}

export interface BuildManifestPayload {
  manifest: string;
  is_file?: boolean;
  apply_hook?: boolean;
}

export interface CompileAdhocPayload {
  imports: Array<{
    lookup: string;
    with?: Record<string, string>;
  }>;
  apply_hook?: boolean;
}

export async function fetchManifestDetail(name: string): Promise<ManifestDetailResponse> {
  return apiFetch<ManifestDetailResponse>(`/api/manifests/${encodeURIComponent(name)}`);
}

export async function buildManifest(payload: BuildManifestPayload): Promise<BuildResponse> {
  return apiFetch<BuildResponse>('/api/build', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function compileAdhocManifest(payload: CompileAdhocPayload): Promise<BuildResponse> {
  return apiFetch<BuildResponse>('/api/compile-adhoc', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function useSaveManifestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveManifestPayload) =>
      apiFetch<{ status: string; path: string }>('/api/manifests', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['lint'] });
    },
  });
}
