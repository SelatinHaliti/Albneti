import { NextRequest, NextResponse } from 'next/server';
import { CATEGORIES, searchMusic } from '@/lib/musicApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const category = (searchParams.get('category') || 'shqip').trim().toLowerCase();

    const tracks = await searchMusic(q, category || 'shqip');

    return NextResponse.json({
      tracks,
      categories: CATEGORIES,
      providers: { itunes: true, local: true },
    });
  } catch (err) {
    console.error('[api/music]', err);
    return NextResponse.json(
      {
        tracks: [],
        categories: CATEGORIES,
        providers: { itunes: false, local: false },
        message: 'Nuk u ngarkuan këngët.',
      },
      { status: 200 }
    );
  }
}
