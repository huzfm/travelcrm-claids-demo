'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

function Breadcrumb({ items, className }: BreadcrumbProps) {
  const pathname = usePathname();

  // Auto-generate breadcrumbs from pathname if no items provided
  const breadcrumbs = React.useMemo(() => {
    if (items) return items;

    const paths = pathname.split('/').filter(Boolean);
    return paths.map((path, index) => {
      const href = '/' + paths.slice(0, index + 1).join('/');
      const label = path
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return { label, href };
    });
  }, [pathname, items]);

  if (breadcrumbs.length === 0) return null;

  return (
    <nav className={cn('flex items-center gap-1 text-sm', className)}>
      <Link
        href="/dashboard"
        className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.href || index}>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          {index === breadcrumbs.length - 1 ? (
            <span className="font-medium text-foreground truncate max-w-[200px]">
              {crumb.label}
            </span>
          ) : crumb.href ? (
            <Link
              href={crumb.href}
              className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[150px]"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-muted-foreground truncate max-w-[150px]">{crumb.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export { Breadcrumb };
