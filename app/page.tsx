'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user, fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      // If already authenticated with user data, redirect
      if (isAuthenticated && user) {
        router.push('/calendar');
        return;
      }

      // If not authenticated, check if we have a token
      const token = localStorage.getItem('accessToken');
      if (token && !isAuthenticated) {
        // Try to fetch current user
        await fetchCurrentUser();
        // Wait a bit for the store to update, then check again
        setTimeout(() => {
          const state = useAuthStore.getState();
          if (state.isAuthenticated && state.user) {
            router.push('/calendar');
          } else {
            router.push('/auth/login');
          }
        }, 100);
      } else if (!token) {
        router.push('/auth/login');
      }
    };

    checkAuth();
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}
