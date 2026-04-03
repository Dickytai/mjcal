import { NextRequest, NextResponse } from 'next/server';
import { tilesToHand, RuleSet } from 'mahjong-tile-efficiency';

function tileToIndex(tile: string): number {
  const suit = tile.slice(-1);
  const num = parseInt(tile.slice(0, -1)) - 1;
  const base: Record<string, number> = { m: 0, s: 9, p: 18, z: 27 };
  return (base[suit] || 0) + num;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hand = [], mode = 16, wildcards = {} } = body;

    // Calculate shanten using mahjong-tile-efficiency
    const tileStr = hand
      .filter(t => !t.endsWith('j'))
      .map(t => tileToIndex(t).toString())
      .join('');

    let shanten = 8;
    let waiting: string[] = [];

    try {
      const handObj = tilesToHand(tileStr, RuleSet.RIICHI_MAHJONG);
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