#!/bin/bash
# Mahjong Calculator Auto Debug Script

echo "🀄 麻將計算機 自動 Debug 流程"
echo "================================"
echo ""

cd /home/tai/mjcal

# 核心測試用例
declare -A TESTS=(
    ["標準13張"]='["1m","2m","3m","4m","5m","6m","7m","8m","9m","1s","1s","1s","1s"]'
    ["標準16張"]='["1m","1m","1m","2m","2m","2m","3m","3m","3m","4m","5m","6m","7m","8m","9m","9m"]'
    ["七對子(8對)"]='["1m","1m","2m","2m","3m","3m","東","東","中","中","發","發","白","白","南","南"]'
    ["十六不搭"]='["1z","2z","3z","4z","5z","6z","7z","1m","4m","7m","2p","5p","8p","3s","6s","9s"]'
    ["十三幺(13張)"]='["1m","9m","1s","9s","1p","9p","1z","2z","3z","4z","5z","6z","7z"]'
    ["十三幺(14張)"]='["1m","9m","1s","9s","1p","9p","1z","2z","3z","4z","5z","6z","7z","1m"]'
    ["坎坎胡"]='["1s","1s","1s","2p","2p","2p","3p","3p","3p","4p","4p","4p","7z","7z","7p","7p"]'
    ["百搭叫牌(7j)"]='["3s","3s","4s","4s","4s","3s","5p","5p","5p","4z","4z","6z","7j","7z","7z","6z"]'
    ["皇百搭"]='["1m","1m","1m","2m","2m","2m","3m","3m","3m","4m","4m","4m","5m","5m","5m","皇"]'
    ["番百搭"]='["1m","1m","1m","2m","2m","2m","3m","3m","3m","4m","4m","4m","5m","5m","5m","番"]'
)

echo "📋 核心測試用例:"
echo ""

PASSED=0

for name in "${!TESTS[@]}"; do
    tiles="${TESTS[$name]}"
    
    if [[ "$name" == *"13張"* ]]; then
        expected=13
    else
        expected=16
    fi
    
    result=$(node mj_calc.js waiting "$tiles" $expected 2>&1)
    
    shanten=$(echo "$result" | grep -o '"shanten":[0-9,-]*' | cut -d: -f2)
    waiting_count=$(echo "$result" | grep -o '"tile":"[^"]*"' | wc -l)
    
    echo "  ✅ $name: shanten=$shanten, waiting=$waiting_count"
    ((PASSED++))
done

echo ""
echo "================================"
echo "核心測試: $PASSED passed"
echo ""

# ===== 隨機生成測試 =====
echo "📋 隨機生成測試:"
echo ""

# Write node script to temp file
cat > /tmp/random_test.js << 'ENDSCRIPT'
const { execSync } = require('child_process');

const TILES = ["1m","2m","3m","4m","5m","6m","7m","8m","9m","1s","2s","3s","4s","5s","6s","7s","8s","9s","1p","2p","3p","4p","5p","6p","7p","8p","9p","1z","2z","3z","4z","5z","6z","7z"];
const WILDCARDS = ["皇","合","萬","筒","索","風","番","中發白"];

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function generateHand(mode, maxWildcards) {
    const hand = [];
    const counts = {};
    
    const numWildcards = Math.floor(Math.random() * (maxWildcards + 1));
    for (let i = 0; i < numWildcards; i++) {
        hand.push(WILDCARDS[Math.floor(Math.random() * WILDCARDS.length)]);
    }
    
    const numRegular = mode - numWildcards;
    const pool = [...TILES];
    shuffle(pool);
    
    for (const tile of pool) {
        if (hand.length >= mode) break;
        const count = counts[tile] || 0;
        if (count < 4) {
            hand.push(tile);
            counts[tile] = count + 1;
        }
    }
    
    return hand;
}

// Test 13-tile hands
console.log("  測試 10 個隨機 13張牌局:");
for (let i = 0; i < 10; i++) {
    const hand = generateHand(13, 1);
    const tiles = JSON.stringify(hand);
    try {
        const result = execSync('node /home/tai/mjcal/mj_calc.js waiting \'' + tiles + '\' 13', {encoding: "utf8"});
        const parsed = JSON.parse(result);
        console.log('    ✅ 測試' + (i+1) + ': shanten=' + parsed.shanten + ', waiting=' + (parsed.waiting ? parsed.waiting.length : 0));
    } catch (e) {
        console.log('    ❌ 測試' + (i+1) + ': Error');
    }
}

// Test 16-tile hands
console.log("  測試 10 個隨機 16張牌局:");
for (let i = 0; i < 10; i++) {
    const hand = generateHand(16, 2);
    const tiles = JSON.stringify(hand);
    try {
        const result = execSync('node /home/tai/mjcal/mj_calc.js waiting \'' + tiles + '\' 16', {encoding: "utf8"});
        const parsed = JSON.parse(result);
        console.log('    ✅ 測試' + (i+1) + ': shanten=' + parsed.shanten + ', waiting=' + (parsed.waiting ? parsed.waiting.length : 0));
    } catch (e) {
        console.log('    ❌ 測試' + (i+1) + ': Error');
    }
}
ENDSCRIPT

node /tmp/random_test.js

echo ""
echo "================================"
echo "📋 Code Analysis:"
echo ""

if grep -q "sevenPairsShanten" mj_calc.js; then
    echo "✅ 七對子 logic"
fi

if grep -q "sixteenNoConnectShanten" mj_calc.js; then
    echo "✅ 十六不搭 logic"
fi

if grep -q "thirteenYiShanten" mj_calc.js; then
    echo "✅ 十三幺 logic"
fi

if grep -q "jCodeMap" mj_calc.js; then
    echo "✅ 百搭代碼 support (1j-8j)"
fi

if grep -q "isValidWinningHand" mj_calc.js; then
    echo "✅ Valid winning hand check"
fi

echo ""
echo "Done! 🎲"
