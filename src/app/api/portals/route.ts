import { NextResponse } from 'next/server';
import { fetchData } from '@/lib/github-storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await fetchData('data/portals/numinia-portals.json');
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to load portals' }, { status: 500 });
  }
}
