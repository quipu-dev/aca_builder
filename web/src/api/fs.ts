import { apiFetch } from './client';

export interface MkdirPayload {
  path: string;
  scope?: 'manifests' | 'libraries';
}

export interface MoveFsPayload {
  src: string;
  dest: string;
  scope?: 'manifests' | 'libraries';
}

export interface DeleteFsPayload {
  path: string;
  scope?: 'manifests' | 'libraries';
}

export async function createFolderFs(
  payload: MkdirPayload,
): Promise<{ status: string; created: string }> {
  return apiFetch('/api/fs/mkdir', {
    method: 'POST',
    body: JSON.stringify({ scope: 'manifests', ...payload }),
  });
}

export async function moveFsItem(
  payload: MoveFsPayload,
): Promise<{ status: string; src: string; dest: string }> {
  return apiFetch('/api/fs/move', {
    method: 'POST',
    body: JSON.stringify({ scope: 'manifests', ...payload }),
  });
}

export async function deleteFsItem(
  payload: DeleteFsPayload,
): Promise<{ status: string; deleted: string }> {
  return apiFetch('/api/fs/delete', {
    method: 'DELETE',
    body: JSON.stringify({ scope: 'manifests', ...payload }),
  });
}
