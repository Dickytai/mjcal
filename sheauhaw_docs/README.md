# Sheauhaw Mahjong Calculator - 源代碼備份

## 文件列表

| 文件 | 大小 | 說明 |
|------|------|------|
| mahjong.js | 54KB | 主算法 (DP、向聽數、聽牌計算) |
| mahjong-document.js | 70KB | 牌型識別、番數計算 |
| mahjong-worker-lang.js | 34KB | 多語言支持 |
| mahjong-tw.html | 88KB | 繁體中文介面 |

## Key Functions

### mahjong.js (主算法)

```javascript
// 向聽數計算
Step(tiles, tcnt, full_tcnt)

// 7對向聽數
PairStep(tiles, disjoint, guse, glimit)

// 聽牌檢測
Listen(tiles, tcnt, full_tcnt, glmt)

// 胡牌檢測
Win(tiles, tcnt, glmt)

// 搜索 DP
searchDp(tiles, em, ep, tcnt, sup, glmt, guse)
```

### 百搭系統

- JokerA: 專屬百搭 (id 43-45, 47-48)
- JokerB: 次級百搭 (id 46, 49)  
- JokerC: 萬能百搭 (id 42)

### Tile ID 系統

```
0-8:   萬子 (1m-9m)
9-17:  索子 (1s-9s)
18-26: 筒子 (1p-9p)
27-30: 風牌 (東南西北)
31-33: 三元 (白發中)
34-41: 花牌 (春夏秋冬梅蘭菊竹)
42:    不定向百搭 (1j)
43:    萬子百搭 (2j/im/iw)
44:    筒子百搭 (3j/ip/ib)
45:    索子百搭 (4j/is)
46:    數牌百搭 (5j)
47:    風牌百搭 (6j)
48:    三元百搭 (7j)
49:    字牌百搭 (8j/iz)
50:    花牌百搭 (9j/H/X/ih/if)
```

## 16張玩法支持

```javascript
// 16張: tcnt=16 → full_tcnt=17
Step(tiles, 16)  // 等待1張聽牌

// 17張: tcnt=17 → full_tcnt=17  
Step(tiles, 17)  // 完整胡牌
```

## 原始來源

- URL: https://sheauhaw.com/old_books/tools/mahjong-tw.html
- 版本: v4.8.6 (2026-02-14)
- 作者: akiko36000@x.com
