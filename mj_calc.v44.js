#!/usr/bin/env node
/**
 * Mahjong Tile Efficiency Wrapper v06
 * 優化版：支持多款百搭 (皇=任意, 合=筒索萬)
 */

const { tilesToHand, RuleSet } = require('mahjong-tile-efficiency');

const args = process.argv.slice(2);
const command = args[0];

// 34種牌
const TILES = [
    '1m','2m','3m','4m','5m','6m','7m','8m','9m',
    '1s','2s','3s','4s','5s','6s','7s','8s','9s',
    '1p','2p','3p','4p','5p','6p','7p','8p','9p',
    '1z','2z','3z','4z','5z','6z','7z'
];

// 全部既index (0-33)
const ALL_INDICES = [];
for (let i = 0; i < 34; i++) ALL_INDICES.push(i);

const TILE_MAP = {
    '萬': 'm', '索': 's', '筒': 'p',
    '東': '1z', '南': '2z', '西': '3z', '北': '4z',
    '中': '5z', '發': '6z', '白': '7z'
};

// 34種牌既index: 0-8=m, 9-17=s, 18-26=p, 27-33=z
const MAN_INDICES = [];
for (let i = 0; i < 9; i++) MAN_INDICES.push(i);
const SUO_INDICES = [];
for (let i = 9; i < 18; i++) SUO_INDICES.push(i);
const TONG_INDICES = [];
for (let i = 18; i < 27; i++) TONG_INDICES.push(i);
const FENG_INDICES = [27, 28, 29, 30];  // 東南西北
const FAN_INDICES = [31, 32, 33];       // 中發白
const FENG_FAN_INDICES = [27, 28, 29, 30, 31, 32, 33];  // 風牌+番 (7種: 東南西北中發白)
const SUIT_INDICES = [...MAN_INDICES, ...SUO_INDICES, ...TONG_INDICES]; // 筒索萬 (27種)

// 百搭定義：可以變成咩牌
const WILDCARD_TYPES = {
    '皇': { name: '皇', indices: ALL_INDICES },      // 任意牌 (34種)
    '萬': { name: '萬', indices: MAN_INDICES },     // 萬 (9種)
    '筒': { name: '筒', indices: TONG_INDICES },    // 筒 (9種)
    '索': { name: '索', indices: SUO_INDICES },     // 索 (9種)
    '合': { name: '合', indices: SUIT_INDICES },    // 筒索萬 (27種)
    '風': { name: '風', indices: FENG_INDICES },    // 風牌 (4種)
    '番': { name: '番', indices: FENG_FAN_INDICES }, // 風牌+番 (7種)
    '中發白': { name: '中發白', indices: FAN_INDICES } // 中發白 (3種)
};

// 預先轉換所有牌
function preprocessTiles(tiles) {
    const counts = new Array(34).fill(0);
    const wildcards = { '皇': 0, '萬': 0, '筒': 0, '索': 0, '合': 0, '風': 0, '番': 0, '中發白': 0 };
    
    // Map numeric codes to Chinese names
    const jCodeMap = {
        '1j': '皇', '2j': '合', '3j': '萬', '4j': '筒',
        '5j': '索', '6j': '風', '7j': '番', '8j': '中發白'
    };
    
    for (let t of tiles) {
        // Convert 1j, 2j, etc. to Chinese names
        if (jCodeMap[t]) {
            t = jCodeMap[t];
        }
        
        if (WILDCARD_TYPES[t]) {
            wildcards[t]++;
        } else {
            const converted = convertTile(t);
            const idx = TILES.indexOf(converted);
            if (idx >= 0) counts[idx]++;
        }
    }
    
    return { counts, wildcards };
}

function convertTile(tile) {
    for (const [s, l] of Object.entries(TILE_MAP)) {
        if (tile.endsWith(s)) return tile.replace(s, '') + l;
    }
    return tile;
}

