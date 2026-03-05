/**
 * Sheauhaw Adapter - mjcal ↔ Sheauhaw 轉換層
 * 
 * mjcal Tile ID: 0-41 (萬0-8, 索9-17, 筒18-26, 風27-30, 三元31-33, 花34-41)
 * Sheauhaw Tile ID: 0-50 (多了百搭 42-50)
 */

const sheauhaw = require('./sheauhaw_dp.js');

// ============================================================
// 常數定義
// ============================================================

// Sheauhaw ID 範圍
const SHEAUHAW_SIZE_UT = 34;  // 數牌+字牌 (0-33)
const SHEAUHAW_SIZE_AT = 51;  // 全部 (0-50)

// mjcal ID 範圍  
const MJCAL_SIZE = 42;  // 數牌+字牌+花牌 (0-41)

// ============================================================
// Tile ID 轉換表
// ============================================================

// mjcal → Sheauhaw
// mjcal: 萬0-8, 索9-17, 筒18-26, 風27-30, 三元31-33, 花34-41
// Sheauhaw: 萬0-8, 筒9-17, 索18-26, 風27-30, 三元31-33, 花34-41
const MJCAL_TO_SHEAUHAW = [
    0,1,2,3,4,5,6,7,8,           // 0-8: 萬 → 0-8
    18,19,20,21,22,23,24,25,26,  // 9-17: 索 → 18-26
    9,10,11,12,13,14,15,16,17,   // 18-26: 筒 → 9-17
    27,28,29,30,                  // 27-30: 東南西北 → 27-30
    31,32,33,                     // 31-33: 中發白 → 31-33
    34,35,36,37,38,39,40,41      // 34-41: 花牌 → 34-41
];

// Sheauhaw → mjcal
const SHEAUHAW_TO_MJCAL = [
    0,1,2,3,4,5,6,7,8,           // 0-8: 萬
    18,19,20,21,22,23,24,25,26,  // 9-17: 筒
    9,10,11,12,13,14,15,16,17,   // 18-26: 索
    27,28,29,30,                  // 27-30: 風
    31,32,33,                     // 31-33: 三元
    34,35,36,37,38,39,40,41      // 34-41: 花
];

// ============================================================
// 百搭轉換
// ============================================================

// mjcal 百搭代碼 → Sheauhaw Joker ID
// mjcal: 1j,2j,3j,4j,5j,6j,7j,8j,9j
// Sheauhaw: 42,43,44,45,46,47,48,49,50
const JOKER_MAP = {
    '1j': 42,  // 皇 - 萬能百搭 JokerC
    '2j': 43,  // 萬 - 萬子百搭 JokerA
    '3j': 44,  // 筒 - 筒子百搭 JokerA
    '4j': 45,  // 索 - 索子百搭 JokerA
    '5j': 46,  // 數牌 - 數牌百搭 JokerB
    '6j': 47,  // 風 - 風牌百搭 JokerA
    '7j': 48,  // 三元 - 三元百搭 JokerA
    '8j': 49,  // 字牌 - 字牌百搭 JokerB
    '9j': 50   // 花 - 花牌百搭 JokerA
};

// Sheauhaw Joker ID → mjcal 百搭代碼
const JOKER_REVERSE = {};
for (const [k, v] of Object.entries(JOKER_MAP)) {
    JOKER_REVERSE[v] = k;
}

// ============================================================
// Sheauhaw Joker 數組 (從源代碼)
// ============================================================

const JokerA = sheauhaw.JokerA;  // 專屬百搭
const JokerB = sheauhaw.JokerB;  // 次級百搭
const JokerC = sheauhaw.JokerC;  // 萬能百搭 (42)

// ============================================================
// 轉換函數
// ============================================================

/**
 * 將 mjcal tiles 轉換為 Sheauhaw 格式
 * 
 * @param {Object} mjcalTiles - mjcal 格式的牌 { "1m": 3, "2m": 1, ... }
 * @param {Object} wildcards - 百搭數量 { "1j": 2, "2j": 1, ... }
 * @returns {Array} Sheauhaw 格式的牌數組 [count0, count1, ..., count50]
 */
