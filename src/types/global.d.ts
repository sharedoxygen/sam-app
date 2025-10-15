// Type declarations for global types

// Extend NextAuth session to include custom user fields
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    username: string;
    role: string;
  }
}

// Prisma global declaration for error handling
declare global {
  let prisma: import('@prisma/client').PrismaClient;
}

// Database models
declare namespace Models {
  interface User {
    id: number;
    username: string;
    password: string;
    name: string;
    email?: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }

  interface Activity {
    id: number;
    type: string;
    clientName: string;
    duration: number;
    notes?: string;
    date: Date;
    createdAt: Date;
    updatedAt: Date;
    userId: number;
  }

  interface Task {
    id: number;
    title: string;
    description?: string;
    isCompleted: boolean;
    dueDate?: Date;
    priority: 'high' | 'medium' | 'low';
    createdAt: Date;
    updatedAt: Date;
    userId: number;
  }

  interface Client {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
  }

  interface SalesMetric {
    id: number;
    weekNumber: number;
    year: number;
    calls: number;
    meetings: number;
    followUps: number;
    emails: number;
    sales: number;
    revenue: number;
    date: Date;
    createdAt: Date;
    updatedAt: Date;
  }
}

export {};
