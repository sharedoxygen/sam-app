import CredentialsProvider from 'next-auth/providers/credentials';
import { NextAuthOptions } from 'next-auth';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { isDevelopment } from '@/lib/utils/environment';

// Auth options configuration
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Only show debug logs in development
        const debug = isDevelopment();

        if (debug) console.log('[NextAuth Debug] Authorize function called.');

        if (!credentials?.username || !credentials?.password) {
          if (debug) console.log('[NextAuth Debug] Missing username or password.');
          return null;
        }

        if (debug)
          console.log('[NextAuth Debug] Credentials received:', { username: credentials.username });

        try {
          // Look up the user in the database
          if (debug)
            console.log(
              `[NextAuth Debug] Attempting to find user: ${credentials.username.toLowerCase()}`
            );

          const user = await prisma.user.findUnique({
            where: { username: credentials.username.toLowerCase() }, // Ensure username is compared case-insensitively if needed, or consistently
          });

          // If no user found in database
          if (!user) {
            if (debug)
              console.log(
                `[NextAuth Debug] No user found with username: ${credentials.username.toLowerCase()}`
              );
            return null;
          }

          if (debug)
            console.log('[NextAuth Debug] User found in DB:', {
              id: user.id,
              username: user.username,
              name: user.name,
              role: user.role,
            });

          // Verify password against the database stored hash
          if (debug)
            console.log('[NextAuth Debug] Attempting to compare password for user:', user.username);
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          if (debug) console.log('[NextAuth Debug] Password validation result:', isPasswordValid);

          if (!isPasswordValid) {
            if (debug) console.log(`[NextAuth Debug] Invalid password for user: ${user.username}`);
            return null;
          }

          // Return the user data in the format NextAuth expects
          if (debug)
            console.log('[NextAuth Debug] Credentials valid, returning user object for NextAuth.');
          return {
            id: user.id.toString(), // Prisma ID is Int, NextAuth expects string for user.id in JWT
            name: user.name,
            username: user.username,
            role: user.role,
          };
        } catch (error) {
          if (debug) console.error('[NextAuth Debug] Error in authorize function:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id; // id from authorize is already string
        token.username = user.username; // from authorize
        token.role = user.role; // from authorize
        token.name = user.name; // Add name to token
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
        session.user.name = token.name as string; // Add name to session user object
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