// Multiset分配：支持多款百搭
function* generateDistributions(counts, wildcards) {
    const totalWildcards = Object.values(wildcards).reduce((a, b) => a + b, 0);
    if (totalWildcards === 0) {
        yield counts;
        return;
    }
    
    // 將百搭轉為數組，每個百搭有自己既可用indices
    let wildcardList = [];
    const wildcardKeys = ['皇', '萬', '筒', '索', '合', '風', '番', '中發白'];
    for (const key of wildcardKeys) {
        for (let i = 0; i < wildcards[key]; i++) {
            wildcardList.push(WILDCARD_TYPES[key].indices);
        }
    }
    
    // 遞迴分配
    function* distribute(wildcardIdx, current) {
        if (wildcardIdx >= wildcardList.length) {
            yield [...current];
            return;
        }
        
        const allowed = wildcardList[wildcardIdx];
        // 呢個百搭可以選擇既牌
        for (const idx of allowed) {
            if (current[idx] < 4) {
                current[idx]++;
                yield* distribute(wildcardIdx + 1, current);
                current[idx]--;
            }
        }
    }
    
    yield* distribute(0, [...counts]);
}

// 計算七對子shanten
function sevenPairsShanten(counts) {
    let pairs = 0;
    for (let i = 0; i < 34; i++) {
        pairs += Math.floor(counts[i] / 2);
    }
    
    // 計算總牌數
    let total = 0;
    for (let i = 0; i < 34; i++) {
        total += counts[i];
    }
    
    // 16張牌 (8對) = 聽牌 (shanten=0) - 等任何一張變7對+1坎
    // 14張牌 (7對) = 胡牌 (shanten=-1)
    // 12張牌 (6對) = 差1對 (shanten=1)
    // ...
    if (total === 16 && pairs >= 8) return 0;  // 8對 = 聽牌
    if (pairs >= 7) return -1;  // 7對 = 胡牌
    if (pairs === 6) return 0;  // 6對 = 聽牌
    return 7 - pairs;  // 需要既對數
}

// 計算七對子既waiting
function sevenPairsWaiting(counts) {
    const waitingMap = {};
    for (let i = 0; i < 34; i++) {
        const currentCount = counts[i];
        // 如果呢張牌已經有1張或以上，可以加上去湊成對 (變成7對+1坎)
        if (currentCount >= 1 && currentCount < 4) {
            waitingMap[TILES[i]] = 4 - currentCount;
        }
    }
    return waitingMap;
}

// 計算十六不搭shanten
// 16不搭: 7字牌 + 3款唔岩連既牌 (如147, 258, 369)
// 16張牌 = 聽牌 (shanten=0)
function sixteenNoConnectShanten(counts) {
    // 檢查是否有7隻字牌 (東南西北中發白)
    let honorCount = 0;
    for (let i = 27; i < 34; i++) {
        honorCount += counts[i];
    }
    
    // 計算總牌數
    let total = 0;
    for (let i = 0; i < 34; i++) {
        total += counts[i];
    }
    
    // 16不搭需要16張牌：7字牌 + 9隻牌(每門3隻)
    if (total !== 16) return 999;
    if (honorCount !== 7) return 999;
    
    // 檢查剩低9隻牌既分布 (萬/筒/索)
    // 每門必須各3隻
    let suitCounts = [0, 0, 0]; // m, s, p
    for (let i = 0; i < 9; i++) suitCounts[0] += counts[i];      // 萬
    for (let i = 9; i < 18; i++) suitCounts[1] += counts[i];     // 索
    for (let i = 18; i < 27; i++) suitCounts[2] += counts[i];    // 筒
    
    if (suitCounts[0] !== 3 || suitCounts[1] !== 3 || suitCounts[2] !== 3) {
        return 999;
    }
    
    // 檢查每門既牌係唔係唔岩連 (147, 258, 369, etc.)
    // 牌既index: 0-8 (m), 9-17 (s), 18-26 (p)
    for (let suit = 0; suit < 3; suit++) {
        const base = suit * 9;
        const present = [];
        for (let i = 0; i < 9; i++) {
            if (counts[base + i] > 0) present.push(i);
        }
        
        // 必須岩岩好3隻
        if (present.length !== 3) return 999;
        
        // 檢查呢3隻牌係唔係唔可以連
        // 可以連既組合: (0,1,2), (1,2,3), ..., (6,7,8) 即差值為1
        // 或者 (0,2,4), (1,3,5) 等 - 呢啲其實可以變成 (0,1,2), (2,3,4) etc.
        
        // 簡單既檢查：如果任何兩隻既差係1或2，就可能構成順子
        // 十六不搭既3隻牌必須全部差>=3
        let canFormSequence = false;
        for (let a = 0; a < present.length; a++) {
            for (let b = a + 1; b < present.length; b++) {
                const diff = Math.abs(present[a] - present[b]);
                if (diff === 1 || diff === 2) {
                    canFormSequence = true;
                    break;
                }
            }
        }
        
        if (canFormSequence) return 999;
    }
    
    // 16不搭 = 聽牌 (shanten=0)
    return 0;
}

