'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/admin/login');
      router.refresh();
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-brand-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
    >
      <span>↪</span>
      <span>{isLoading ? 'Logging out...' : 'Logout'}</span>
    </button>
  );
}
