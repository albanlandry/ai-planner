'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { PublicRoute } from '@/lib/auth';
import Link from 'next/link';
import { Calendar, AlertCircle, CheckCircle, Eye, EyeOff, Mail, Lock } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, loading, error, clearError } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  // Get redirect URL from query params (e.g., /auth/login?redirect=/calendar)
  useEffect(() => {
    const redirect = searchParams?.get('redirect') || '/calendar';
    setRedirectTo(redirect);
  }, [searchParams]);

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated && !loading) {
      // If we just logged in (isSubmitting was true), show success briefly
      // Otherwise, redirect immediately (user was already authenticated)
      const delay = isSubmitting ? 800 : 0;
      const redirectPath = redirectTo || '/calendar';
      
      const timer = setTimeout(() => {
        router.push(redirectPath);
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, loading, router, redirectTo, isSubmitting]);

  useEffect(() => {
    clearError();
    setFormError('');
    setFieldErrors({});
  }, [clearError]);

  // Clear field errors when user starts typing
  useEffect(() => {
    if (email) {
      setFieldErrors(prev => ({ ...prev, email: undefined }));
    }
  }, [email]);

  useEffect(() => {
    if (password) {
      setFieldErrors(prev => ({ ...prev, password: undefined }));
    }
  }, [password]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    // Client-side validation
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      // isAuthenticated will be set to true by the store
      // useEffect will handle the redirect
    } catch (err: any) {
      setIsSubmitting(false);
      
      // Handle specific error messages
      let errorMessage = 'Login failed. Please try again.';
      
      if (err instanceof Error) {
        if (err.message.includes('Invalid credentials') || err.message.includes('401')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (err.message.includes('Network error') || err.message.includes('Failed to fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setFormError(errorMessage);
      
      // Clear password field on error
      setPassword('');
    }
  };

  const isLoading = loading || isSubmitting;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 transition-all duration-300">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Calendar className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600 mt-2">Sign in to your calendar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Error Message */}
          {(error || formError) && (
            <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3 transition-all duration-300">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Login Failed</p>
                <p className="text-sm mt-1">{error || formError}</p>
              </div>
            </div>
          )}

          {/* Success Message (brief flash before redirect) */}
          {isAuthenticated && !error && isSubmitting && (
            <div className="bg-green-50 border-l-4 border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-start gap-3 transition-all duration-300">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Login Successful!</p>
                <p className="text-sm mt-1">Redirecting to calendar...</p>
              </div>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                  fieldErrors.email
                    ? 'border-red-300 bg-red-50 focus:ring-red-500'
                    : 'border-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                placeholder="you@example.com"
                disabled={isLoading}
                autoComplete="email"
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              />
            </div>
            {fieldErrors.email && (
              <p id="email-error" className="mt-1 text-sm text-red-600 flex items-center gap-1 transition-all duration-200">
                <AlertCircle className="w-4 h-4" />
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                  fieldErrors.password
                    ? 'border-red-300 bg-red-50 focus:ring-red-500'
                    : 'border-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                placeholder="••••••••"
                disabled={isLoading}
                autoComplete="current-password"
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="password-error" className="mt-1 text-sm text-red-600 flex items-center gap-1 transition-all duration-200">
                <AlertCircle className="w-4 h-4" />
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Register Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link 
              href="/auth/register" 
              className="text-blue-600 hover:text-blue-700 font-semibold transition hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <PublicRoute>
      <LoginContent />
    </PublicRoute>
  );
}

