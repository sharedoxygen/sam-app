'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Role } from '@prisma/client'; // Assuming Role enum is correctly resolved

interface RouteGuardProps {
  children: React.ReactNode;
}

const ADMIN_ROUTES = ['/reports', '/settings/users', '/settings/agents'];
const MANAGEMENT_ROUTES = ['/reports']; // Routes that managers (Admin, Leads) can access
const PUBLIC_ROUTES = ['/login']; // Add any other public routes like /register, /forgot-password

export default function RouteGuard({ children }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (isLoading) {
      return; // Wait for authentication status to resolve
    }

    if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
      // If not authenticated and not a public route, redirect to login
      router.push('/login');
      return;
    }

    if (isAuthenticated && user) {
      // User is authenticated, check role-based access
      if (ADMIN_ROUTES.includes(pathname)) {
        if (user.role === Role.ADMIN) {
          setIsAuthorized(true);
        } else {
          // Not authorized for this admin route
          setIsAuthorized(false);
          router.push('/dashboard'); // Or an '/access-denied' page
        }
      } else if (MANAGEMENT_ROUTES.includes(pathname)) {
        if (
          user.role === Role.ADMIN ||
          user.role === Role.SALES_LEAD ||
          user.role === Role.SERVICE_LEAD
        ) {
          // Managers (Admin, Sales Lead, Service Lead) can access these routes
          setIsAuthorized(true);
        } else {
          // Not authorized for this management route
          setIsAuthorized(false);
          router.push('/dashboard');
        }
      } else if (PUBLIC_ROUTES.includes(pathname)) {
        // If authenticated and trying to access a public route like /login, redirect to dashboard
        // This prevents logged-in users from seeing the login page again
        router.push('/dashboard');
        setIsAuthorized(false); // Technically not authorized for login page if already logged in
      } else {
        // Route is not an admin route, and user is authenticated, so authorize
        setIsAuthorized(true);
      }
    } else if (!isAuthenticated && PUBLIC_ROUTES.includes(pathname)) {
      // User is not authenticated but is on a public route (e.g., /login)
      setIsAuthorized(true);
    }
  }, [user, isAuthenticated, isLoading, pathname, router]);

  // Render children only if authorized, otherwise show loading or nothing
  // This prevents flashing of content before redirect
  if (isLoading || (!isAuthorized && isAuthenticated && !PUBLIC_ROUTES.includes(pathname))) {
    // If loading, or if authenticated but not yet authorized for a protected route (waiting for redirect)
    return null; // Or a loading spinner component
  }

  if (isAuthorized) {
    return <>{children}</>;
  }

  return null; // Default to null if no other condition met (e.g. during redirects)
}