// 計算十六不搭既waiting
// 16不搭聽牌既時候，等任何一張可以湊成對既牌
function sixteenNoConnectWaiting(counts) {
    const waitingMap = {};
    
    // 16不搭聽牌時，等任何一張可以加入形成對既牌
    for (let i = 0; i < 34; i++) {
        const currentCount = counts[i];
        // 如果呢張牌已經有1張或以上，可以加上去湊成對
        if (currentCount >= 1 && currentCount < 4) {
            waitingMap[TILES[i]] = 4 - currentCount;
        }
    }
    return waitingMap;
}

// 計算十三幺shanten
// 13幺: 13孤張 (1m,9m, 1s,9s, 1p,9p, 東南西北中發白)
// 13張mode: 13孤張 + 1對 = 14張胡牌
// 16張mode: 13孤張 + 3張(set) = 17張胡牌
function thirteenYiShanten(counts) {
    // 13款幺九牌
    const yiTiles = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33]; // 1m,9m,1s,9s,1p,9p,1z-7z
    
    // 計算有幾款幺九牌
    let yiCount = 0;
    let yiIndices = [];
    for (const idx of yiTiles) {
        if (counts[idx] > 0) {
            yiCount++;
            yiIndices.push(idx);
        }
    }
    
    // 計算總牌數
    let total = 0;
    for (let i = 0; i < 34; i++) total += counts[i];
    
    // 需要7款字牌 + 6款數牌幺九 = 13款
    // 檢查有冇7款字牌
    let honorCount = 0;
    for (let i = 27; i < 34; i++) {
        if (counts[i] > 0) honorCount++;
    }
    
    // 檢查有冇6款數牌幺九 (1同9 from each suit)
    let numberYiCount = 0;
    if (counts[0] > 0) numberYiCount++; // 1m
    if (counts[8] > 0) numberYiCount++; // 9m
    if (counts[9] > 0) numberYiCount++; // 1s
    if (counts[17] > 0) numberYiCount++; // 9s
    if (counts[18] > 0) numberYiCount++; // 1p
    if (counts[26] > 0) numberYiCount++; // 9p
    
    // 必須有曬13款幺九牌
    if (honorCount !== 7 || numberYiCount !== 6) {
        return 999;
    }
    
    // 13張mode: 13孤張 + 1對 = 14張 = 聽牌 (shanten=0)
    // 加多1張 = 15張 -> 可以選擇第14張做對 -> 胡牌
    if (total === 14) {
        // 檢查係咪有1對 (即係已經聽牌)
        let pairs = 0;
        for (const idx of yiIndices) {
            pairs += Math.floor(counts[idx] / 2);
        }
        if (pairs >= 1) return 0; // 聽牌，等第15張胡牌
        return 1; // 差一張先有對
    }
    
    // 13張mode: 13孤張 (冇對) = 聽牌 (shanten=0)
    // 等1張湊對 -> 14張 -> 13孤張+1對 = 聽牌
    if (total === 13) {
        return 0; // 聽牌
    }
    
    // 16張mode: 17張胡牌 (13孤張 + 3張set) - 暫時當16張都係聽牌
    if (total === 16) {
        return 0; // 聽牌
    }
    
    return 999;
}

