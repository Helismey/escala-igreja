'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isCapacitorNative, setupCapacitorListeners } from '@/lib/capacitor-adapter';

export function CapacitorInit() {
  const router = useRouter();

  useEffect(() => {
    if (isCapacitorNative()) {
      const cleanup = setupCapacitorListeners((path) => {
        router.push(path);
      });
      return cleanup;
    }
  }, [router]);

  return null;
}
