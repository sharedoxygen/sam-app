import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const docsPath = path.join(process.cwd(), 'docs-public', 'AGENT_USER_GUIDE.md');
    const content = fs.readFileSync(docsPath, 'utf8');

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error reading user guide:', error);
    return NextResponse.json({ error: 'Failed to load user guide' }, { status: 500 });
  }
}