// 計算十三幺既waiting
function thirteenYiWaiting(counts) {
    const waitingMap = {};
    
    // 計算總牌數
    let total = 0;
    for (let i = 0; i < 34; i++) total += counts[i];
    
    // 13款幺九牌
    const yiTileIndices = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33]; // 1m,9m,1s,9s,1p,9p,1z-7z
    
    // 16張mode: 搵出邊3張牌形成set
    const tilesInSet = new Set();
    
    if (total === 16) {
        // 搵出有>=2既牌 (呢啲一定係set一部分)
        for (let i = 0; i < 34; i++) {
            if (counts[i] >= 2) {
                tilesInSet.add(i);
            }
        }
        
        // 如果set仲未有3隻，試下搵sequence
        if (tilesInSet.size < 3) {
            // 搵sequence: 如果有 i, i+1, i+2 各有>=1 既牌
            for (let i = 0; i < 25 && tilesInSet.size < 3; i++) { // m,s,p only
                if (counts[i] >= 1 && counts[i+1] >= 1 && counts[i+2] >= 1) {
                    tilesInSet.add(i);
                    tilesInSet.add(i+1);
                    tilesInSet.add(i+2);
                    break;
                }
            }
        }
        
        // 如果set仲未有3隻，咁就排除有既
        if (tilesInSet.size < 3) {
            // 排除出現>=2既牌
            for (let i = 0; i < 34 && tilesInSet.size < 3; i++) {
                if (counts[i] >= 2) tilesInSet.add(i);
            }
        }
    }
    
    // 十三幺聽牌時，等任何一張可以加入形成對既牌
    // 但要排除已經形成set既牌
    for (let i = 0; i < 34; i++) {
        // 如果呢隻牌已經形成set，唔可以再做對
        if (tilesInSet.has(i)) continue;
        
        const currentCount = counts[i];
        // 如果呢張牌已經有1張或以上，可以加上去湊成對
        if (currentCount >= 1 && currentCount < 4) {
            waitingMap[TILES[i]] = 4 - currentCount;
        }
    }
    return waitingMap;
}

// 檢查牌型是否岩胡牌 (5 sets + 1 pair = 17張)
// 使用遞迴嘗試所有可能性
function isValidWinningHand(counts) {
    // Helper function to check if remaining tiles can form valid hand
    function* tryRemove(c, setsRemoved, pairsRemoved) {
        // 如果已經移除了 5 sets + 1 pair = 成功！
        if (setsRemoved === 5 && pairsRemoved === 1) {
            yield true;
            return;
        }
        
        // 嘗試移除刻子 (3 same tiles)
        for (let i = 0; i < 34; i++) {
            if (c[i] >= 3) {
                c[i] -= 3;
                yield* tryRemove(c, setsRemoved + 1, pairsRemoved);
                c[i] += 3;
            }
        }
        
        // 嘗試移除順子 (sequences) - 只需嘗試數牌
        for (let i = 0; i < 27; i++) {
            if (c[i] > 0 && c[i+1] > 0 && c[i+2] > 0) {
                c[i]--; c[i+1]--; c[i+2]--;
                yield* tryRemove(c, setsRemoved + 1, pairsRemoved);
                c[i]++; c[i+1]++; c[i+2]++;
            }
        }
        
        // 嘗試移除對子 (pair) - 只需要1對
        if (pairsRemoved === 0) {
            for (let i = 0; i < 34; i++) {
                if (c[i] >= 2) {
                    c[i] -= 2;
                    yield* tryRemove(c, setsRemoved, pairsRemoved + 1);
                    c[i] += 2;
                }
            }
        }
    }
    
    // 遞迴檢查
    const c = [...counts];
    for (const _ of tryRemove(c, 0, 0)) {
        return true;  // 如果有任何一個 path 成功，就係 valid
    }
    return false;
}

// 計算shanten (快速版)
function quickShanten(counts) {
    // 先計標準麻雀shanten
    try {
        // 轉為tiles array
        const tiles = [];
        for (let i = 0; i < 34; i++) {
            for (let j = 0; j < counts[i]; j++) {
                tiles.push(TILES[i]);
            }
        }
        
        const hand = tilesToHand(tiles);
        const rule = new RuleSet('Taiwan');
        let shanten = rule.calShanten(hand);
        
        // 如果library話已經胡牌(-1)，但實際牌型唔岩，就改為0(聽牌)
        if (shanten === -1 && !isValidWinningHand(counts)) {
            // 檢查係咪已經聽牌 (差1張)
            // 16張牌：4 sets + 2 pairs
            let total = 0;
            for (let i = 0; i < 34; i++) total += counts[i];
            
            if (total === 16 || total === 14) {
                shanten = 0; // 聽牌
            }
        }
        
        return shanten;
    } catch (e) {
        return 999;
    }
}

