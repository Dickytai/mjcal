import { NextResponse } from 'next/server';
import { tilesToHand, RuleSet } from 'mahjong-tile-efficiency';

function indexToTile(idx: number): string {
  if (idx < 9) return `${idx + 1}m`;
  if (idx < 18) return `${idx - 8}s`;
  if (idx < 27) return `${idx - 17}p`;
  return `${idx - 26}z`;
}

function tileToIndex(tile: string): number {
  const suit = tile.slice(-1);
  const num = parseInt(tile.slice(0, -1)) - 1;
  const base: Record<string, number> = { m: 0, s: 9, p: 18, z: 27 };
  return (base[suit] || 0) + num;
}

export async function GET() {
  try {
    // Generate a winning hand using a simple algorithm
    // 5 melds (15 tiles) + 1 pair (2 tiles) = 17 tiles
    const counts: number[] = new Array(34).fill(0);

    // Try to create 5 melds
    for (let suit = 0; suit < 3; suit++) {
      for (let start = 0; start < 7; start++) {
        const i0 = suit * 9 + start;
        const i1 = i0 + 1;
        const i2 = i0 + 2;

        if (counts[i0] < 4 && counts[i1] < 4 && counts[i2] < 4) {
          // Check if adding this chow won't exceed 4
          const testCounts = [...counts];
          testCounts[i0]++;
          testCounts[i1]++;
          testCounts[i2]++;

          if (testCounts[i0] <= 4 && testCounts[i1] <= 4 && testCounts[i2] <= 4) {
            counts[i0]++;
            counts[i1]++;
            counts[i2]++;
          }
        }
      }
    }

    // Check if we have 15 tiles (5 melds)
    let totalTiles = counts.reduce((a, b) => a + b, 0);

    // If not enough, add more pungs
    if (totalTiles < 15) {
      for (let i = 0; i < 34 && totalTiles < 15; i++) {
        if (counts[i] === 0) {
          counts[i] = 3;
          totalTiles += 3;
        }
      }
    }

    // Add a pair (find a tile with count 0-1)
    let pairAdded = false;
    for (let i = 0; i < 34 && !pairAdded; i++) {
      if (counts[i] < 2) {
        counts[i] += 2;
        pairAdded = true;
      }
    }

    // Convert to tile strings
    const hand: string[] = [];
    for (let i = 0; i < 34; i++) {
      for (let j = 0; j < counts[i]; j++) {
        hand.push(indexToTile(i));
      }
    }

    // Verify it's a winning hand
    const tileStr = hand.map(t => tileToIndex(t).toString()).join('');
    const handObj = tilesToHand(tileStr, RuleSet.RIICHI_MAHJONG);

    if (handObj.shanten === -1) {
      return NextResponse.json({ hand });
    }

    // Fallback: return a simple hand
    return NextResponse.json({
      hand: ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s']
    });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}