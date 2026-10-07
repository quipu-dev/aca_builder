import { cn } from '@/utils';
import type React from 'react';

export interface AcaLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
}

/**
 * ACA 品牌图标组件
 * 单一事实来源 (SSOT): 直接引用 `/favicon.svg`，禁止在组件层维护重复矢量路径。
 */
export function AcaLogo({ className, alt = 'ACA Logo', ...props }: AcaLogoProps) {
  return (
    <img
      {...props}
      src="/favicon.svg"
      alt={alt}
      draggable={false}
      className={cn('inline-block shrink-0 select-none pointer-events-none', className)}
    />
  );
}
