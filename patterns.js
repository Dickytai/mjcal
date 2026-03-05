// Pattern detection for Mahjong calculator
// Extracted from mj_calc.js

const MAN_INDICES = Array.from({length: 9}, (_, i) => i);           // 0-8: 1-9m
const SUO_INDICES = Array.from({length: 9}, (_, i) => i + 9);     // 9-17: 1-9s
const TONG_INDICES = Array.from({length: 9}, (_, i) => i + 18);    // 18-26: 1-9p
const FENG_FAN_INDICES = [27, 28, 29, 30, 31, 32, 33];  // 風牌+番

function identifyPatterns(counts, options = {}) {
    const openCounts = options.openCounts || new Array(34).fill(0);
    const handCounts = options.handCounts || counts;
    const wildcards = options.wildcards || 0;
    
    const patterns = {
        isMenQing: false,
        isJiangYan: false,
        isPinfu: false,
        isYiSe: false,
        isYiSeWuBuGaoAn: false,
        isYiSeWuBuGaoMing: false,
        isYiSeErBuGaoAn: false,
        isYiSeErBuGaoMing: false,
        isYiSeSanBuGaoAn: false,
        isYiSeSanBuGaoMing: false,
        isSanSeTongShun: false,
        isSanSeBuBuGaoAn: false,
        isSanSeBuBuGaoMing: false,
        isSanSeErBuGaoAn: false,
        isSanSeErBuGaoMing: false,
        isSanSeSanBuGaoAn: false,
        isSanSeSanBuGaoMing: false,
        isSanSeSiBuGaoAn: false,
        isSanSeSiBuGaoMing: false,
        isSanSeWuBuGaoAn: false,
        isSanSeWuBuGaoMing: false,
        isZaLong: false,
        isBuDaJiang: false,
        isYiSeGuiYi: false,
        isQiXingBuKao: false,
    };
    
    // Generate options for each tile position
    const opts = { counts, openCounts, handCounts, wildcards };
    const allOptions = generateAllOptions(counts, openCounts, handCounts, wildcards);
    
    // Process each option
    for (const opt of allOptions) {
        processPattern(opt, patterns);
    }
    
    return patterns;
}

function generateAllOptions(counts, openCounts, handCounts, wildcards) {
    const options = [{ counts, openCounts, handCounts, wildcards }];
    // Simplified: return single option for now
    return options;
}

function processPattern(options, patterns) {
    const { counts, openCounts, handCounts } = options;
    
    // 門清: no open melds
    let hasOpen = false;
    for (let i = 0; i < 34; i++) {
        if (openCounts[i] > 0) { hasOpen = true; break; }
    }
    if (!hasOpen) patterns.isMenQing = true;
    
    // 一色
    const suitCounts = [
        counts.slice(0, 9).reduce((a, b) => a + b, 0),
        counts.slice(9, 18).reduce((a, b) => a + b, 0),
        counts.slice(18, 27).reduce((a, b) => a + b, 0)
    ];
    const maxSuit = Math.max(...suitCounts);
    if (maxSuit >= 9) patterns.isYiSe = true;
    
    // ... more patterns (abbreviated for now)
    
    patterns.isMenQing = !hasOpen;
}

module.exports = { identifyPatterns, MAN_INDICES, SUO_INDICES, TONG_INDICES, FENG_FAN_INDICES };
