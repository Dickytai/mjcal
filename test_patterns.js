#!/usr/bin/env node
// 麻将测试脚本 - 17张牌的有效胡牌

const { execSync } = require('child_process');

function testHand(tiles) {
  try {
    const cmd = `curl -s -X POST "http://localhost:5000/calc" -H "Content-Type: application/json" -d '{"hand":${JSON.stringify(tiles)},"mode":16}'`;
    const result = execSync(cmd, { encoding: 'utf8' });
    return JSON.parse(result);
  } catch (e) {
    return { error: e.message };
  }
}

// 17张有效胡牌
function buildHand(pattern) {
  let tiles = [];
  
  switch(pattern) {
    case '清一色':
      // 123456789m + 111m222m + 11m = 17
      tiles = [
        '1m','2m','3m','4m','5m','6m','7m','8m','9m',
        '1m','1m','1m','2m','2m','2m',
        '1m','1m'
      ];
      break;
      
    case '混一色':
      // 123456m + 789m + 111s222s + 11z = 17
      tiles = [
        '1m','2m','3m','4m','5m','6m','7m','8m','9m',
        '1s','1s','1s','2s','2s','2s',
        '1z','1z'
      ];
      break;
      
    case '对对的':
      // 4个刻子+1对+1张 = 4*3+2+1=15? No...
      // 111m222s333p444z + 55z + 6m = 17
      tiles = [
        '1m','1m','1m','2s','2s','2s','3p','3p','3p',
        '4z','4z','4z','5z','5z','6m'
      ];
      break;
      
    case '老少':
      // 123789m + 123s456s + 11z = 14 + 3 = 17
      tiles = [
        '1m','2m','3m','7m','8m','9m',
        '1s','2s','3s','4s','5s','6s',
        '1z','1z','1z'
      ];
      break;
      
    case '一般高':
      // 123123m + 456s789s + 11z = 17
      tiles = [
        '1m','1m','1m','2m','2m','2m','3m','3m','3m',
        '4s','5s','6s','7s','8s','9s',
        '1z','1z'
      ];
      break;
      
    case '一色三步高':
      // 123234345m + 456s + 11z = 17
      tiles = [
        '1m','2m','3m','2m','3m','4m','3m','4m','5m',
        '4s','5s','6s',
        '1z','1z','1z'
      ];
      break;
      
    case '二兄弟':
      // 111m111s + 234p456p + 11z = 17
      tiles = [
        '1m','1m','1m','1s','1s','1s',
        '2p','3p','4p','4p','5p','6p',
        '1z','1z','1z'
      ];
      break;
      
    case '大三兄弟':
      // 111m111s111p + 234m + 99z = 17
      tiles = [
        '1m','1m','1m','1s','1s','1s','1p','1p','1p',
        '2m','3m','4m',
        '9z','9z','1z'
      ];
      break;
      
    case '大三姊妹':
      // 111m222m333m + 456s + 99z = 17
      tiles = [
        '1m','1m','1m','2m','2m','2m','3m','3m','3m',
        '4s','5s','6s',
        '9z','9z','1z'
      ];
      break;
      
    case '二相逢':
      // 123m123s + 456p789p + 11z = 17
      tiles = [
        '1m','2m','3m','1s','2s','3s',
        '4p','5p','6p','7p','8p','9p',
        '1z','1z','1z'
      ];
      break;
      
    case '三相逢':
      // 123m123s123p + 456m + 99z = 17
      tiles = [
        '1m','2m','3m','1s','2s','3s','1p','2p','3p',
        '4m','5m','6m',
        '9z','9z','1z'
      ];
      break;
      
    default:
      return null;
  }
  
  return tiles;
}

// 测试
console.log('=== 17张牌型测试 ===\n');

const patterns = [
  '清一色', '混一色', '对对的', '老少',
  '一般高', '一色三步高',
  '二兄弟', '大三兄弟', '大三姊妹',
  '二相逢', '三相逢'
];

let passed = 0;
let failed = 0;

for (const pattern of patterns) {
  const tiles = buildHand(pattern);
  if (!tiles) {
    console.log(`❌ ${pattern}: Unknown`);
    continue;
  }
  
  const result = testHand(tiles);
  
  if (result.shanten !== -1) {
    console.log(`⚠️  ${pattern}: 不是胡牌 (shanten=${result.shanten})`);
    console.log(`    tiles: ${tiles.join(' ')} (${tiles.length}张)`);
    failed++;
    continue;
  }
  
  const found = (result.winning_breakdown || []).map(p => p.name);
  
  if (found.includes(pattern)) {
    const p = result.winning_breakdown.find(x => x.name === pattern);
    console.log(`✅ ${pattern}: ${p.fan}番`);
    passed++;
  } else {
    console.log(`❌ ${pattern}: 未检测到`);
    console.log(`    实际: ${found.join(', ')}`);
    failed++;
  }
}

console.log(`\n=== ${passed}/${patterns.length} 通过 ===`);