function toSheauhawTiles(mjcalTiles, wildcards = {}) {
    const tiles = new Array(SHEAUHAW_SIZE_AT).fill(0);
    
    // 轉換普通牌
    for (const [tile, count] of Object.entries(mjcalTiles)) {
        if (tile.startsWith('F') || tile.startsWith('f')) continue; // 花牌另行處理
        
        const id = tileToSheauhawId(tile);
        if (id !== null && id >= 0 && id < SHEAUHAW_SIZE_UT) {
            tiles[id] = count;
        }
    }
    
    // 轉換百搭
    // Sheauhaw 的百搭系統需要填入 JokerA, JokerB, JokerC 數組
    // 根據不同類型的百搭，填入對應的 joker ID 位置
    
    const jokerCounts = {
        'JokerC': 0,  // 42 - 萬能百搭
        'JokerA': {},  // 43-45,47,48,50 - 專屬百搭
        'JokerB': {}   // 46,49 - 次級百搭
    };
    
    // 統計各類百搭數量
    for (const [code, count] of Object.entries(wildcards)) {
        const jokerId = JOKER_MAP[code];
        if (!jokerId) continue;
        
        if (jokerId === JokerC) {
            jokerCounts['JokerC'] += count;
        } else if (jokerId >= 43 && jokerId <= 45 || jokerId === 47 || jokerId === 48 || jokerId === 50) {
            // JokerA 類型
            jokerCounts['JokerA'][jokerId] = (jokerCounts['JokerA'][jokerId] || 0) + count;
        } else if (jokerId === 46 || jokerId === 49) {
            // JokerB 類型
            jokerCounts['JokerB'][jokerId] = (jokerCounts['JokerB'][jokerId] || 0) + count;
        }
    }
    
    // 填入 Sheauhaw tiles
    // JokerC 填入位置 42
    tiles[JokerC] = jokerCounts['JokerC'];
    
    // JokerA 填入位置 43,44,45,47,48,50
    for (const [id, count] of Object.entries(jokerCounts['JokerA'])) {
        tiles[parseInt(id)] = count;
    }
    
    // JokerB 填入位置 46,49
    for (const [id, count] of Object.entries(jokerCounts['JokerB'])) {
        tiles[parseInt(id)] = count;
    }
    
    return tiles;
}

/**
 * 將 mjcal tile 代碼轉換為 Sheauhaw ID
 */
function tileToSheauhawId(tile) {
    // 花牌
    if (tile.startsWith('F') || tile.startsWith('f')) {
        const flowerMap = {'F1':34,'F2':35,'F3':36,'F4':37,'F5':38,'F6':39,'F7':40,'F8':41};
        return flowerMap[tile] ?? null;
    }
    
    // 普通牌
    const match = tile.match(/^(\d+)([mpszj])$/);
    if (!match) return null;
    
    const num = parseInt(match[1]);
    const suit = match[2];
    
    let id;
    switch (suit) {
        case 'm': id = num - 1; break;        // 萬 0-8
        case 's': id = 18 + (num - 1); break;  // 索 18-26
        case 'p': id = 9 + (num - 1); break;   // 筒 9-17
        case 'z': id = 27 + (num - 1); break;  // 字牌 27-33
        default: return null;
    }
    
    return id >= 0 && id < SHEAUHAW_SIZE_UT ? id : null;
}

/**
 * 將 Sheauhaw tiles 轉換為 mjcal 格式
 */
function toMjcalTiles(sheauhawTiles) {
    const mjcalTiles = {};
    
    for (let i = 0; i < SHEAUHAW_SIZE_UT; i++) {
        if (sheauhawTiles[i] > 0) {
            const mjcalId = SHEAUHAW_TO_MJCAL[i];
            const tile = sheauhawIdToTile(mjcalId);
            mjcalTiles[tile] = sheauhawTiles[i];
        }
    }
    
    return mjcalTiles;
}

/**
 * Sheauhaw ID 轉換為 mjcal tile 代碼
 */
function sheauhawIdToTile(id) {
    if (id >= 34 && id <= 41) {
        return `F${id - 33}`;  // 花牌
    }
    
    const mjcalId = SHEAUHAW_TO_MJCAL[id];
    
    // mjcal: 萬0-8, 索9-17, 筒18-26, 風27-30, 三元31-33
    if (mjcalId >= 0 && mjcalId <= 8) {
        return `${mjcalId + 1}m`;
    } else if (mjcalId >= 9 && mjcalId <= 17) {
        return `${mjcalId - 9 + 1}s`;  // 索
    } else if (mjcalId >= 18 && mjcalId <= 26) {
        return `${mjcalId - 18 + 1}p`;  // 筒
    } else if (mjcalId >= 27 && mjcalId <= 33) {
        return `${mjcalId - 27 + 1}z`;
    }
    
    return null;
}

/**
 * 將 Sheauhaw 聽牌結果轉換為 mjcal 格式
 */
function toMjcalWaiting(sheauhawWaitingIds) {
    return sheauhawWaitingIds.map(id => sheauhawIdToTile(id)).filter(t => t !== null);
}

// ============================================================
// 主API
// ============================================================

