'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

// Protected route wrapper component
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading, user, fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      // If already authenticated with user data, skip
      if (isAuthenticated && user) {
        return;
      }

      // If loading, wait
      if (loading) {
        return;
      }

      // If not authenticated, check if we have a token
      const token = localStorage.getItem('accessToken');
      if (token) {
        // Try to fetch current user only once
        await fetchCurrentUser();
      } else {
        // Redirect to login if no token
        router.push('/auth/login');
      }
    };

    checkAuth();
    // Only run on mount and when authentication status changes meaningfully
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}

// Public route wrapper (redirects to calendar if authenticated)
export function PublicRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, loading, user, fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      // If already authenticated with user data, redirect
      if (isAuthenticated && user) {
        router.push('/calendar');
        return;
      }

      // If loading, wait
      if (loading) {
        return;
      }

      // If not authenticated, check if we have a token
      const token = localStorage.getItem('accessToken');
      if (token && !isAuthenticated) {
        // Try to fetch current user
        await fetchCurrentUser();
      }
    };

    checkAuth();
    // Only run on mount and when authentication status changes meaningfully
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  if (loading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}