// 計算ukeire (完整版)
function calcUkeire(counts) {
    try {
        const tiles = [];
        for (let i = 0; i < 34; i++) {
            for (let j = 0; j < counts[i]; j++) {
                tiles.push(TILES[i]);
            }
        }
        
        const hand = tilesToHand(tiles);
        const rule = new RuleSet('Taiwan');
        return rule.calUkeire(hand);
    } catch (e) {
        return null;
    }
}

// 計算某distribution既min shanten (快速版，用generateDistributions)
function getMinShanten(counts, wildcards) {
    const totalWildcards = Object.values(wildcards).reduce((a, b) => a + b, 0);
    
    // 標準麻雀shanten
    let minS = 999;
    if (totalWildcards === 0) {
        minS = quickShanten(counts);
    } else {
        for (const c of generateDistributions(counts, wildcards)) {
            const s = quickShanten(c);
            if (s < minS) {
                minS = s;
                if (minS === -1) break;
            }
        }
    }
    
    // 七對子shanten (取兩者最小)
    const spS = sevenPairsShanten(counts);
    
    // 十六不搭shanten
    const sncS = sixteenNoConnectShanten(counts);
    
    // 十三幺shanten
    const tyS = thirteenYiShanten(counts);
    
    // 返回較好既結果
    return Math.min(minS, spS, sncS, tyS);
}

// 測試加入一張牌後既min shanten (優化使用皇)
function testWaitingTile(baseCounts, baseWildcards, testTileIdx) {
    const testCounts = [...baseCounts];
    testCounts[testTileIdx]++;
    // 牌數變成17張，但皇既數量唔變
    
    return getMinShanten(testCounts, baseWildcards);
}

// 完整既waiting計算：考慮晒所有可能性
function calculateWaiting(counts, wildcards) {
    const waitingMap = {};
    const minShanten = getMinShanten(counts, wildcards);
    const spShanten = sevenPairsShanten(counts);
    const sncShanten = sixteenNoConnectShanten(counts);
    const tyShanten = thirteenYiShanten(counts);
    
    // 如果七對子shanten更好 (strictly less)，用七對子既waiting
    if (spShanten < minShanten && spShanten <= sncShanten && spShanten <= tyShanten) {
        // 如果七對子已經聽牌 (6對)，返回可以成對既牌
        if (spShanten === 0) {
            return sevenPairsWaiting(counts);
        }
        // 如果已經胡牌 (7+對)，無waiting
        return {};
    }
    
    // 如果十六不搭shanten更好或相同，用十六不搭既waiting
    if (sncShanten === 0 && sncShanten <= minShanten && sncShanten <= tyShanten) {
        return sixteenNoConnectWaiting(counts);
    }
    
    // 如果十三幺shanten更好或相同，用十三幺既waiting
    if (tyShanten === 0 && tyShanten <= minShanten && tyShanten <= spShanten && tyShanten <= sncShanten) {
        return thirteenYiWaiting(counts);
    }
    
    // 標準麻雀waiting logic
    // 如果已經聽牌 (shanten=0)，搵可以completing既牌 (shanten=-1)
    if (minShanten === 0) {
        // 如果有wildcards，需要確保有至少一個transformation可以胡牌
        const totalWildcards = Object.values(wildcards).reduce((a, b) => a + b, 0);
        
        for (let i = 0; i < 34; i++) {
            const currentCount = counts[i];
            if (currentCount >= 4) continue;
            
            const testCounts = [...counts];
            testCounts[i]++;
            
            // 如果有wildcards，需要檢查所有transformation
            let canWin = false;
            
            if (totalWildcards > 0) {
                // 檢查每一個transformation
                for (const dist of generateDistributions(testCounts, wildcards)) {
                    const testS = quickShanten(dist);
                    if (testS === -1 && isValidWinningHand(dist)) {
                        canWin = true;
                        break;
                    }
                }
            } else {
                // 冇wildcards，直接check
                const testS = quickShanten(testCounts);
                if (testS === -1 && isValidWinningHand(testCounts)) {
                    canWin = true;
                }
            }
            
            if (!canWin) continue;
            
            const tile = TILES[i];
            const maxCount = 4 - currentCount;
            waitingMap[tile] = maxCount;
        }
    }
    // 如果未聽牌 (shanten > 0)，搵可以tenpai既牌 (shanten=0)
    else if (minShanten > 0) {
        for (let i = 0; i < 34; i++) {
            const currentCount = counts[i];
            if (currentCount >= 4) continue;
            
            const testCounts = [...counts];
            testCounts[i]++;
            
            const minS = getMinShanten(testCounts, wildcards);
            
            // 如果 minS = 0 代表tenpai (聽牌)
            if (minS === 0) {
                const tile = TILES[i];
                const maxCount = 4 - currentCount;
                waitingMap[tile] = maxCount;
            }
        }
    }
    
    return waitingMap;
}

