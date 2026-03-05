#!/usr/bin/env node
// 麻将随机测试脚本 - Generate random winning hands and test patterns

const { execSync } = require('child_process');

const FLASK_URL = 'http://localhost:5000/calc';

// Generate a random winning hand
function generateWinningHand(mode = 16) {
  const tiles = [];
  const counts = new Array(34).fill(0);
  
  // Strategy: Create 4 sets + 1 pair
  // Randomly choose: pong (3 same), chow (123), or pair (2 same)
  
  const numSets = mode === 16 ? 4 : 3; // 16-tile: 4 sets, 13-tile: 3 sets
  const numPairs = 1;
  
  for (let i = 0; i < numSets; i++) {
    const type = Math.floor(Math.random() * 3); // 0=pong, 1=chow, 2=pair
    
    if (type === 0) {
      // Pong - 3 same tiles
      const suit = Math.floor(Math.random() * 3);
      const num = Math.floor(Math.random() * 9);
      const idx = suit * 9 + num;
      tiles.push(numToTile(num, suit), numToTile(num, suit), numToTile(num, suit));
      counts[idx] += 3;
    } else if (type === 1) {
      // Chow - 123 sequence
      const suit = Math.floor(Math.random() * 3);
      const start = Math.floor(Math.random() * 7); // 0-6
      for (let d = 0; d < 3; d++) {
        const idx = suit * 9 + start + d;
        tiles.push(numToTile(start + d, suit));
        counts[idx]++;
      }
    } else {
      // Pair - will be converted to pong later if needed
      const suit = Math.floor(Math.random() * 3);
      const num = Math.floor(Math.random() * 9);
      const idx = suit * 9 + num;
      tiles.push(numToTile(num, suit), numToTile(num, suit));
      counts[idx] += 2;
    }
  }
  
  // Add pair
  let pairSuit, pairNum, pairIdx;
  do {
    pairSuit = Math.floor(Math.random() * 3);
    pairNum = Math.floor(Math.random() * 9);
    pairIdx = pairSuit * 9 + pairNum;
  } while (counts[pairIdx] >= 4); // Don't use tiles that already have 4
  
  tiles.push(numToTile(pairNum, pairSuit), numToTile(pairNum, pairSuit));
  counts[pairIdx] += 2;
  
  // Add wildcards/tiles to reach 17 (16-tile mode) or 14 (13-tile mode)
  const targetTiles = mode === 16 ? 17 : 14;
  while (tiles.length < targetTiles) {
    const suit = Math.floor(Math.random() * 3);
    const num = Math.floor(Math.random() * 9);
    tiles.push(numToTile(num, suit));
  }
  
  return tiles;
}

function numToTile(num, suit) {
  const suits = ['m', 's', 'p'];
  return (num + 1) + suits[suit];
}

function callAPI(tiles, mode = 16) {
  try {
    const result = execSync(`curl -s -X POST "${FLASK_URL}" -H "Content-Type: application/json" -d '{"hand":${JSON.stringify(tiles)},"mode":${mode}}'`, { encoding: 'utf8' });
    return JSON.parse(result);
  } catch (e) {
    return { error: e.message };
  }
}

function testRandomHand(iterations = 10) {
  console.log(`=== 随机生成 ${iterations} 个胡牌测试 ===\n`);
  
  for (let i = 0; i < iterations; i++) {
    const tiles = generateWinningHand(16);
    const result = callAPI(tiles, 16);
    
    if (result.shanten !== -1) {
      console.log(`❌ #${i+1}: 不是胡牌 (shanten=${result.shanten})`);
      continue;
    }
    
    const patterns = result.winning_breakdown || [];
    const totalFan = result.winning_fan || 0;
    const patternNames = patterns.map(p => p.name).join(', ');
    
    console.log(`#${i+1}: ${tiles.join(' ')}`);
    console.log(`   番数: ${totalFan}, 牌型: ${patternNames || '无特殊牌型'}`);
    console.log();
  }
}

