import { NextRequest, NextResponse } from 'next/server';
import { tilesToHand, RuleSet } from 'mahjong-tile-efficiency';

// Tile index helpers
function tileToIndex(tile: string): number {
  const suit = tile.slice(-1);
  const num = parseInt(tile.slice(0, -1)) - 1;
  const base: Record<string, number> = { m: 0, s: 9, p: 18, z: 27 };
  return (base[suit] || 0) + num;
}

function indexToTile(idx: number): string {
  if (idx < 9) return `${idx + 1}m`;
  if (idx < 18) return `${idx - 8}s`;
  if (idx < 27) return `${idx - 17}p`;
  return `${idx - 26}z`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      hand = [],
      open = [],
      mode = 16,
      is_zimo = false,
      flowers = 0,
      winning_tile = '',
      quan_wind = '',
      wei_wind = ''
    } = body;

    // Count tiles
    const counts: number[] = new Array(34).fill(0);
    const wildcards: Record<string, number> = {};

    for (const tile of hand) {
      if (tile.endsWith('j')) {
        wildcards[tile] = (wildcards[tile] || 0) + 1;
      } else {
        const idx = tileToIndex(tile);
        if (idx >= 0 && idx < 34) counts[idx]++;
      }
    }

    // Use mahjong-tile-efficiency for shanten
    const tileStr = hand
      .filter(t => !t.endsWith('j'))
      .map(t => tileToIndex(t).toString())
      .join('');

    let shanten = 8;
    let waiting: string[] = [];

    try {
      const handObj = tilesToHand(tileStr, RuleSet.RIICHI_MAHJONG);
      shanten = handObj.shanten;
    } catch (e) {
      console.error('Shanten calc error:', e);
    }

    // Calculate waiting tiles if tenpai
    if (shanten <= 0) {
      for (let i = 0; i < 34; i++) {
        if (counts[i] < 4) {
          waiting.push(indexToTile(i));
        }
      }
    }

    // Calculate wind fan
    let windFan = 0;
    if (quan_wind && wei_wind) {
      const quanIdx = tileToIndex(quan_wind + 'z');
      const weiIdx = tileToIndex(wei_wind + 'z');
      for (const tile of hand) {
        if (tile.endsWith('z')) {
          const idx = tileToIndex(tile);
          if (idx === quanIdx) windFan++;
          if (idx === weiIdx) windFan++;
        }
      }
    }

    return NextResponse.json({
      shanten,
      wait_type: shanten === -1 ? '胡牌' : shanten === 0 ? '聽牌' : null,
      waiting: waiting.map(tile => ({
        tile,
        count: 4 - counts[tileToIndex(tile)],
        fan: 0,
        breakdown: []
      })),
      wind_fan: windFan,
      winning_fan: shanten === -1 ? windFan : 0,
      winning_breakdown: [],
      winning_combinations: []
    });
  } catch (error) {
    console.error('Calc error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}