if (command === 'waiting') {
    const tiles = JSON.parse(args[1]);
    const expectedTiles = args[2] ? parseInt(args[2]) : 16;  // Default to 16
    const { counts, wildcards } = preprocessTiles(tiles);
    
    // 檢查牌數 (放寬到1-17張，單吊都得)
    const total = tiles.length;
    if (total < 1 || total > 17) {
        console.log(JSON.stringify({
            shanten: -1,
            waiting: [],
            error: `牌數需1-17張，目前有${total}張`
        }));
        process.exit(0);
    }
    
    // 過多百搭直接報錯
    const totalWildcards = Object.values(wildcards).reduce((a, b) => a + b, 0);
    if (totalWildcards > 5) {
        console.log(JSON.stringify({
            shanten: -1,
            waiting: [],
            error: `百搭數量過多(${totalWildcards}隻)，無法計算`
        }));
        process.exit(0);
    }
    
    // 找最小shanten
    let minShanten = getMinShanten(counts, wildcards);
    const spShanten = sevenPairsShanten(counts);
    const sncShanten = sixteenNoConnectShanten(counts);
    const tyShanten = thirteenYiShanten(counts);
    
    // 如果七對子shanten更好，用七對子既結果
    if (spShanten < minShanten) {
        minShanten = spShanten;
    }
    // 如果十六不搭shanten更好，用十六不搭既結果
    if (sncShanten < minShanten) {
        minShanten = sncShanten;
    }
    // 如果十三幺shanten更好，用十三幺既結果
    if (tyShanten < minShanten) {
        minShanten = tyShanten;
    }
    
    // 如果已經聽牌(shanten=0)，用之前既邏輯
    if (minShanten === 0) {
        // 用新既方法：測試加入邊張牌可以completes
        const waitingMap = calculateWaiting(counts, wildcards);
        const waiting = Object.keys(waitingMap).map(t => ({
            tile: t,
            count: waitingMap[t]
        }));
        
        console.log(JSON.stringify({ shanten: 0, waiting }));
        process.exit(0);
    }
    
    // 如果未聽牌(shanten > 0)，用逐張測試既方法
    // 測試加入邊張牌可以令shanten變為0
    const waitingMap = {};
    
    for (let i = 0; i < 34; i++) {
        // 檢查呢張牌既可用數量
        const currentCount = counts[i];
        if (currentCount >= 4) continue; // 最多4張
        
        const newShanten = testWaitingTile(counts, wildcards, i);
        
        // 如果加入呢張牌可以讓shanten變為0 (即聽牌)
        if (newShanten === 0) {
            const tile = TILES[i];
            const maxCount = 4 - currentCount;
            waitingMap[tile] = maxCount;
        }
    }
    
    const waiting = Object.keys(waitingMap).map(t => ({
        tile: t,
        count: waitingMap[t]
    }));
    
    console.log(JSON.stringify({ shanten: minShanten, waiting }));
}

