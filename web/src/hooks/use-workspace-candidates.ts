import type { AutocompleteOption } from '@/components/ui/autocomplete/types';
import type { PackageItem } from '@/features/explorer/PackageExplorer';
import { useMemo } from 'react';

export function useWorkspaceCandidates(packages: PackageItem[]) {
  return useMemo(() => {
    const lookupOptions: AutocompleteOption[] = [];
    const domainSet = new Set<string>();
    const atomOptions: AutocompleteOption[] = [];

    for (const pkg of packages) {
      // 1. 公开导出接口
      for (const [key, def] of Object.entries(pkg.exports || {})) {
        const pillar = (def.pillar || 'd1').toLowerCase() as 'd1' | 'd2' | 'd3';
        lookupOptions.push({
          value: key,
          label: key,
          badge: pillar.toUpperCase(),
          badgeVariant: pillar,
          group: `@${pkg.name} (公开导出)`,
          description: def.description || undefined,
        });
      }

      // 2. 内部私有接口
      for (const [key, def] of Object.entries(pkg.internal_lookups || {})) {
        const pillar = (def.pillar || 'd1').toLowerCase() as 'd1' | 'd2' | 'd3';
        const displayLabel = key.includes('::') ? key : `${pkg.name}::internal::${key}`;
        lookupOptions.push({
          value: displayLabel,
          label: displayLabel,
          badge: pillar.toUpperCase(),
          badgeVariant: pillar,
          group: `@${pkg.name} (内部私有)`,
          description: def.description || undefined,
        });
      }

      // 3. 原子组件与领域标签
      for (const atom of pkg.atoms || []) {
        const atype = (atom.type || 'd1').toLowerCase() as 'd1' | 'd2' | 'd3' | 'kernel';
        atomOptions.push({
          value: atom.id,
          label: atom.id,
          badge:
            typeof atom.priority === 'number' ? `${atype}-P${atom.priority}` : atype.toUpperCase(),
          badgeVariant: atype,
          group: `@${pkg.name}`,
        });

        if (Array.isArray(atom.domain)) {
          for (const d of atom.domain) {
            if (d && typeof d === 'string') {
              domainSet.add(d.trim().toLowerCase());
            }
          }
        }
      }
    }

    const domainOptions: AutocompleteOption[] = Array.from(domainSet)
      .sort()
      .map((d) => ({
        value: d,
        label: d,
        badge: 'TAG',
        badgeVariant: 'default',
      }));

    return {
      lookupOptions,
      domainOptions,
      atomOptions,
    };
  }, [packages]);
}
