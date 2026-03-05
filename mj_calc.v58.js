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
    
    // 嚦咕嚦咕 = 8對 = 16張 = 胡牌 (shanten=-1)
    // 七對子 = 7對 = 14張 = 胡牌 (shanten=-1)
    // 6對 = 12張 = 聽牌 (shanten=0) - 等1張湊成7對
    
    if (pairs >= 7) return -1;  // 7對或8對 = 胡牌
    
    // 對於其他張數，計算需要既對數
    // 假設目標係7對
    return 7 - pairs;
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
// 支持任意張數
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
    
    // 十六不搭需要至少7字牌 + 3數牌
    if (honorCount < 7) return 999;
    
    // 計算非字牌既數量
    let suitCount = 0;
    for (let i = 0; i < 27; i++) {
        suitCount += counts[i];
    }
    
    // 十六不搭 = 7字牌 + 9數牌 (16張)
    // 如果有岩既數量，設為聽牌
    if (honorCount === 7 && suitCount === 9) {
        return 0; // 聽牌
    } else if (honorCount >= 7 && suitCount >= 9) {
        // 需要既張數
        return 16 - total;
    }
    
    return 999;
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
// 支持任意張數
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
    
    // 計算需要既張數
    // 十三幺需要13孤張 + 額外牌形成set
    // 如果total >= 14，檢查有冇對
    if (total >= 14) {
        // 檢查係咪有1對 (即係已經聽牌)
        let pairs = 0;
        for (const idx of yiIndices) {
            pairs += Math.floor(counts[idx] / 2);
        }
        if (pairs >= 1) return -1; // 胡牌
        if (total >= 15) return 0; // 聽牌，等1張
        return 1; // 差一張先有對
    }
    
    // 13張或以下 = 聽牌或差聽
    // 需要既張數
    return 14 - total;
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
    // 支持任意張數：只需要形成 sets + pair，張數可以唔同
    function* tryRemove(c, setsRemoved, pairsRemoved) {
        // 計算總張數
        const total = c.reduce((a, b) => a + b, 0);
        
        // 成功條件：有1對 + 冇牌剩
        // sets可以係任意數量 (3, 4, 5...)
        if (pairsRemoved === 1 && total === 0) {
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
    // 先計標準麻雀shanten - 支持任意張數
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
            // 支持任意張數：只要張數 >= 13
            let total = 0;
            for (let i = 0; i < 34; i++) total += counts[i];
            
            // 13張或以上先考慮聽牌
            if (total >= 13) {
                shanten = 0; // 聽牌
            } else {
                // 張數太少，設為需要既張數
                shanten = 14 - total; // 需要既張數
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
function identifyPatterns(counts, options = {}) {
    const { flowers = 0, gang = 0, isZimo = false, isHaidi = false, isHeidi = false, isLian = 0, isZhuang = false } = options;
    
    const patterns = {
        // 顏色類
        isQingYiSe: false,   // 清一色
        isHunYiSe: false,    // 混一色
        isZiYiSe: false,     // 字一色
        
        // 門齊類
        isWuMenQi: false,    // 五門齊 (5門)
        isLiuMenQi: false,   // 六門齊 (6門)
        isQiMenQi: false,    // 七門齊 (7門)
        isDaQiMenQi: false, // 大七門齊
        isXiaoQiMenQi: false, // 小七門齊
        isDuanYao: false,   // 斷么
        isQueYiMen: false,   // 缺一門
        
        // 叫牌類型
        waitingType: null,   // 邊張/中洞/對對碰/獨聽
        
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
        
        // 花牌類
        flowerCount: flowers,
        
        // 順子類
        hasYiBanGao: false,   // 一般高 (一組順子數字連續)
        hasLiangBanGao: false, // 兩般高 (兩組順子數字連續)
        hasSanBanGao: false,  // 三般高 (三組順子數字連續)
        hasLaoShao: false,    // 老少 (12/89 順子)
        hasLaoShaoKe: false,  // 老少刻
        hasZaLong: false,     // 雜龍 (3門各一組123/456/789)
        hasQingLong: false,  // 清龍 (同一門123+456+789)
        
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
        
        // 特殊牌型
        isQiDuiZi: false,   // 七對子
        isShiSanYao: false, // 十三幺
        isShiLiuBuDa: false, // 十六不搭
        isQiXingBuKao: false, // 七星不靠
        
        // 其他
        hasGang: 0,         // 槓數
        isMenQianQing: false, // 門前清
        isDuanYao: false,    // 斷么
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
    
    // 字一色: 全部都係字牌 (東南西北中發白)
    if (menCount === 1 && zCount > 0 && mCount === 0 && sCount === 0 && pCount === 0) {
        patterns.isZiYiSe = true;
    }
    
    // 混一色: 一門+字牌
    if (menCount === 2 && mCount > 0 && zCount > 0) patterns.isHunYiSe = true;
    if (menCount === 2 && sCount > 0 && zCount > 0) patterns.isHunYiSe = true;
    if (menCount === 2 && pCount > 0 && zCount > 0) patterns.isHunYiSe = true;
    
    // 注意: 清一色/字一色既唔應該同時有混一色
    if (patterns.isQingYiSe || patterns.isZiYiSe) patterns.isHunYiSe = false;
    
    // 斷么/缺一門
    // 斷么: 冇1/9同埋字牌
    let hasYao = false;
    for (let i = 0; i < 9; i += 8) if (counts[i] > 0) hasYao = true;
    for (let i = 27; i < 34; i++) if (counts[i] > 0) hasYao = true;
    patterns.isDuanYao = !hasYao;
    
    // 缺一門: 某一門冇牌
    patterns.isQueYiMen = (menCount === 3);
    
    // 計算刻子數 - 必須係3張相同既牌，唔包含順子
    // 先移除順子，睇下剩低既牌
    const c = [...counts];
    let ponCount = 0;
    let kanCount = 0;
    
    // 移除順子 - 但只處理count<3既牌 (避免移除triplet)
    // 同時每個位置最多只移除2張 (因為第3張應該留低做刻子)
    for (let i = 0; i < 27; i++) {
        if (counts[i] >= 3) continue; // 呢個位置有triplet，唔移除
        while (c[i] > 0 && c[i+1] > 0 && c[i+2] > 0 && c[i] < 3 && c[i+1] < 3 && c[i+2] < 3) {
            c[i]--;
            c[i+1]--;
            c[i+2]--;
        }
    }
    
    // 計算剩低既刻子
    for (let i = 0; i < 34; i++) {
        if (c[i] >= 4) kanCount++;
        else if (c[i] >= 3) ponCount++;
    }
    
    // 對對胡: 移除順子後，全部都係刻子 (4+ sets)
    if (ponCount + kanCount >= 4) {
        patterns.isDuiDuiHu = true;
        patterns.isSanAnKe = (ponCount + kanCount >= 3);
        patterns.isSiAnKe = (ponCount + kanCount >= 4);
        patterns.isKanKanHu = (ponCount + kanCount >= 5);
        patterns.isWuAnKe = (ponCount + kanCount >= 5);
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
    
    // ===== 順子檢測 =====
    // 檢測順子組合 (不計花色)
    const sequences = [];
    
    // 萬 (0-8)
    for (let i = 0; i < 7; i++) {
        if (counts[i] > 0 && counts[i+1] > 0 && counts[i+2] > 0) {
            sequences.push({ suit: 'm', start: i });
        }
    }
    // 索 (9-17)
    for (let i = 9; i < 16; i++) {
        if (counts[i] > 0 && counts[i+1] > 0 && counts[i+2] > 0) {
            sequences.push({ suit: 's', start: i-9 });
        }
    }
    // 筒 (18-26)
    for (let i = 18; i < 25; i++) {
        if (counts[i] > 0 && counts[i+1] > 0 && counts[i+2] > 0) {
            sequences.push({ suit: 'p', start: i-18 });
        }
    }
    
    // 一般高/兩般高/三般高
    // 檢查有冇連續既sequence
    const seqStarts = sequences.map(s => s.start);
    for (let i = 0; i < seqStarts.length; i++) {
        if (seqStarts.includes(i) && seqStarts.includes(i+1)) patterns.hasYiBanGao = true;
        if (seqStarts.includes(i) && seqStarts.includes(i+1) && seqStarts.includes(i+2)) patterns.hasSanBanGao = true;
    }
    // 兩般高
    let banGaoCount = 0;
    for (let i = 0; i < 7; i++) {
        if (seqStarts.includes(i) && seqStarts.includes(i+1)) banGaoCount++;
    }
    if (banGaoCount >= 2) patterns.hasLiangBanGao = true;
    
    // 老少: 123 或 789 既順子
    if (seqStarts.includes(0) || seqStarts.includes(6)) patterns.hasLaoShao = true;
    
    // 雜龍: 3門各有123/456/789
    let zaLongCount = 0;
    for (const s of sequences) {
        if ([0,3,6].includes(s.start)) zaLongCount++;
    }
    // 雜龍: 3門各有123或456或789 (唔同花色)
    if (zaLongCount >= 3) patterns.hasZaLong = true;
    
    // 清龍: 同一門123+456+789 (需要每個start都有)
    const mSeq = sequences.filter(s => s.suit === 'm').map(s => s.start);
    const sSeq = sequences.filter(s => s.suit === 's').map(s => s.start);
    const pSeq = sequences.filter(s => s.suit === 'p').map(s => s.start);
    
    if ((mSeq.includes(0) && mSeq.includes(3) && mSeq.includes(6)) ||
        (sSeq.includes(0) && sSeq.includes(3) && sSeq.includes(6)) ||
        (pSeq.includes(0) && pSeq.includes(3) && pSeq.includes(6))) {
        patterns.hasQingLong = true;
    }
    
    // ===== 特殊牌型檢測 =====
    
    // 七對子: 7對牌 (14張) 或 8對牌 (16張)
    let pairCount = 0;
    for (let i = 0; i < 34; i++) {
        if (counts[i] >= 2) pairCount += Math.floor(counts[i] / 2);
    }
    if (pairCount >= 7) {
        patterns.isQiDuiZi = true;
    }
    
    // 十三幺: 1,9 萬索筒 + 字牌 (13張) + 任何一張湊對
    const orphans = [0,8, 9,17, 18,26, 27,28,29,30,31,32,33]; // 1,9m/s/p + 字
    let orphanCount = 0;
    for (const idx of orphans) {
        if (counts[idx] > 0) orphanCount++;
    }
    if (orphanCount >= 13) {
        patterns.isShiSanYao = true;
    }
    
    // 十六不搭: 7張字牌 + 3張數牌 (非連續)
    // 呢個比較複雜，需要更強既檢測
    
    // 七星不靠: 7隻字牌 (東南西北中發白)
    let ziCount = 0;
    for (let i = 27; i < 34; i++) {
        if (counts[i] > 0) ziCount++;
    }
    if (ziCount >= 7) {
        patterns.isQiXingBuKao = true;
    }
    
    // ===== 叫牌類型檢測 (適用於聽牌狀態) =====
    patterns.waitingType = detectWaitingType(counts);
    
    return patterns;
}

// 叫牌類型檢測
function detectWaitingType(counts) {
    // 叫牌類型:
    // 邊張 (Penchan): 12 + 3, 89 + 7
    // 中洞 (Kanchan): 24 + 3, 57 + 6
    // 對對碰 (Tankan): 111 + 1 (刻子等第4張)
    // 獨聽 (Toi-toi): 等一對既另一張
    
    // 數牌先detect
    for (let suit = 0; suit < 3; suit++) {
        const base = suit * 9;
        
        // 邊張: 12等3, 89等7
        if (counts[base+0] >= 1 && counts[base+1] >= 1 && counts[base+2] === 0) return '邊張';
        if (counts[base+7] >= 1 && counts[base+8] >= 1 && counts[base+6] === 0) return '邊張';
        
        // 中洞: 24等3, 57等6
        if (counts[base+1] >= 1 && counts[base+3] >= 1 && counts[base+2] === 0) return '中洞';
        if (counts[base+4] >= 1 && counts[base+6] >= 1 && counts[base+5] === 0) return '中洞';
    }
    
    // 對對碰: 任何位置有3張，等第4張
    for (let i = 0; i < 34; i++) {
        if (counts[i] === 3) return '對對碰';
    }
    
    // 獨聽: 等對仔 (得1張)
    for (let i = 0; i < 34; i++) {
        if (counts[i] === 1) return '獨聽';
    }
    
    return null;
}

// 番數計算 function
function calculateFan(patterns, options = {}) {
    const { flowers = 0, gang = 0, isZimo = false, isHaidi = false, isHeidi = false, isLian = 0, isZhuang = false } = options;
    
    let totalFan = 0;
    const breakdown = [];
    
    // 花牌
    if (flowers > 0) {
        // 花牌每款只有一隻，最多8隻
        const actualFlowers = Math.min(flowers, 8);
        totalFan += actualFlowers;
        breakdown.push({ name: `${actualFlowers}花`, fan: actualFlowers });
    }
    
    // 基礎番數
    if (isZimo) {
        totalFan += 1;
        breakdown.push({ name: '自摸', fan: 1 });
    }
    
    if (isHaidi) {
        totalFan += 10;
        breakdown.push({ name: '海底撈月', fan: 10 });
    }
    
    if (isHeidi) {
        totalFan += 20;
        breakdown.push({ name: '河底撈魚', fan: 20 });
    }
    
    // 槓
    if (gang === 1) {
        totalFan += 1;
        breakdown.push({ name: '一槓', fan: 1 });
    } else if (gang === 2) {
        totalFan += 5;
        breakdown.push({ name: '二槓', fan: 5 });
    } else if (gang === 3) {
        totalFan += 15;
        breakdown.push({ name: '三槓', fan: 15 });
    } else if (gang >= 4) {
        totalFan += 30;
        breakdown.push({ name: '四槓', fan: 30 });
    }
    
    // 連莊
    if (isLian > 0) {
        totalFan += 2 * isLian;
        breakdown.push({ name: `連${isLian}`, fan: 2 * isLian });
    }
    
    if (isZhuang) {
        totalFan += 1;
        breakdown.push({ name: '莊', fan: 1 });
    }
    
    // 清一色/混一色/字一色 (互斥)
    let isSpecialYiSe = false;  // 標記：清一色/字一色 independent
    if (patterns.isQingYiSe) {
        totalFan += 30;
        breakdown.push({ name: '清一色', fan: 30 });
    } else if (patterns.isZiYiSe) {
        // 字一色 = 30番 (獨立計算，不疊其他)
        totalFan = 30;
        breakdown.length = 0;
        breakdown.push({ name: '字一色', fan: 30 });
        isSpecialYiSe = true;
    } else if (patterns.isHunYiSe) {
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
    
    // 對對胡類 (清一色/字一色唔疊)
    if (!isSpecialYiSe) {
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
    }
    
    // 三元類
    if (patterns.isDaSanYuan) {
        totalFan += 40;
        breakdown.push({ name: '大三元', fan: 40 });
    } else if (patterns.isXiaoSanYuan) {
        totalFan += 5;
        breakdown.push({ name: '小三元', fan: 5 });
    }
    
    // 順子類 - 般高
    if (patterns.hasSanBanGao) {
        totalFan += 8;
        breakdown.push({ name: '三般高', fan: 8 });
    } else if (patterns.hasLiangBanGao) {
        totalFan += 4;
        breakdown.push({ name: '兩般高', fan: 4 });
    } else if (patterns.hasYiBanGao) {
        totalFan += 2;
        breakdown.push({ name: '一般高', fan: 2 });
    }
    
    // 老少類
    if (patterns.hasLaoShao) {
        totalFan += 5;
        breakdown.push({ name: '老少', fan: 5 });
    }
    
    // 龍類
    if (patterns.hasQingLong) {
        totalFan += 30;
        breakdown.push({ name: '清龍', fan: 30 });
    } else if (patterns.hasZaLong) {
        totalFan += 10;
        breakdown.push({ name: '雜龍', fan: 10 });
    }
    
    // 基礎番數
    // 斷么 (已在上方計算)
    
    // 特殊牌型 (互斥，通常唔會同其他疊)
    // 七對子/十三幺/十六不搭 各自獨立計番
    if (patterns.isQiDuiZi) {
        // 七對子清空其他番數，重新計算
        totalFan = 10;
        breakdown.length = 0;
        breakdown.push({ name: '七對子', fan: 10 });
    } else if (patterns.isShiSanYao) {
        totalFan = 40;
        breakdown.length = 0;
        breakdown.push({ name: '十三幺', fan: 40 });
    } else if (patterns.isQiXingBuKao) {
        totalFan = 10;
        breakdown.length = 0;
        breakdown.push({ name: '七星不靠', fan: 10 });
    }
    
    // 門前清 (呢個需要牌池信息，暫時default)
    // if (patterns.isMenQianQing) { ... }
    
    return { total: totalFan, breakdown };
}

// 添加 fan command - 計算每張聽牌既番數
if (command === 'fan') {
    const tiles = JSON.parse(args[1]);
    // 額外參數: flowers, gang, zimo, haidi, heidi, lian, zhuang
    const options = {
        flowers: parseInt(args[2]) || 0,
        gang: parseInt(args[3]) || 0,
        isZimo: args[4] === '1',
        isHaidi: args[5] === '1',
        isHeidi: args[6] === '1',
        isLian: parseInt(args[7]) || 0,
        isZhuang: args[8] === '1'
    };
    
    const { counts, wildcards } = preprocessTiles(tiles);
    
    // 先搵waiting
    const minShanten = getMinShanten(counts, wildcards);
    const waitingResult = calculateWaiting(counts, wildcards);
    const validWaitingTiles = Object.keys(waitingResult);
    
    // 如果已經聽牌，計算每張waiting既fan
    const results = [];
    
    if (minShanten === 0 || minShanten === -1) {
        // 只測試實際既waiting tiles！
        for (const tile of validWaitingTiles) {
            const tileIdx = TILES.indexOf(tile);
            if (tileIdx === -1 || counts[tileIdx] >= 4) continue;
            
            const testCounts = [...counts];
            testCounts[tileIdx]++;
            
            // 計算fan
            const patterns = identifyPatterns(testCounts, options);
            const fanResult = calculateFan(patterns, options);
            
            results.push({
                tile: tile,
                shanten: 0,
                fan: fanResult.total,
                breakdown: fanResult.breakdown
            });
        }
        
        // 排序：fan既大到小
        results.sort((a, b) => b.fan - a.fan);
    }
    
    console.log(JSON.stringify({
        shanten: minShanten,
        waiting_with_fan: results.slice(0, 20) // 最多20張
    }));
}

// 添加 full command - 完整輸出 (waiting + fan)
if (command === 'full') {
    const tiles = JSON.parse(args[1]);
    const expectedTiles = args[2] ? parseInt(args[2]) : 16;
    const options = {
        flowers: parseInt(args[3]) || 0,
        gang: parseInt(args[4]) || 0,
        isZimo: args[5] === '1',
        isHaidi: args[6] === '1',
        isHeidi: args[7] === '1',
        isLian: parseInt(args[8]) || 0,
        isZhuang: args[9] === '1'
    };
    const { counts, wildcards } = preprocessTiles(tiles);
    
    // Get waiting with shanten calculation
    const minShanten = getMinShanten(counts, wildcards);
    
    const waitingResult = calculateWaiting(counts, wildcards);
    const waiting = Object.keys(waitingResult).map(t => ({
        tile: t,
        count: waitingResult[t]
    }));
    
    // 如果已經聽牌，搵埋fan
    let waitingWithFan = [];
    if (minShanten === 0) {
        for (const w of waiting) {
            const testCounts = [...counts];
            const tileIdx = TILES.indexOf(w.tile);
            testCounts[tileIdx]++;
            
            const patterns = identifyPatterns(testCounts, options);
            const fanResult = calculateFan(patterns, options);
            
            waitingWithFan.push({
                tile: w.tile,
                count: w.count,
                fan: fanResult.total,
                breakdown: fanResult.breakdown
            });
        }
        waitingWithFan.sort((a, b) => b.fan - a.fan);
    }
    
    console.log(JSON.stringify({
        shanten: minShanten,
        waiting: waiting,
        waiting_with_fan: waitingWithFan
    }));
}
