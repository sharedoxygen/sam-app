import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/clients
 * Get all clients
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const clients = await prisma.client.findMany({
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

/**
 * POST /api/clients
 * Create a new client
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, phone, company, notes } = body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    // Check for duplicate client name
    const existingClient = await prisma.client.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (existingClient) {
      // Return existing client instead of creating duplicate
      return NextResponse.json(existingClient);
    }

    // Check for duplicate email if provided
    if (email) {
      const existingEmail = await prisma.client.findFirst({
        where: { email },
      });

      if (existingEmail) {
        return NextResponse.json(
          { error: 'A client with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Check for duplicate phone if provided
    if (phone) {
      const existingPhone = await prisma.client.findFirst({
        where: { phone },
      });

      if (existingPhone) {
        return NextResponse.json(
          { error: 'A client with this phone number already exists' },
          { status: 409 }
        );
      }
    }

    // Create new client
    const client = await prisma.client.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        company: company?.trim() || null,
        notes: notes?.trim() || null,
        updatedAt: new Date(), // Adding required updatedAt field
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