// ========== 番數計算系統 ==========

// 牌型識別 function
function identifyPatterns(counts) {
    const patterns = {
        // 顏色類
        isQingYiSe: false,   // 清一色
        isHunYiSe: false,    // 混一色
        
        // 門齊類
        isWuMenQi: false,    // 五門齊 (5門)
        isLiuMenQi: false,   // 六門齊 (6門)
        isQiMenQi: false,    // 七門齊 (7門)
        isDaQiMenQi: false, // 大七門齊
        isXiaoQiMenQi: false, // 小七門齊
        isDuanYao: false,   // 斷么
        isQueYiMen: false,   // 缺一門
        
        // 刻子類
        isDuiDuiHu: false,  // 對對胡
        isSanAnKe: false,    // 三暗刻
        isSiAnKe: false,    // 四暗刻
        isKanKanHu: false,   // 坎坎胡
        isWuAnKe: false,     // 五暗刻
        
        // 三元類
        isDaSanYuan: false, // 大三元
        isXiaoSanYuan: false, // 小三元
        
        // 風牌類
        hasFengKe: false,   // 有風牌刻子
        
        // 順子類
        hasYiBanGao: false, // 一般高
        hasLiangBanGao: false, // 兩般高
        hasSanBanGao: false, // 三般高
        hasLaoShao: false,  // 老少
        hasLaoShaoKe: false, // 老少刻
        hasZaLong: false,   // 雜龍
        hasQingLong: false, // 清龍
        
        // 叫牌類
        waitingType: null,  // 邊張/中洞/獨聽/對對碰
        
        // 其他
        hasGang: 0,         // 槓數
    };
    
    // 統計各門既牌數
    let menCount = 0;
    let mCount = 0, sCount = 0, pCount = 0, zCount = 0;
    
    // 萬 (0-8)
    for (let i = 0; i < 9; i++) if (counts[i] > 0) mCount++;
    // 索 (9-17)
    for (let i = 9; i < 18; i++) if (counts[i] > 0) sCount++;
    // 筒 (18-26)
    for (let i = 18; i < 27; i++) if (counts[i] > 0) pCount++;
    // 字 (27-33)
    for (let i = 27; i < 34; i++) if (counts[i] > 0) zCount++;
    
    if (mCount > 0) menCount++;
    if (sCount > 0) menCount++;
    if (pCount > 0) menCount++;
    if (zCount > 0) menCount++;
    
    // 門齊判斷
    patterns.isWuMenQi = (menCount === 5);
    patterns.isLiuMenQi = (menCount === 6);
    patterns.isQiMenQi = (menCount === 7);
    patterns.isDaQiMenQi = (menCount === 7 && mCount > 0 && sCount > 0 && pCount > 0 && zCount >= 4);
    patterns.isXiaoQiMenQi = (menCount === 7 && mCount > 0 && sCount > 0 && pCount > 0 && zCount >= 2 && zCount <= 3);
    
    // 清一色: 只有一門 (萬/索/筒)，全部牌同一門
    if (menCount === 1 && mCount > 0) patterns.isQingYiSe = true;
    if (menCount === 1 && sCount > 0) patterns.isQingYiSe = true;
    if (menCount === 1 && pCount > 0) patterns.isQingYiSe = true;
    
    // 混一色: 一門+字牌
    if (menCount === 2 && mCount > 0 && zCount > 0) patterns.isHunYiSe = true;
    if (menCount === 2 && sCount > 0 && zCount > 0) patterns.isHunYiSe = true;
    if (menCount === 2 && pCount > 0 && zCount > 0) patterns.isHunYiSe = true;
    
    // 注意: 清一色既唔應該同時有混一色
    if (patterns.isQingYiSe) patterns.isHunYiSe = false;
    
    // 斷么/缺一門
    // 斷么: 冇1/9同埋字牌
    let hasYao = false;
    for (let i = 0; i < 9; i += 8) if (counts[i] > 0) hasYao = true;
    for (let i = 27; i < 34; i++) if (counts[i] > 0) hasYao = true;
    patterns.isDuanYao = !hasYao;
    
    // 缺一門: 某一門冇牌
    patterns.isQueYiMen = (menCount === 3);
    
    // 計算刻子數
    let ponCount = 0;
    let kanCount = 0;
    for (let i = 0; i < 34; i++) {
        if (counts[i] >= 4) kanCount++; // 槓都算刻子
        else if (counts[i] >= 3) ponCount++;
    }
    
    // 對對胡: 全部都係刻子 (4 sets)
    if (ponCount + kanCount >= 4) {
        patterns.isDuiDuiHu = true;
        patterns.isSanAnKe = (ponCount >= 3);
        patterns.isSiAnKe = (ponCount >= 4);
        patterns.isKanKanHu = (ponCount >= 5);
        patterns.isWuAnKe = (ponCount >= 5);
    }
    
    // 三元牌刻子
    let zhongCount = counts[31]; // 中
    let faCount = counts[32];    // 發
    let baiCount = counts[33];   // 白
    
    if (zhongCount >= 3 && faCount >= 3 && baiCount >= 3) {
        patterns.isDaSanYuan = true;
    }
    if ((zhongCount >= 3 && faCount >= 3) || 
        (zhongCount >= 3 && baiCount >= 3) || 
        (faCount >= 3 && baiCount >= 3)) {
        patterns.isXiaoSanYuan = true;
    }
    
    // 風牌刻子
    for (let i = 27; i < 31; i++) {
        if (counts[i] >= 3) patterns.hasFengKe = true;
    }
    
    return patterns;
}

