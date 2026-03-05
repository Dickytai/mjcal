# Sheauhaw 算法整合計劃

## 概述

目標：將 Sheauhaw (v4.8.6) 既 DP 算法整合到 mjcal，取代現有既向聽數計算邏輯。

---

## 第一階段：理解現有架構

### Sheauhaw 核心結構

| 組件 | 功能 | 位置 |
|------|------|------|
| `NAME_TO_ID` | 牌符 → ID mapping | mahjong.js:1-22 |
| `id()` | 解析輸入字符串 | mahjong.js:41-98 |
| `JokerA/B/C` | 百搭優先級數組 | mahjong.js:177-179 |
| `prepareStep()` | 壓縮座標初始化 | mahjong.js:188-208 |
| `kernelStep()` | 7維 DP 核心 | mahjong.js:224-285 |
| `searchDp()` | DP 搜索入口 | mahjong.js:308-345 |
| `Win()` | 胡牌檢測 | mahjong.js:346-363 |
| `Listen()` | 聽牌檢測 | mahjong.js:361-379 |
| `Step()` | 向聽數主函數 | mahjong.js:390-396 |
| `PairStep()` | 7對向聽數 | mahjong.js:408-476 |

---

## 第二階段：數據結構 mapping

### Tile ID 系統對比

| 牌種 | mjcal | Sheauhaw |
|------|-------|----------|
| 萬子 1-9 | 0-8 | 0-8 |
| 筒子 1-9 | 18-26 | 9-17 |
| 索子 1-9 | 9-17 | 18-26 |
| 風牌 | 27-30 | 27-30 |
| 三元 | 31-33 | 31-33 |
| 花牌 | 34-41 | 34-41 |
| 百搭 1j | 自訂 | 42 |
| 百搭 2j-9j | 自訂 | 43-50 |

### 百搭系統 mapping

```
mjcal          Sheauhaw    ID
─────────────────────────────────
1j (皇)    →   JokerC     42
2j (萬)    →   JokerA     43
3j (筒)    →   JokerA     44
4j (索)    →   JokerA     45
5j (數牌)  →   JokerB     46
6j (風)    →   JokerA     47
7j (三元)  →   JokerA     48
8j (字牌)  →   JokerB     49
9j (花)    →   JokerA     50
```

---

## 第三階段：整合步驟

### Step 1: 建立轉接層 (Adapter)

建立 `sheauhaw_adapter.js`：

```javascript
// 1. Tile ID 轉換
// mjcal (0-41) → Sheauhaw (0-50)
const MJCAL_TO_SHEAUHAW = [0,1,2,3,4,5,6,7,8,  // 0-8: 萬
                           18,19,20,21,22,23,24,25,26,  // 9-17: 索→筒
                           9,10,11,12,13,14,15,16,17,  // 18-26: 筒→索
                           27,28,29,30,  // 風
                           31,32,33,  // 三元
                           34,35,36,37,38,39,40,41]; // 花

// 2. 百搭轉換
// mjcal: 1j-9j → Sheauhaw: 42-50
function convertWildcards(mjcalWildcards) {
    // 1j→42, 2j→43, 3j→44, 4j→45, 5j→46, 6j→47, 7j→48, 8j→49, 9j→50
}
```

### Step 2: 修改 mahjong_flask.py

```python
# 新增 Sheauhaw 調用
def calc_with_sheauhaw(tiles, wildcards, mode):
    # 1. 轉換 tiles 到 Sheauhaw 格式
    sheauhaw_tiles = convert_from_mjcal(tiles, wildcards)
    
    # 2. 調用 Sheauhaw Step 函數
    result = call_sheauhaw_step(sheauhaw_tiles, mode)
    
    # 3. 轉換結果回 mjcal 格式
    return convert_to_mjcal_result(result)
```

### Step 3: 處理百搭 Logic

根據 Sheauhaw 既 Joker 系統：

```javascript
// JokerA: 專屬百搭 (每隻牌有唔同既 JokerA)
// JokerB: 次級百搭 (限制較少)
// JokerC: 萬能百搭 (任意牌)

const JokerA = [43,43,43,...]  // 每個位置對應既百搭ID
const JokerB = [46,46,46,...]
const JokerC = 42  // 萬能百搭
```

需要實現：
1. 根據 mjcal 既百搭 (1j-9j)，填入對應既 JokerA/B/C 數量
2. 調用 `searchDp()` 時傳入正確既 `guse` 參數

### Step 4: 處理 16張/17張 Logic

```javascript
// Sheauhaw 自動處理
Step(tiles, tcnt)  // tcnt=16 → full_tcnt=17
Step(tiles, tcnt)  // tcnt=14 → full_tcnt=14

// 需要設定既參數：
// - tcnt: 當前牌數 (14/16)
// - full_tcnt: 完整牌數 (14/17)
// - glmt: 百搭限制 (default Infinity)
```

### Step 5: 實現 Listen (聽牌) 功能

```javascript
// Sheauhaw Listen 返回 boolean
// 需要擴展返回聽牌既具體牌

function GetWaiting(tiles, tcnt) {
    let waiting = [];
    for (let j = 0; j < sizeUT; j++) {
        if (tiles[j] >= glmt) continue;
        tiles[j]++;
        if (Win(tiles, tcnt+1, glmt)) {
            waiting.push(j);
        }
        tiles[j]--;
    }
    return waiting;
}
```

---

## 第四階段：測試計劃

### Test Cases

| 測試 | 輸入 | 期望輸出 |
|------|------|----------|
| 標準14張胡 | 11122233344556m | shanten=-1 |
| 標準14張聽 | 1112223334455m | shanten=0, wait=[6m] |
| 16張嚦咕聽 | 1112223334445555m | shanten=0, wait=[2,3,4,6m] |
| 16張嚦咕胡 | 1112223334445556m | shanten=-1 |
| 7對聽 | 11223344556677m | shanten=0 |
| 有百搭 | 111222m + 1j x2 | shanten=0 |

---

## 第五階段：替換現有代碼

### 目標函數替換

| 現有 mjcal 函數 | 替換為 Sheauhaw |
|----------------|-----------------|
| `calculateLiGuShanten()` | `PairStep()` |
| `calculateLiGuWaiting()` | `Listen()` + 擴展 |
| `getMinShanten()` | `Step()` |
| `calculateStandardWaiting()` | `Listen()` |

---

## 預計工作量

| 階段 | 工作內容 | 時間 |
|------|----------|------|
| 1 | 理解架構 + 數據mapping | 1小時 |
| 2 | 建立 Adapter 轉換層 | 2小時 |
| 3 | 整合 Step/Listen/Win | 3小時 |
| 4 | 處理百搭 Edge Cases | 2小時 |
| 5 | 測試 + Debug | 3小時 |
| **合計** | | **~11小時** |

---

## 風險與對策

| 風險 | 影響 | 對策 |
|------|------|------|
| 百搭 mapping 錯誤 | 計算結果錯 | 大量 Test Cases 驗證 |
| 16張/17張 切換問題 | 聽牌錯 | 確認 tcnt/full_tcnt 邏輯 |
| 性能問題 | 回應慢 | Sheauhaw 已優化，應該 OK |
| 番數計算衝突 | 保留現有 | 只替換向聽數，保留 Fan 計算 |

---

## 實施順序

1. ✅ 儲存 Sheauhaw 源代碼
2. ⏳ 建立 Adapter Layer
3. ⏳ 測試基本功能
4. ⏳ 處理百搭
5. ⏳ 處理 16張玩法
6. ⏳ 完整測試
7. ⏳ 部署上線
