import { NextResponse } from 'next/server';
import { checkHealth } from './healthService';

export async function GET() {
  const result = await checkHealth();
  const status = result.status === 'healthy' ? 200 : 503;
  return NextResponse.json(result, { status });
}
