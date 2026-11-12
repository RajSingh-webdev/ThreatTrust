'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import InstitutionalNavbar from '@/components/institutional-navbar';
import { useAuth } from '@/lib/auth-context';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070708] flex items-center justify-center font-mono text-xs text-[#71717A]">
        Authenticating node...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070708] text-white selection:bg-[#C6F432] selection:text-[#070708]">
      <InstitutionalNavbar />
      <main className="pt-2 min-h-screen">
        {children}
      </main>
    </div>
  );
}
