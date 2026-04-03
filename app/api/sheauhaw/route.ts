import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore - type declaration bug: exports tilesToHand but .d.ts says tilesTohand
import { tilesToHand } from 'mahjong-tile-efficiency';

function tileToIndex(tile: string): number {
  const suit = tile.slice(-1);
  const num = parseInt(tile.slice(0, -1)) - 1;
  const base: Record<string, number> = { m: 0, s: 9, p: 18, z: 27 };
  return (base[suit] || 0) + num;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hand = [] as string[], mode = 16, wildcards = {} } = body;

    // Calculate shanten using mahjong-tile-efficiency
    const tileStr = (hand as string[])
      .filter((t: string) => !t.endsWith('j'))
      .map((t: string) => tileToIndex(t).toString())
      .join('');

    let shanten = 8;
    let waiting: string[] = [];

    try {
      // @ts-ignore - type declaration bug: exports tilesToHand but .d.ts says tilesTohand
      const handObj = tilesToHand(tileStr);
      shanten = handObj.shanten;

      // Get waiting tiles if tenpai
      if (shanten <= 0) {
        waiting = handObj.waiting || [];
      }
    } catch (e) {
      console.error('Sheauhaw calc error:', e);
    }

    return NextResponse.json({ shanten, waiting, mode });
  } catch (error) {
    console.error('Sheauhaw error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}