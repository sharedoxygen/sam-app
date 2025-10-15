import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export const dynamic = 'force-dynamic';

// Create the NextAuth handler
const handler = NextAuth(authOptions);

// Export the API route handlers
export { handler as GET, handler as POST };
