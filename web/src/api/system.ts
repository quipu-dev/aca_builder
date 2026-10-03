import { apiFetch } from './client';

export async function openInObsidian(filePath: string): Promise<{ status: string; uri?: string }> {
  return apiFetch('/api/system/open-obsidian', {
    method: 'POST',
    body: JSON.stringify({ file_path: filePath }),
  });
}
