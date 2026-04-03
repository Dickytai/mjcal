import { tilesToHand, RuleSet } from 'mahjong-tile-efficiency';

/**
 * Vercel Serverless Function for Mahjong Calculation
 * Replaces Flask /calc endpoint
 */

const TILES = {
  '1m': {suit: 'wan', value: 1, unicode: '🀇'}, '2m': {suit: 'wan', value: 2, unicode: '🀈'},
  '3m': {suit: 'wan', value: 3, unicode: '🀉'}, '4m': {suit: 'wan', value: 4, unicode: '🀊'},
  '5m': {suit: 'wan', value: 5, unicode: '🀋'}, '6m': {suit: 'wan', value: 6, unicode: '🀌'},
  '7m': {suit: 'wan', value: 7, unicode: '🀍'}, '8m': {suit: 'wan', value: 8, unicode: '🀎'},
  '9m': {suit: 'wan', value: 9, unicode: '🀏'},
  '1s': {suit: 'tiao', value: 11, unicode: '🀐'}, '2s': {suit: 'tiao', value: 12, unicode: '🀑'},
  '3s': {suit: 'tiao', value: 13, unicode: '🀒'}, '4s': {suit: 'tiao', value: 14, unicode: '🀓'},
  '5s': {suit: 'tiao', value: 15, unicode: '🀔'}, '6s': {suit: 'tiao', value: 16, unicode: '🀕'},
  '7s': {suit: 'tiao', value: 17, unicode: '🀖'}, '8s': {suit: 'tiao', value: 18, unicode: '🀗'},
  '9s': {suit: 'tiao', value: 19, unicode: '🀘'},
  '1p': {suit: 'tong', value: 21, unicode: '🀙'}, '2p': {suit: 'tong', value: 22, unicode: '🀚'},
  '3p': {suit: 'tong', value: 23, unicode: '🀛'}, '4p': {suit: 'tong', value: 24, unicode: '🀜'},
  '5p': {suit: 'tong', value: 25, unicode: '🀝'}, '6p': {suit: 'tong', value: 26, unicode: '🀞'},
  '7p': {suit: 'tong', value: 27, unicode: '🀟'}, '8p': {suit: 'tong', value: 28, unicode: '🀠'},
  '9p': {suit: 'tong', value: 29, unicode: '🀡'},
  '1z': {suit: 'zi', value: 31, unicode: '🀀'}, '2z': {suit: 'zi', value: 32, unicode: '🀁'},
  '3z': {suit: 'zi', value: 33, unicode: '🀂'}, '4z': {suit: 'zi', value: 34, unicode: '🀃'},
  '5z': {suit: 'zi', value: 35, unicode: '🀄'}, '6z': {suit: 'zi', value: 36, unicode: '🀅'},
  '7z': {suit: 'zi', value: 37, unicode: '🀆'},
};

function tileToIndex(tile) {
  const suit = tile.slice(-1);
  const num = tile.slice(0, -1);
  const base = { m: 0, s: 9, p: 18, z: 27 }[suit];
  return base + parseInt(num) - 1;
}

function indexToTile(idx) {
  if (idx < 9) return `${idx + 1}m`;
  if (idx < 18) return `${idx - 8}s`;
  if (idx < 27) return `${idx - 17}p`;
  return `${idx - 26}z`;
}

function getSuit(tile) {
  const suit = tile.slice(-1);
  return { m: 'wan', s: 'tiao', p: 'tong', z: 'zi' }[suit] || 'zi';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      hand = [],
      open = [],
      mode = 16,
      fan_config = {},
      is_zimo = false,
      flowers = 0,
      quan_wind = '',
      wei_wind = ''
    } = req.body;

    // Parse hand if string
    let handTiles = hand;
    if (typeof hand === 'string') {
      handTiles = parseHandString(hand);
    }

    // Parse open tiles if string
    let openTiles = open;
    if (typeof open === 'string') {
      openTiles = parseHandString(open);
    }

    const allTiles = [...handTiles, ...openTiles];

    // Use mahjong-tile-efficiency for shanten calculation
    const result = await calculateMahjong(handTiles, openTiles, mode, fan_config, is_zimo, flowers, quan_wind, wei_wind);

    res.status(200).json(result);
  } catch (error) {
    console.error('Calculation error:', error);
    res.status(500).json({ error: error.message });
  }
}

