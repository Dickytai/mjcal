// Tile types
export const TILES: Record<string, { suit: string; value: number; unicode: string }> = {
  '1m': { suit: 'wan', value: 1, unicode: '🀇' },
  '2m': { suit: 'wan', value: 2, unicode: '🀈' },
  '3m': { suit: 'wan', value: 3, unicode: '🀉' },
  '4m': { suit: 'wan', value: 4, unicode: '🀊' },
  '5m': { suit: 'wan', value: 5, unicode: '🀋' },
  '6m': { suit: 'wan', value: 6, unicode: '🀌' },
  '7m': { suit: 'wan', value: 7, unicode: '🀍' },
  '8m': { suit: 'wan', value: 8, unicode: '🀎' },
  '9m': { suit: 'wan', value: 9, unicode: '🀏' },
  '1s': { suit: 'tiao', value: 11, unicode: '🀐' },
  '2s': { suit: 'tiao', value: 12, unicode: '🀑' },
  '3s': { suit: 'tiao', value: 13, unicode: '🀒' },
  '4s': { suit: 'tiao', value: 14, unicode: '🀓' },
  '5s': { suit: 'tiao', value: 15, unicode: '🀔' },
  '6s': { suit: 'tiao', value: 16, unicode: '🀕' },
  '7s': { suit: 'tiao', value: 17, unicode: '🀖' },
  '8s': { suit: 'tiao', value: 18, unicode: '🀗' },
  '9s': { suit: 'tiao', value: 19, unicode: '🀘' },
  '1p': { suit: 'tong', value: 21, unicode: '🀙' },
  '2p': { suit: 'tong', value: 22, unicode: '🀚' },
  '3p': { suit: 'tong', value: 23, unicode: '🀛' },
  '4p': { suit: 'tong', value: 24, unicode: '🀜' },
  '5p': { suit: 'tong', value: 25, unicode: '🀝' },
  '6p': { suit: 'tong', value: 26, unicode: '🀞' },
  '7p': { suit: 'tong', value: 27, unicode: '🀟' },
  '8p': { suit: 'tong', value: 28, unicode: '🀠' },
  '9p': { suit: 'tong', value: 29, unicode: '🀡' },
  '1z': { suit: 'zi', value: 31, unicode: '🀀' },
  '2z': { suit: 'zi', value: 32, unicode: '🀁' },
  '3z': { suit: 'zi', value: 33, unicode: '🀂' },
  '4z': { suit: 'zi', value: 34, unicode: '🀃' },
  '5z': { suit: 'zi', value: 35, unicode: '🀄' },
  '6z': { suit: 'zi', value: 36, unicode: '🀅' },
  '7z': { suit: 'zi', value: 37, unicode: '🀆' },
};

export const FLOWER_TILES: Record<string, { unicode: string; suit: string }> = {
  '梅': { unicode: '🀢', suit: 'flower' },
  '蘭': { unicode: '🀣', suit: 'flower' },
  '菊': { unicode: '🀤', suit: 'flower' },
  '竹': { unicode: '🀥', suit: 'flower' },
  '春': { unicode: '🀦', suit: 'season' },
  '夏': { unicode: '🀧', suit: 'season' },
  '秋': { unicode: '🀨', suit: 'season' },
  '冬': { unicode: '🀩', suit: 'season' },
};

export const WILDCARDS: Record<string, { name: string; 替代: string; 數量: number; unicode: string; suit: string; code: string }> = {
  '1j': { name: '皇', 替代: '任意牌', 數量: 34, unicode: '🃏', suit: 'wild', code: '1j' },
  '2j': { name: '萬', 替代: '萬子', 數量: 9, unicode: '🀇', suit: 'wild', code: '2j' },
  '3j': { name: '筒', 替代: '任意筒', 數量: 9, unicode: '🀙', suit: 'wild', code: '3j' },
  '4j': { name: '索', 替代: '任意索', 數量: 9, unicode: '🀐', suit: 'wild', code: '4j' },
  '5j': { name: '合', 替代: '數牌', 數量: 27, unicode: '🀐', suit: 'wild', code: '5j' },
  '6j': { name: '風', 替代: '東南西北', 數量: 4, unicode: '🀀', suit: 'wild', code: '6j' },
  '7j': { name: '三元', 替代: '中發白', 數量: 3, unicode: '🀄', suit: 'wild', code: '7j' },
  '8j': { name: '字牌', 替代: '東南西北中發白', 數量: 7, unicode: '🀀', suit: 'wild', code: '8j' },
  '9j': { name: '花', 替代: '春夏秋冬梅蘭菊竹', 數量: 8, unicode: '🀢', suit: 'wild', code: '9j' },
};

export type CalcRequest = {
  hand: string[];
  open?: string[];
  mode?: number;
  is_zimo?: boolean;
  flowers?: number;
  winning_tile?: string;
  quan_wind?: string;
  wei_wind?: string;
  fan_config?: Record<string, number>;
};

export type CalcResponse = {
  shanten: number;
  wait_type?: string;
  waiting: Array<{ tile: string; count: number; fan: number; breakdown: string[] }>;
  wind_fan: number;
  wind_info?: unknown;
  winning_breakdown: Array<{ name: string; fan: number }>;
  winning_combinations: unknown[];
  winning_fan: number;
  error?: string;
};