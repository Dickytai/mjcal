# MJCal Next.js 遷移設計規格

## 目標

將麻將聽牌計算機從 Python Flask 遷移到 Next.js，部署到 Vercel，實現 GitHub 自動部署。

## 遷移策略：先移植，後優化

1. **Phase 1：移植** - 盡快在 Vercel 上線運行
2. **Phase 2：重構計算** - 在乾淨的代碼庫上逐步重寫計算邏輯

---

## Phase 1：移植

### 架構

```
mjcal/                    # Next.js 項目
├── app/
│   ├── page.tsx          # 首頁（移植自 index.html）
│   ├── layout.tsx        # 根佈局
│   └── api/
│       ├── calc/route.ts         # /calc - 核心計算
│       ├── generate/route.ts     # /generate - 生成胡牌
│       ├── fan_config/route.ts   # 番數配置 CRUD
│       └── sheauhaw/route.ts     # Sheauhaw 算法
├── lib/
│   ├── mahjong-core.ts    # 封裝 mj_calc.js（計算邏輯）
│   └── sheauhaw.ts        # Sheauhaw 適配器
├── components/
│   ├── TileButton.tsx     # 麻將牌按鈕
│   ├── HandDisplay.tsx    # 手牌顯示
│   ├── ResultPanel.tsx    # 結果面板
│   └── FanConfig.tsx      # 番數配置
├── styles/
│   └── app-zen.css        # 直接複製現有樣式
└── package.json
```

### Flask → Next.js 路由映射

| Flask 路由 | Next.js Route Handler |
|------------|----------------------|
| `POST /calc` | `app/api/calc/route.ts` |
| `GET /generate` | `app/api/generate/route.ts` |
| `POST /save_example` | 暫時移除（需 Blob 存儲） |
| `POST /clear_examples` | 暫時移除 |
| `POST /test_multi_combo` | 整合到 /calc |
| `GET /api/fan_config` | `app/api/fan_config/route.ts` |
| `POST /api/fan_config` | `app/api/fan_config/route.ts` |
| `GET /api/fan_presets` | `app/api/fan_config/route.ts` |
| `GET /api/fan_preset/<id>` | `app/api/fan_config/route.ts` |
| `POST /api/fan_config_delete` | `app/api/fan_config/route.ts` |
| `POST /sheauhaw` | `app/api/sheauhaw/route.ts` |

### UI 移植原則

- 直接複製 `index.html` 的 HTML 結構
- 複製 `public/static/app-zen.css` 到 `styles/`
- 用 React 封裝互動邏輯（`useState`, `useEffect`）
- 保持 100% 相同的視覺效果

### 數據存儲

Phase 1 期間：
- `fan_config` 使用內存存儲（Set, Map）
- 重啟後配置丟失（可接受，Phase 2 再加 Blob）

---

## Phase 2：重構計算邏輯（稍後執行）

### 目標

- 將 `mj_calc.js`（4349 行）翻譯為 TypeScript
- 重點修復百搭牌計算 bug
- 保持算法兼容性

### 方法

- 逐步替換：先封裝，再測試，再替換
- 保持 API 接口不變，隔離計算核心

---

## 部署流程

1. 本地開發完成 → `git push` 到 GitHub
2. Vercel 自動檢測 → 部署到 `https://mjcal.vercel.app`
3. 每次 `git push` 觸發新部署

---

## 技術棧

- **框架**：Next.js 16 (App Router)
- **語言**：TypeScript
- **樣式**：純 CSS（保持現有樣式）
- **部署**：Vercel（GitHub 自動部署）
- **計算**：封裝現有 `mj_calc.js`，Node.js 執行

---

## 成功標準

### Phase 1 完成標準
- [ ] Next.js 項目可在本地運行
- [ ] 所有 API 路由正確響應
- [ ] UI 與現有頁面視覺一致
- [ ] 成功部署到 Vercel
- [ ] GitHub push 觸發自動部署

### Phase 2 完成標準
- [ ] 計算邏輯重寫為 TypeScript
- [ ] 百搭牌計算正確
- [ ] 所有測試案例通過