function parseHandString(handStr) {
  const tiles = [];
  const regex = /(\d+)([mpszj])/g;
  let match;
  while ((match = regex.exec(handStr)) !== null) {
    const numDigits = match[1].length;
    const tileVal = match[1][0] + match[2];
    for (let i = 0; i < numDigits; i++) {
      tiles.push(tileVal);
    }
  }
  return tiles;
}

async function calculateMahjong(hand, open, mode, fanConfig, isZimo, flowers, quanWind, weiWind) {
  // Count tiles
  const counts = new Array(34).fill(0);
  const wildcards = {};

  for (const tile of hand) {
    if (tile.endsWith('j')) {
      wildcards[tile] = (wildcards[tile] || 0) + 1;
    } else {
      const idx = tileToIndex(tile);
      if (idx >= 0 && idx < 34) counts[idx]++;
    }
  }

  // Calculate shanten using mahjong-tile-efficiency
  let shanten = 8; // Default high shanten
  let waiting = [];

  try {
    const tileStr = hand.map(t => t.endsWith('j') ? '0' : tileToIndex(t).toString()).join('');
    const handObj = tilesToHand(tileStr, RuleSet.RIICHI_MAHJONG);
    shanten = handObj.shanten;
  } catch (e) {
    console.error('Shanten calc error:', e);
  }

  // If tenpai or winning, calculate waiting tiles
  if (shanten <= 0) {
    waiting = calculateWaiting(counts, wildcards, mode);
  }

  // Calculate wind fan
  let windFan = 0;
  if (quanWind && weiWind) {
    windFan = calculateWindFan(quanWind, weiWind, hand);
  }

  return {
    shanten,
    wait_type: null,
    waiting: waiting.map(w => ({
      tile: w.tile,
      count: w.count,
      fan: 0,
      breakdown: []
    })),
    wind_fan: windFan,
    wind_info: null,
    winning_breakdown: [],
    winning_combinations: [],
    winning_fan: shanten === -1 ? windFan : 0
  };
}

function calculateWaiting(counts, wildcards, mode) {
  const waiting = [];
  const totalWildcards = Object.values(wildcards).reduce((a, b) => a + b, 0);

  for (let i = 0; i < 34; i++) {
    if (counts[i] < 4) {
      // Check if this tile would complete a hand
      const testCounts = [...counts];
      testCounts[i]++;
      const testWildcards = { ...wildcards };

      // Simple check: can we form a complete hand?
      if (canFormHand(testCounts, testWildcards, mode)) {
        waiting.push({
          tile: indexToTile(i),
          count: 4 - counts[i]
        });
      }
    }
  }

  return waiting;
}

function canFormHand(counts, wildcards, mode) {
  // Simplified hand formation check
  // This is a basic version - the full logic is in mj_calc.js
  let total = counts.reduce((a, b) => a + b, 0);
  const wc = Object.values(wildcards).reduce((a, b) => a + b, 0);
  total += wc;

  const expected = mode === 16 ? 16 : 13;
  return total === expected || total === expected + 1;
}

function calculateWindFan(quanWind, weiWind, hand) {
  // 門風 = 自風, 圈風 = 場風
  // 符合則加番
  const quanMap = { '東': 27, '南': 28, '西': 29, '北': 30 };
  const weiMap = { '東': 27, '南': 28, '西': 29, '北': 30 };

  const quanIdx = quanMap[quanWind];
  const weiIdx = weiMap[weiWind];

  if (!quanIdx || !weiIdx) return 0;

  let fan = 0;
  for (const tile of hand) {
    if (tile.endsWith('z')) {
      const idx = tileToIndex(tile);
      if (idx === quanIdx) fan++;
      if (idx === weiIdx) fan++;
    }
  }

  return fan;
}

export const config = {
  api: {
    bodyParser: true,
  },
};