/**
 * 計算向聽數 (Sheauhaw Step)
 * 
 * @param {Object} mjcalTiles - mjcal 格式的牌
 * @param {number} tileCount - 牌數 (14, 16 等)
 * @param {Object} wildcards - 百搭數量
 * @returns {number} 向聽數 (-1=胡, 0=聽, 正數=距離)
 */
function calculateStep(mjcalTiles, tileCount, wildcards = {}) {
    const sheauhawTiles = toSheauhawTiles(mjcalTiles, wildcards);
    
    // 計算實際牌數
    let actualCount = 0;
    for (let i = 0; i < SHEAUHAW_SIZE_UT; i++) {
        actualCount += sheauhawTiles[i] || 0;
    }
    
    // === 16張玩法 (mode=17) 特殊處理 ===
    if (tileCount === 17 && actualCount === 16) {
        // 計算對數
        let totalPairs = 0;
        for (let i = 0; i < SHEAUHAW_SIZE_UT; i++) {
            totalPairs += Math.floor(sheauhawTiles[i] / 2);
        }
        
        // 7對+1坎 = 16張 = 聽牌
        // 8對 = 16張 = 聽牌
        if (totalPairs >= 6) {
            return 0;  // 聽牌
        }
    }
    
    // === 17張胡牌：同時計算所有牌型，取最小 ===
    if (tileCount === 17 && actualCount === 17) {
        let results = [];
        
        // 1. 一般型
        const normal = sheauhaw.Step(sheauhawTiles, tileCount);
        results.push({name: '一般型', shanten: normal});
        
        // 2. 七對型
        if (sheauhaw.PairStep) {
            const pairs = sheauhaw.PairStep(sheauhawTiles, false);
            results.push({name: '七對型', shanten: pairs});
        }
        
        // 3. 十六不搭型
        if (sheauhaw.Buda16Step) {
            const buda = sheauhaw.Buda16Step(sheauhawTiles);
            results.push({name: '十六不搭', shanten: buda});
        }
        
        // 4. 二手型
        if (sheauhaw.NiconicoStep) {
            const niconico = sheauhaw.NiconicoStep(sheauhawTiles);
            results.push({name: '二手型', shanten: niconico});
        }
        
        // 取最小shanten
        let minShanten = results[0].shanten;
        for (const r of results) {
            if (r.shanten < minShanten) minShanten = r.shanten;
        }
        
        return minShanten;
    }
    
    // === 標準 Sheauhaw 算法 ===
    return sheauhaw.Step(sheauhawTiles, tileCount);
}

/**
 * 計算聽牌列表 (Sheauhaw Listen)
 * 
 * @param {Object} mjcalTiles - mjcal 格式的牌
 * @param {number} tileCount - 牌數
 * @param {Object} wildcards - 百搭數量
 * @returns {Array} 聽牌列表
 */
function calculateWaiting(mjcalTiles, tileCount, wildcards = {}) {
    const sheauhawTiles = toSheauhawTiles(mjcalTiles, wildcards);
    
    // 檢測牌型
    const step = sheauhaw.Step(sheauhawTiles, tileCount);
    
    // 如果已經胡牌，返回空
    if (step === -1) return [];
    
    // 如果是 LiGu (16張) 牌型，使用特殊邏輯
    if (tileCount === 16 || tileCount === 17) {
        return calculateLiGuWaiting(sheauhawTiles, tileCount);
    }
    
    // 標準 14 張
    const full_tcnt = tileCount % 3 === 1 ? tileCount + 1 : tileCount;
    const waiting = [];
    
    // 食上（tcnt+1 = full_tcnt）
    if (tileCount + 1 === full_tcnt) {
        for (let j = 0; j < SHEAUHAW_SIZE_UT; j++) {
            if (sheauhawTiles[j] >= 4) continue;
            sheauhawTiles[j]++;
            if (sheauhaw.Win(sheauhawTiles, tileCount + 1)) {
                waiting.push(j);
            }
            sheauhawTiles[j]--;
        }
    }
    // 甩牌（tcnt = full_tcnt）
    else if (tileCount === full_tcnt) {
        for (let i = 0; i < SHEAUHAW_SIZE_AT; i++) {
            if (!sheauhawTiles[i]) continue;
            sheauhawTiles[i]--;
            for (let j = 0; j < SHEAUHAW_SIZE_UT; j++) {
                if (i === j) continue;
                if (sheauhawTiles[j] >= 4) continue;
                sheauhawTiles[j]++;
                if (sheauhaw.Win(sheauhawTiles, tileCount)) {
                    waiting.push(j);
                }
                sheauhawTiles[j]--;
            }
            sheauhawTiles[i]++;
        }
    }
    
    return toMjcalWaiting(waiting);
}

