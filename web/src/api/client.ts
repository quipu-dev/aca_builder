import type { TypeValidator } from './validator';

export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
  validator?: TypeValidator<T>,
): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data.detail) errorDetail = data.detail;
    } catch {
      // 忽略无法解析 JSON 的情况
    }
    throw new Error(errorDetail);
  }

  const json = await res.json();
  if (validator) {
    return validator.parse(json);
  }
  return json as T;
}
