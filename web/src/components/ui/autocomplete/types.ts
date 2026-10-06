import type { BadgeProps } from '@/components/ui/badge';

export interface AutocompleteOption<T = unknown> {
  value: string;
  label: string;
  badge?: string;
  badgeVariant?: BadgeProps['variant'];
  group?: string;
  description?: string;
  data?: T;
}
