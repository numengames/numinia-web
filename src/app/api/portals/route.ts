import { NextResponse } from 'next/server';
import { fetchData } from '@/lib/github-storage';

export const revalidate = 3600;

export async function GET() {
  try {
    const data = await fetchData('data/portals/numinia-portals.json');
    const response = NextResponse.json(data);
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return response;
  } catch {
    return NextResponse.json({ error: 'Failed to load portals' }, { status: 500 });
  }
}