// Generate specific pattern hands for testing
function generateHandWithPattern(pattern) {
  const tiles = [];
  
  switch(pattern) {
    case '一般高':
      // 123123m + 456s + 789s + 11z
      tiles.push('1m','1m','1m','2m','2m','2m','3m','3m','3m');
      tiles.push('4s','5s','6s','7s','8s','9s','1z','1z');
      break;
      
    case '二兄弟':
      // 111m111s + 234p + 789p + 11z
      tiles.push('1m','1m','1m','1s','1s','1s','2p','3p','4p','7p','8p','9p','1z','1z');
      break;
      
    case '大三兄弟':
      // 111m111s111p + 234m + 99z
      tiles.push('1m','1m','1m','1s','1s','1s','1p','1p','1p','2m','3m','4m','9z','9z');
      break;
      
    case '大三姊妹':
      // 111m222m333m + 456s + 99z
      tiles.push('1m','1m','1m','2m','2m','2m','3m','3m','3m','4s','5s','6s','9z','9z');
      break;
      
    case '一色三步高':
      // 123234345m + 456s + 99z
      tiles.push('1m','2m','3m','2m','3m','4m','3m','4m','5m','4s','5s','6s','9z','9z');
      break;
      
    case '老少':
      // 123789m + 123s + 456s + 11z
      tiles.push('1m','2m','3m','7m','8m','9m','1s','2s','3s','4s','5s','6s','1z','1z');
      break;
      
    case '清么九':
      // 全1/9
      tiles.push('1m','1m','1m','9m','9m','9m','1s','1s','1s','9s','9s','9s','1p','1p','1p','9p','9p','9p');
      break;
      
    case '混么九':
      // 1/9 + 字牌
      tiles.push('1m','1m','1m','9m','9m','9m','1s','1s','1s','9s','9s','9s','1z','2z','3z','4z','5z','6z');
      break;
      
    case '二相逢':
      // 123m123s + 456p + 789p + 11z
      tiles.push('1m','2m','3m','1s','2s','3s','4p','5p','6p','7p','8p','9p','1z','1z');
      break;
      
    case '三相逢':
      // 123m123s123p + 456m + 99z
      tiles.push('1m','2m','3m','1s','2s','3s','1p','2p','3p','4m','5m','6m','9z','9z');
      break;
      
    case '十三么':
      tiles.push('1m','1s','1p','2m','2s','2p','3m','3s','3p','4z','5z','6z','7z','7z','7z','9m','9m','9m');
      break;
      
    case '嚦咕':
      // 8对子
      tiles.push('1m','1m','2m','2m','3m','3m','4s','4s','5s','5s','6p','6p','7z','7z','8z','8z','9z','9z');
      break;
      
    case '清一色':
      tiles.push('1m','1m','1m','2m','2m','2m','3m','3m','3m','4m','5m','6m','7m','8m','9m','9m');
      break;
      
    case '混一色':
      tiles.push('1m','1m','1m','2m','2m','2m','3m','3m','3m','1z','2z','3z','4z','5z','6z','7z');
      break;
      
    default:
      return null;
  }
  
  return tiles;
}

function testSpecificPatterns() {
  console.log('=== 测试特定牌型 ===\n');
  
  const patterns = [
    '一般高', '二兄弟', '大三兄弟', '大三姊妹',
    '一色三步高', '老少', '清么九', '混么九',
    '二相逢', '三相逢', '十三么', '嚦咕',
    '清一色', '混一色'
  ];
  
  for (const pattern of patterns) {
    const tiles = generateHandWithPattern(pattern);
    if (!tiles) {
      console.log(`❌ ${pattern}: Unknown pattern`);
      continue;
    }
    
    const result = callAPI(tiles, 16);
    
    if (result.shanten !== -1) {
      console.log(`⚠️ ${pattern}: 不是胡牌 (shanten=${result.shanten}), tiles: ${tiles.join(' ')}`);
      continue;
    }
    
    const found = result.winning_breakdown || [];
    const foundNames = found.map(p => p.name);
    
    if (foundNames.includes(pattern)) {
      const p = found.find(p => p.name === pattern);
      console.log(`✅ ${pattern}: ${p.fan}番 (期望: ${getExpectedFan(pattern)})`);
    } else {
      console.log(`❌ ${pattern}: 未检测到! 实际牌型: ${foundNames.join(', ')}`);
    }
  }
}

function getExpectedFan(pattern) {
  const fans = {
    '一般高': 3,
    '二兄弟': 3,
    '大三兄弟': 15,
    '大三姊妹': 15,
    '一色三步高': 10,
    '老少': 2,
    '清么九': 80,
    '混么九': 30,
    '二相逢': 2,
    '三相逢': 10,
    '十三么': 80,
    '嚦咕': 40,
    '清一色': 80,
    '混一色': 30
  };
  return fans[pattern] || '?';
}

// Main
const args = process.argv.slice(2);
if (args[0] === 'random') {
  testRandomHand(parseInt(args[1]) || 10);
} else {
  testSpecificPatterns();
}
