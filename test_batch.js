#!/usr/bin/env node
// 麻将综合测试 - 批量测试并收集结果

const { execSync } = require('child_process');

function idxToTile(idx) {
  const suits = ['m', 's', 'p'];
  const suit = Math.floor(idx / 9);
  const num = idx % 9;
  return (num + 1) + suits[suit];
}

function generateWinningHand16() {
  const counts = new Array(34).fill(0);
  let hand = [];
  
  for (let i = 0; i < 5; i++) {
    const meld = generateMeld(counts);
    hand = hand.concat(meld);
    meld.forEach(idx => counts[idx]++);
  }
  
  const pair = generatePair(counts);
  hand = hand.concat(pair);
  pair.forEach(idx => counts[idx] += 2);
  
  for (let i = hand.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [hand[i], hand[j]] = [hand[j], hand[i]];
  }
  
  return hand.map(idxToTile);
}

function generateMeld(counts) {
  if (Math.random() > 0.4) {
    const chow = findAvailableChow(counts);
    if (chow && chow.length === 3) return chow;
  }
  const pong = findAvailablePong(counts);
  if (pong && pong.length === 3) return pong;
  return [0, 0, 0];
}

function findAvailableChow(counts) {
  const available = [];
  for (let suit = 0; suit < 3; suit++) {
    for (let start = 0; start < 7; start++) {
      const i0 = suit * 9 + start;
      if (counts[i0] < 4 && counts[i0+1] < 4 && counts[i0+2] < 4) {
        available.push([i0, i0+1, i0+2]);
      }
    }
  }
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

function findAvailablePong(counts) {
  const available = [];
  for (let i = 0; i < 34; i++) {
    if (counts[i] < 4) available.push(i);
  }
  if (available.length === 0) return null;
  const idx = available[Math.floor(Math.random() * available.length)];
  return [idx, idx, idx];
}

function generatePair(counts) {
  const available = [];
  for (let i = 0; i < 34; i++) {
    if (counts[i] < 4) available.push(i);
  }
  if (available.length === 0) return [0, 0];
  const idx = available[Math.floor(Math.random() * available.length)];
  return [idx, idx];
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

// 测试并收集结果
console.log('=== 批量测试 ===\n');

const results = {
  清一色: { found: 0, total: 0 },
  混一色: { found: 0, total: 0 },
  老少: { found: 0, total: 0 },
  一般高: { found: 0, total: 0 },
  三般高: { found: 0, total: 0 },
  二兄弟: { found: 0, total: 0 },
  大三兄弟: { found: 0, total: 0 },
  小三兄弟: { found: 0, total: 0 },
  大三姊妹: { found: 0, total: 0 },
  小三姊妹: { found: 0, total: 0 },
  一色三步高: { found: 0, total: 0 },
  二相逢: { found: 0, total: 0 },
  三相逢: { found: 0, total: 0 },
  四同順: { found: 0, total: 0 },
  五同順: { found: 0, total: 0 },
  清龍: { found: 0, total: 0 },
  雜龍: { found: 0, total: 0 },
  十六不搭: { found: 0, total: 0 },
  十三么: { found: 0, total: 0 },
  嚦咕: { found: 0, total: 0 },
  對對胡: { found: 0, total: 0 },
  斷么: { found: 0, total: 0 },
  混么: { found: 0, total: 0 },
  清么: { found: 0, total: 0 },
  無字: { found: 0, total: 0 },
  門清: { found: 0, total: 0 },
  缺一門: { found: 0, total: 0 },
  七對子: { found: 0, total: 0 },
  兩姊妹: { found: 0, total: 0 },
  四暗刻: { found: 0, total: 0 },
};

for (let i = 0; i < 100; i++) {
  const tiles = generateWinningHand16();
  const result = testHand(tiles);
  
  if (result.shanten !== -1) continue;
  
  const patterns = result.winning_breakdown || [];
  const names = patterns.map(p => p.name);
  
  for (const name of names) {
    if (results[name] !== undefined) {
      results[name].found++;
      results[name].total++;
    } else {
      results[name] = { found: 1, total: 1 };
    }
  }
}

console.log('牌型检测统计:');
console.log('================');

const sorted = Object.entries(results)
  .filter(([_, v]) => v.total > 0)
  .sort((a, b) => b[1].found - a[1].found);

for (const [name, data] of sorted) {
  console.log(`${name}: ${data.found} 次`);
}
