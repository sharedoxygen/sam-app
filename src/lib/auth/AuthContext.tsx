'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signIn, signOut, useSession, SessionProvider } from 'next-auth/react';

// User type definition - ensure this aligns with what NextAuth session callback provides
export type User = {
  id: string | number; // Potentially string if from JWT sub
  username: string;
  name: string;
  role: string;
};

// Auth context type
type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean; // This will now reflect NextAuth's session loading status
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string | null }>; // signIn returns an object
  logout: () => Promise<void>; // signOut is async
};

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
function AuthProviderContent({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession(); // Use NextAuth's session hook
  const router = useRouter();
  const pathname = usePathname();

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  const user = isAuthenticated ? (session?.user as User) : null; // Cast session.user to our User type

  // Handle authentication route logic
  useEffect(() => {
    if (isLoading) return;

    // Always let users access the login page (assuming it's '/')
    if (pathname === '/') return;

    // If not authenticated and not on login page, redirect to login
    if (!isAuthenticated && pathname !== '/') {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // Login function using NextAuth signIn
  const login = async (
    username: string,
    password: string
  ): Promise<{ ok: boolean; error?: string | null }> => {
    const result = await signIn('credentials', {
      redirect: false, // Important to handle redirect manually or based on result
      username: username.toLowerCase(),
      password,
    });

    if (!result) {
      // This case should ideally not happen if signIn is awaited properly
      // but as a fallback if result is undefined for some reason.
      return { ok: false, error: 'Login failed: No response from authentication server.' };
    }

    if (result.error) {
      console.error('Authentication error:', result.error);
      return { ok: false, error: result.error };
    }

    if (result.ok) {
      // Optionally, you can force a router.push('/dashboard') here if login is successful
      // or let the calling component (LoginForm) handle it.
      // For now, just return success, LoginForm will redirect.
    }
    return { ok: result.ok, error: result.error };
  };

  // Logout function using NextAuth signOut
  const logout = async () => {
    await signOut({ redirect: false }); // Handle redirect manually after signout
    router.push('/'); // Redirect to login page after logout
  };

  // Provide the auth context to child components
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Export a new AuthProvider that includes NextAuth's SessionProvider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProviderContent>{children}</AuthProviderContent>
    </SessionProvider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
