'use client';

import { ProtectedLayout } from '@/components/layout/protected-layout';

export default function ProtectedGroup({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
