#!/usr/bin/env node
// 麻将测试生成器 - 隨機 + 指定牌型

const { execSync } = require('child_process');

function idxToTile(idx) {
  const suits = ['m', 's', 'p'];
  const suit = Math.floor(idx / 9);
  const num = idx % 9;
  return (num + 1) + suits[suit];
}

function testHand(tiles) {
  try {
    const result = execSync(
      `curl -s -X POST "http://localhost:5000/calc" -H "Content-Type: application/json" -d '{"hand":${JSON.stringify(tiles)},"mode":16}'`,
      { encoding: 'utf8' }
    );
    return JSON.parse(result);
  } catch (e) {
    return { error: e.message };
  }
}

// 構建特定牌型 (17張)
function buildPattern(pattern) {
  const patterns = {
    '清一色': [
      '1m','2m','3m','4m','5m','6m','7m','8m','9m',
      '1m','1m','1m','2m','2m','2m',
      '1m','1m'
    ],
    '混一色': [
      '1m','2m','3m','4m','5m','6m','7m','8m','9m',
      '1s','1s','1s','2s','2s','2s',
      '1z','1z'
    ],
    '對對胡': [
      '1m','1m','1m','2s','2s','2s','3p','3p','3p',
      '4z','4z','4z','5z','5z','6z','7z'
    ],
    '老少': [
      '1m','2m','3m','7m','8m','9m',
      '1s','2s','3s','4s','5s','6s',
      '1z','1z','1z','1z'
    ],
    '一般高': [
      '1m','2m','3m','1m','2m','3m',  // 123123m
      '4s','5s','6s','7s','8s','9s',  // 456789s
      '1z','1z','1z'
    ],
    '一色三步高': [
      '1m','2m','3m','2m','3m','4m','3m','4m','5m', // 123234345m
      '4s','5s','6s',
      '1z','1z','1z','1z'
    ],
    '二兄弟': [
      '1m','1m','1m','1s','1s','1s',  // 111m111s
      '2p','3p','4p','5p','6p','7p',  // 234567p
      '1z','1z','1z','1z'
    ],
    '大三兄弟': [
      '1m','1m','1m','1s','1s','1s','1p','1p','1p', // 111m111s111p
      '2m','3m','4m',
      '9z','9z','1z','1z'
    ],
    '大三姊妹': [
      '1m','1m','1m','2m','2m','2m','3m','3m','3m', // 111222333m
      '4s','5s','6s',
      '9z','9z','1z','1z'
    ],
    '二相逢': [
      '1m','2m','3m','1s','2s','3s',  // 123m123s
      '4p','5p','6p','7p','8p','9p',  // 456789p
      '1z','1z','1z','1z'
    ],
    '三相逢': [
      '1m','2m','3m','1s','2s','3s','1p','2p','3p', // 123m123s123p
      '4m','5m','6m',
      '9z','9z','1z','1z'
    ],
    '清龍': [
      '1m','2m','3m','4m','5m','6m','7m','8m','9m', // 123456789m
      '1s','2s','3s','4s','5s','6s','7s','8s','9s', // 123456789s
      '1z','1z'
    ],
    '雜龍': [
      '1m','2m','3m','4s','5s','6s','7p','8p','9p',
      '1m','1s','1p','2m','2s','2p','3m','3s','3p',
      '1z','1z'
    ],
    '十六不搭': [
      '1m','4m','7m','1s','4s','7s','1p','4p','7p',
      '1z','2z','3z','4z','5z','6z','7z','7z'
    ],
    '十三么': [
      '1m','1s','1p','2m','2s','2p','3m','3s','3p',
      '4z','5z','6z','7z','7z','7z','9m','9m'
    ],
    '嚦咕嚦咕': [
      '1m','1m','2m','2m','3m','3m','4s','4s',
      '5s','5s','6p','6p','7z','7z','8z','8z','9z'
    ],
    '斷么': [
      '2m','3m','4m','5m','6m','7m','8m','9m',
      '2s','3s','4s','5s','6s','7s','2p','3p',
      '1z','1z'
    ],
    '無字': [
      '1m','2m','3m','4m','5m','6m','7m','8m','9m',
      '1s','2s','3s','4s','5s','6s','7s','8s','9s'
    ],
    '門清': [
      '1m','2m','3m','4m','5m','6m','7m','8m','9m',
      '1s','2s','3s','4s','5s','6s','1z','1z'
    ],
    '自摸': [
      '1m','2m','3m','4m','5m','6m','7m','8m','9m',
      '1s','2s','3s','4s','5s','6s','1z','1z'
    ]
  };
  
  return patterns[pattern] || null;
}

// Test all patterns
console.log('=== 牌型檢測測試 ===\n');

const patterns = {
  '清一色': 1, '混一色': 1, '對對胡': 1, '老少': 1,
  '一般高': 1, '一色三步高': 1, '二兄弟': 1, '大三兄弟': 1,
  '大三姊妹': 1, '二相逢': 1, '三相逢': 1, '清龍': 1,
  '雜龍': 1, '十六不搭': 1, '十三么': 1, '嚦咕嚦咕': 1,
  '斷么': 1, '無字': 1, '門清': 1
};

const patternNames = Object.keys(patterns);

let pass = 0;
let fail = 0;

for (const name of patternNames) {
  const tiles = buildPattern(name);
  const result = testHand(tiles);
  
  if (result.shanten !== -1) {
    console.log(`⚠️  ${name}: 非胡牌 (shanten=${result.shanten})`);
    fail++;
    continue;
  }
  
  const found = (result.winning_breakdown || []).map(p => p.name);
  
  if (found.includes(name)) {
    const p = result.winning_breakdown.find(x => x.name === name);
    console.log(`✅ ${name}: ${p?.fan}番`);
    pass++;
  } else {
    console.log(`❌ ${name}: 未檢測到`);
    console.log(`   實際: ${found.join(', ')}`);
    fail++;
  }
}

console.log(`\n=== 結果: ${pass}/${patternNames.length} 通过 ===`);