/**
 * 計算 16張 LiGu (嚦咕) 聽牌
 */
function calculateLiGuWaiting(sheauhawTiles, tileCount) {
    // LiGu 需要 7 對 (16張) 或 7對+1張 (17張)
    // 計算每種牌型有多少對
    let totalPairs = 0;
    for (let i = 0; i < SHEAUHAW_SIZE_UT; i++) {
        totalPairs += Math.floor(sheauhawTiles[i] / 2);
    }
    
    // 17張：已經有7對就係胡牌
    if (tileCount === 17 && totalPairs >= 7) return [];
    
    // 16張：
    // 8對 = 聽牌 (需要1張變7對+1 pung)
    // 7對+1坎 = 聽牌 (需要1張變8對)
    if (tileCount === 16) {
        // Waiting = 手上已有既牌 (可以形成新既對)
        // 或者可以將一張牌加入湊成對
        const waiting = [];
        for (let j = 0; j < SHEAUHAW_SIZE_UT; j++) {
            // 如果呢張牌已經有 >=1 張，可以形成對
            if (sheauhawTiles[j] >= 1) {
                waiting.push(j);
            }
        }
        return toMjcalWaiting(waiting);
    }
    
    return [];
    
    // 計算可以形成對既牌
    const waiting = [];
    
    // 方法：枚舉每張牌加入後能否形成 7 對
    for (let j = 0; j < SHEAUHAW_SIZE_UT; j++) {
        if (sheauhawTiles[j] >= 4) continue;  // 最多4張
        
        // 嘗試加入呢張牌
        const testTiles = [...sheauhawTiles];
        testTiles[j]++;
        
        // 計算新既對數
        let newPairs = 0;
        for (let i = 0; i < SHEAUHAW_SIZE_UT; i++) {
            const count = testTiles[i] || 0;
            newPairs += Math.floor(count / 2);
        }
        
        if (newPairs >= 7) {
            waiting.push(j);
        }
    }
    
    return toMjcalWaiting(waiting);
}

// ============================================================
// 導出
// ============================================================

module.exports = {
    // 常數
    SHEAUHAW_SIZE_UT,
    SHEAUHAW_SIZE_AT,
    MJCAL_SIZE,
    
    // 轉換函數
    toSheauhawTiles,
    toMjcalTiles,
    toMjcalWaiting,
    tileToSheauhawId,
    sheauhawIdToTile,
    
    // 主API
    calculateStep,
    calculateWaiting,
    
    // Sheauhaw 原始函數
    sheauhaw
};

// ============================================================
// CLI Interface
// ============================================================

if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];
    
    if (command === 'step') {
        const tiles = JSON.parse(args[1]);
        const count = parseInt(args[2]);
        const wildcards = args[3] ? JSON.parse(args[3]) : {};
        console.log(calculateStep(tiles, count, wildcards));
    } else if (command === 'waiting') {
        const tiles = JSON.parse(args[1]);
        const count = parseInt(args[2]);
        const wildcards = args[3] ? JSON.parse(args[3]) : {};
        console.log(JSON.stringify(calculateWaiting(tiles, count, wildcards)));
    } else {
        // Run tests
        console.log('=== Sheauhaw Adapter Test ===\n');
        
        // Test 1: 標準14張胡牌
        console.log('Test 1: 標準14張胡牌 (1112223334455m)');
        const tiles1 = {'1m':3, '2m':3, '3m':3, '4m':3, '5m':2};
        const result1 = calculateStep(tiles1, 14, {});
        console.log('Result:', result1, '(expected: -1)\n');
        
        // Test 2: 16張嚦咕聽牌
        console.log('Test 2: 16張嚦咕聽牌 (1112223334445555m)');
        const tiles2 = {'1m':3, '2m':3, '3m':3, '4m':3, '5m':3, '6m':3};
        const result2 = calculateStep(tiles2, 16, {});
        console.log('Result:', result2, '(expected: 0)\n');
        
        // Test 3: 16張嚦咕胡牌
        console.log('Test 3: 16張嚦咕胡牌 (1112223334445556m)');
        const tiles3 = {'1m':3, '2m':3, '3m':3, '4m':3, '5m':3, '6m':2, '7m':1};
        const result3 = calculateStep(tiles3, 17, {});
        console.log('Result:', result3, '(expected: -1)\n');
        
        // Test 4: 聽牌列表
        console.log('Test 4: 聽牌列表 (1112223334445555m)');
        const waiting4 = calculateWaiting(tiles2, 16, {});
        console.log('Waiting:', waiting4, '\n');
        
        console.log('=== Tests Complete ===');
    }
}