// 番數計算 function
function calculateFan(patterns) {
    let totalFan = 0;
    const breakdown = [];
    
    // 清一色/混一色
    if (patterns.isQingYiSe) {
        totalFan += 30;
        breakdown.push({ name: '清一色', fan: 30 });
    }
    if (patterns.isHunYiSe) {
        totalFan += 10;
        breakdown.push({ name: '混一色', fan: 10 });
    }
    
    // 門齊類
    if (patterns.isQiMenQi) {
        totalFan += 15;
        breakdown.push({ name: '七門齊', fan: 15 });
    }
    if (patterns.isDaQiMenQi) {
        totalFan += 20;
        breakdown.push({ name: '大七門齊', fan: 20 });
    }
    if (patterns.isXiaoQiMenQi) {
        totalFan += 15;
        breakdown.push({ name: '小七門齊', fan: 15 });
    }
    if (patterns.isWuMenQi) {
        totalFan += 5;
        breakdown.push({ name: '五門齊', fan: 5 });
    }
    if (patterns.isDuanYao) {
        totalFan += 5;
        breakdown.push({ name: '斷么', fan: 5 });
    }
    if (patterns.isQueYiMen) {
        totalFan += 5;
        breakdown.push({ name: '缺一門', fan: 5 });
    }
    
    // 對對胡類
    if (patterns.isKanKanHu) {
        totalFan += 100;
        breakdown.push({ name: '坎坎胡', fan: 100 });
    } else if (patterns.isSiAnKe) {
        totalFan += 30;
        breakdown.push({ name: '四暗刻', fan: 30 });
    } else if (patterns.isSanAnKe) {
        totalFan += 5;
        breakdown.push({ name: '三暗刻', fan: 5 });
    } else if (patterns.isDuiDuiHu) {
        totalFan += 5;
        breakdown.push({ name: '對對胡', fan: 5 });
    }
    
    // 三元類
    if (patterns.isDaSanYuan) {
        totalFan += 40;
        breakdown.push({ name: '大三元', fan: 40 });
    } else if (patterns.isXiaoSanYuan) {
        totalFan += 5;
        breakdown.push({ name: '小三元', fan: 5 });
    }
    
    return { total: totalFan, breakdown };
}

// 添加 fan command
if (command === 'fan') {
    const tiles = JSON.parse(args[1]);
    const { counts, wildcards } = preprocessTiles(tiles);
    
    // 假設手牌已經聽牌，加一張牌變成胡牌
    // 呢個係簡化版本，真正既應該要test每張waiting
    
    const patterns = identifyPatterns(counts);
    const fanResult = calculateFan(patterns);
    
    console.log(JSON.stringify(fanResult));
}
