'use client';

import { useState, useCallback, useEffect } from 'react';
import { TILES, FLOWER_TILES, WILDCARDS, type CalcResponse } from '@/lib/tiles';

// Tile arrays for rendering
const WAN_TILES = ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m'];
const TIAO_TILES = ['1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s'];
const TONG_TILES = ['1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p'];
const ZI_TILES = ['1z', '2z', '3z', '4z', '5z', '6z', '7z'];
const FLOWER_TILES_KEYS = ['梅', '蘭', '菊', '竹', '春', '夏', '秋', '冬'];
const WILDCARD_KEYS = ['1j', '2j', '3j', '4j', '5j', '6j', '7j', '8j', '9j'];

// Get tile display info
function getTileInfo(tile: string): { text: string; suit: string; unicode: string } {
  if (tile.endsWith('j')) {
    const wc = WILDCARDS[tile];
    return { text: wc?.name || tile, suit: 'wild', unicode: wc?.unicode || tile };
  }
  if (TILES[tile]) {
    return { text: TILES[tile].unicode, suit: TILES[tile].suit, unicode: TILES[tile].unicode };
  }
  if (FLOWER_TILES[tile]) {
    return { text: FLOWER_TILES[tile].unicode, suit: FLOWER_TILES[tile].suit, unicode: FLOWER_TILES[tile].unicode };
  }
  return { text: tile, suit: '', unicode: tile };
}

// Extra fan categories
const EXTRA_FAN_CATEGORIES: Record<string, Array<{ id: string; name: string; emoji: string }>> = {
  "特殊胡牌": [
    { id: 'chk_tianhu', name: '天胡', emoji: '🌟' },
    { id: 'chk_dihu', name: '地胡', emoji: '🌍' },
    { id: 'chk_haidi', name: '海底撈月', emoji: '🌊' },
    { id: 'chk_heidi', name: '河底撈魚', emoji: '🐟' }
  ],
  "聽牌類": [
    { id: 'chk_tianti', name: '天聽', emoji: '⭐' },
    { id: 'chk_diti', name: '地聽', emoji: '🌍' },
    { id: 'chk_renti', name: '人聽', emoji: '👤' },
    { id: 'chk_tingpaijishi', name: '聽牌即食', emoji: '🎯' }
  ],
  "搶槓類": [
    { id: 'chk_qianggang', name: '搶槓', emoji: '⚡' },
    { id: 'chk_yiqiangqi', name: '一搶七', emoji: '⚡' },
    { id: 'chk_qiqiangyi', name: '七搶一', emoji: '⚡' }
  ],
  "自摸類": [
    { id: 'chk_gangshang', name: '槓上花', emoji: '🎴' },
    { id: 'chk_huashangzimo', name: '花上自摸', emoji: '🌸' },
    { id: 'chk_gangshangzimo', name: '槓上自摸', emoji: '🎴' }
  ],
  "內子類": [
    { id: 'chk_sizinei', name: '四只內', emoji: '🔢' },
    { id: 'chk_qizinei', name: '七只內', emoji: '🔢' },
    { id: 'chk_shizinei', name: '十只內', emoji: '🔢' }
  ],
  "響類": [
    { id: 'chk_shuangxiang', name: '雙響', emoji: '🔔' },
    { id: 'chk_sanxiang', name: '三響', emoji: '🔔' },
    { id: 'chk_shuangxiangbaochou', name: '雙響報仇', emoji: '🔔' },
    { id: 'chk_sanxiangbaochou', name: '三響報仇', emoji: '🔔' }
  ]
};

interface ExtraFanItem {
  id: string;
  name: string;
  fan: number;
  emoji: string;
}

export default function MahjongPage() {
  // State
  const [handTiles, setHandTiles] = useState<string[]>([]);
  const [openTiles, setOpenTiles] = useState<string[]>([]);
  const [inputMode, setInputMode] = useState<'open' | 'hand'>('open');
  const [gameMode, setGameMode] = useState<14 | 17>(17);
  const [isZimo, setIsZimo] = useState(false);
  const [quanWind, setQuanWind] = useState('');
  const [weiWind, setWeiWind] = useState('');
  const [result, setResult] = useState<CalcResponse | null>(null);
  const [selectingWinTile, setSelectingWinTile] = useState(false);
  const [selectedWinTile, setSelectedWinTile] = useState<string | null>(null);
  const [showExtraInfo, setShowExtraInfo] = useState(false);
  const [showExtraFan, setShowExtraFan] = useState(false);
  const [extraFanList, setExtraFanList] = useState<ExtraFanItem[]>([]);
  const [currentBreakdown, setCurrentBreakdown] = useState<Array<{ name: string; fan: number }>>([]);
  const [zhuangCount, setZhuangCount] = useState(0);
  const [codeInput, setCodeInput] = useState('');
  const [modalContent, setModalContent] = useState('');

  // Calculate - calls API
  const calculate = useCallback(async () => {
    if (handTiles.length === 0) {
      alert('請先選擇手牌！');
      return;
    }

    const allTilesCombined = [...handTiles, ...openTiles];
    const flowerCount = allTilesCombined.filter(t => t.startsWith('F') || FLOWER_TILES[t] || t.endsWith('j')).length;

    try {
      const response = await fetch('/api/calc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hand: handTiles,
          open: openTiles,
          mode: gameMode,
          is_zimo: isZimo,
          flowers: flowerCount,
          winning_tile: selectedWinTile || '',
          quan_wind: quanWind,
          wei_wind: weiWind
        })
      });
      const data = await response.json();
      showResult(data);
    } catch (error) {
      console.error('Calculate error:', error);
    }
  }, [handTiles, openTiles, gameMode, isZimo, selectedWinTile, quanWind, weiWind]);

  // Show result
  const showResult = useCallback((d: CalcResponse) => {
    setResult(d);
    setShowExtraInfo(d.shanten === -1);
    setShowExtraFan(d.shanten === -1);

    if (d.shanten === -1 && d.winning_breakdown) {
      // Add extra fan items to breakdown
      let breakdown = [...d.winning_breakdown];
      let extraFanTotal = 0;
      for (const item of extraFanList) {
        breakdown.push({ name: item.name, fan: item.fan });
        extraFanTotal += item.fan;
      }
      breakdown.sort((a, b) => b.fan - a.fan);
      setCurrentBreakdown(breakdown);
    } else if (d.shanten === -1) {
      setCurrentBreakdown([]);
    }
  }, [extraFanList]);

  // Add tile
  const addTile = useCallback((tile: string) => {
    const isFlower = tile.startsWith('F') || FLOWER_TILES[tile] || tile.endsWith('j');
    const counts: Record<string, number> = {};

    [...handTiles, ...openTiles].forEach(t => {
      counts[t] = (counts[t] || 0) + 1;
    });

    // Non-flower tiles max 4 copies
    if (!isFlower && (counts[tile] || 0) >= 4) {
      alert('每張牌最多4張！');
      return;
    }

    if (inputMode === 'open') {
      if (openTiles.length >= 16) {
        alert('公開牌最多16張！');
        return;
      }
      setOpenTiles(prev => [...prev, tile]);
    } else {
      if (handTiles.length >= 17) {
        alert('手牌最多17張！');
        return;
      }
      setHandTiles(prev => [...prev, tile]);
    }
  }, [inputMode, handTiles, openTiles]);

  // Remove tile
  const removeTile = useCallback((arr: 'hand' | 'open', index: number) => {
    if (arr === 'hand') {
      setHandTiles(prev => prev.filter((_, i) => i !== index));
    } else {
      setOpenTiles(prev => prev.filter((_, i) => i !== index));
    }
  }, []);

  // Set input mode
  const handleSetInputMode = useCallback((mode: 'open' | 'hand') => {
    setInputMode(mode);
    if (selectingWinTile) {
      setSelectingWinTile(false);
    }
  }, [selectingWinTile]);

  // Set game mode
  const handleSetMode = useCallback((mode: 14 | 17) => {
    setGameMode(mode);
  }, []);

  // Load from code
  const loadFromCode = useCallback(() => {
    const code = codeInput.trim();
    if (!code) {
      alert('請輸入牌代碼');
      return;
    }

    const newHandTiles: string[] = [];
    const newOpenTiles: string[] = [];

    const tokens = code.match(/[0-9]+[mpsznj]/g) || [];
    tokens.forEach(token => {
      const num = token.slice(0, -1);
      const suit = token.slice(-1);

      if (suit === 'j') {
        // Each digit becomes a separate wildcard
        for (let i = 0; i < num.length; i++) {
          newHandTiles.push(num[i] + 'j');
        }
      } else {
        // Handle normal tiles
        for (let i = 0; i < num.length; i++) {
          const tile = num[i] + suit;
          if (TILES[tile]) newHandTiles.push(tile);
        }
      }
    });

    setHandTiles(newHandTiles);
    setOpenTiles(newOpenTiles);
  }, [codeInput]);

  // Generate winning hand
  const generateWinningHand = useCallback(async () => {
    try {
      const response = await fetch('/api/generate');
      const data = await response.json();
      if (data.hand) {
        setHandTiles(data.hand);
        setOpenTiles([]);
        setCodeInput(data.hand.join(' '));
        setTimeout(calculate, 100);
      } else {
        alert('生成失敗，請再試');
      }
    } catch (error) {
      console.error('Generate error:', error);
    }
  }, [calculate]);

  // Toggle select winning tile
  const toggleSelectWinTile = useCallback(() => {
    setSelectingWinTile(prev => !prev);
    if (selectingWinTile) {
      setSelectedWinTile(null);
    }
  }, [selectingWinTile]);

  // Select winning tile
  const selectWinTile = useCallback((tile: string) => {
    setSelectedWinTile(tile);
    setSelectingWinTile(false);
  }, []);

  // Clear all
  const clearAll = useCallback(() => {
    setHandTiles([]);
    setOpenTiles([]);
    setResult(null);
    setSelectingWinTile(false);
    setSelectedWinTile(null);
    setCodeInput('');
    setExtraFanList([]);
    setCurrentBreakdown([]);
    setIsZimo(false);
    setQuanWind('');
    setWeiWind('');
    setZhuangCount(0);
  }, []);

  // Update extra fan
  const updateExtraFan = useCallback(() => {
    const newList: ExtraFanItem[] = [];
    for (const [, items] of Object.entries(EXTRA_FAN_CATEGORIES)) {
      for (const item of items) {
        const checkbox = document.getElementById(item.id) as HTMLInputElement | null;
        if (checkbox?.checked) {
          // Default fan value
          newList.push({ ...item, fan: 1 });
        }
      }
    }
    setExtraFanList(newList);
  }, []);

  // Update extra info
  const updateExtraInfo = useCallback(() => {
    // This is called when zimo, quan_wind, or wei_wind changes
    // The parent calculate will be triggered if needed
  }, []);

  // Change zhuang count
  const changeZhuang = useCallback((delta: number) => {
    setZhuangCount(prev => {
      const newVal = prev + delta;
      if (newVal < 0) return 0;
      if (newVal > 99) return 99;
      return newVal;
    });
  }, []);

  // Show breakdown modal
  const showBreakdown = useCallback((tile: string, unicode: string, breakdown: string[], fan: number) => {
    if (breakdown && breakdown.length > 0) {
      const msg = breakdown.map((b: string) => `${b}: ${fan}番`).join('\n');
      setModalContent(`胡 ${unicode} 的牌型:\n${msg}\n\n總番數: ${fan}番`);
    } else {
      setModalContent(`胡 ${unicode}: ${fan}番`);
    }
  }, []);

  // Close modal
  const closeModal = useCallback(() => {
    setModalContent('');
  }, []);

  // Calculate tile count class
  const totalTiles = handTiles.length + openTiles.length;
  const tileCountClass = totalTiles === gameMode ? 'ok' : 'warning';

  // Get total fan for winning
  const getTotalFan = () => {
    if (!result || result.shanten !== -1) return 0;
    let baseFan = result.winning_fan || 0;
    for (const item of extraFanList) {
      baseFan += item.fan;
    }
    if (document.getElementById('chk_zhuang')?.querySelector('input') && (document.getElementById('chk_zhuang') as HTMLInputElement)?.checked) {
      baseFan += 2 * zhuangCount + 1;
    }
    if (isZimo) baseFan += 1;
    return baseFan;
  };

  // Render tile button
  const renderTileBtn = (tile: string, suit: string) => {
    const info = getTileInfo(tile);
    return (
      <button
        key={tile}
        className={`tile-btn ${info.suit}`}
        onClick={() => addTile(tile)}
      >
        {info.text}
      </button>
    );
  };

  // Render selected tile
  const renderSelectedTile = (tile: string, arr: 'hand' | 'open', index: number) => {
    const info = getTileInfo(tile);
    const isSelectedWin = arr === 'hand' && tile === selectedWinTile;

    return (
      <div
        key={`${tile}-${index}`}
        className={`tile ${info.suit} ${isSelectedWin ? 'selected-win' : ''}`}
        onClick={() => {
          if (arr === 'hand' && selectingWinTile) {
            selectWinTile(tile);
          } else if (isSelectedWin) {
            // Don't allow remove if selected as winning tile
          } else {
            removeTile(arr, index);
          }
        }}
        style={isSelectedWin ? { outline: '3px solid var(--accent)' } : undefined}
      >
        {info.text}
        <span className="remove">×</span>
      </div>
    );
  };

  return (
    <>
      {/* Floating Settings Button */}
      <button
        className="btn-settings"
        onClick={() => setShowExtraFan(!showExtraFan)}
        style={{ position: 'fixed', top: '10px', right: '10px', zIndex: 1000 }}
      >
        ⚙️
      </button>

      <h1>🀄 麻將聽牌計算機</h1>

      {/* Mode Select */}
      <div className="mode-select">
        <button
          className={`mode-btn ${gameMode === 14 ? '' : 'active'}`}
          onClick={() => handleSetMode(17)}
        >
          13張
        </button>
        <button
          className={`mode-btn ${gameMode === 17 ? '' : 'active'}`}
          onClick={() => handleSetMode(14)}
        >
          16張
        </button>
      </div>

      {/* Tile Count */}
      <div className={`tile-count ${tileCountClass}`}>
        手牌: {handTiles.length} | 公開牌: {openTiles.length}
      </div>

      {/* Open Tiles Display */}
      <div className="display-section">
        <div
          className={`label ${inputMode === 'open' ? 'active' : ''}`}
          onClick={() => handleSetInputMode('open')}
        >
          🔓 公開牌
        </div>
        <div
          className={`tile-display ${inputMode === 'open' ? 'active' : ''}`}
          onClick={() => handleSetInputMode('open')}
        >
          {openTiles.map((tile, i) => renderSelectedTile(tile, 'open', i))}
        </div>
      </div>

      {/* Hand Tiles Display */}
      <div className="display-section">
        <div
          className={`label ${inputMode === 'hand' ? 'active' : ''}`}
          onClick={() => handleSetInputMode('hand')}
        >
          🧱 手牌
        </div>
        <div
          className={`tile-display ${inputMode === 'hand' ? 'active' : ''}`}
          onClick={() => handleSetInputMode('hand')}
        >
          {handTiles.map((tile, i) => renderSelectedTile(tile, 'hand', i))}
        </div>
      </div>

      {/* Code Input */}
      <div className="code-input">
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>代碼輸入框</div>
        <input
          type="text"
          id="codeInput"
          placeholder="例如: 1112223334567m 或 111m222m333m456m7m"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
        />
        <div className="hint">百搭: 1j=皇 2j=萬 3j=筒 4j=索 5j=合 6j=風 7j=三元 8j=字牌 9j=花</div>
        <div className="btn-row">
          <button onClick={loadFromCode}>📥 載入代碼</button>
          <button onClick={generateWinningHand} className="btn-gen">🎲 生成17張胡牌</button>
          <button
            className={`btn-select ${selectingWinTile ? 'active' : ''}`}
            onClick={toggleSelectWinTile}
          >
            {selectingWinTile ? '❌ 取消選擇' : '🎯 選擇胡牌'}
          </button>
          <button onClick={calculate} className="btn-calc" style={{ background: '#ffc107', color: '#000' }}>
            🔍 計算聽牌/番數
          </button>
          <button onClick={clearAll} className="btn-clear" style={{ background: '#9e9e9e' }}>
            🗑️ 清除
          </button>
        </div>
      </div>

      <p className="tip">提示：點擊上方「公開牌」或「手牌」可切換輸入模式</p>

      {/* Tile Sections */}
      <div className="tile-section">
        <h3>🀇 萬子</h3>
        <div className="tile-grid">
          {WAN_TILES.map(tile => renderTileBtn(tile, 'wan'))}
        </div>
      </div>

      <div className="tile-section">
        <h3>🀐 索子</h3>
        <div className="tile-grid">
          {TIAO_TILES.map(tile => renderTileBtn(tile, 'tiao'))}
        </div>
      </div>

      <div className="tile-section">
        <h3>🀙 筒子</h3>
        <div className="tile-grid">
          {TONG_TILES.map(tile => renderTileBtn(tile, 'tong'))}
        </div>
      </div>

      <div className="tile-section">
        <h3>🀀 字牌</h3>
        <div className="tile-grid">
          {ZI_TILES.map(tile => renderTileBtn(tile, 'zi'))}
        </div>
      </div>

      <div className="tile-section">
        <h3>🀢 花牌</h3>
        <div className="tile-grid">
          {FLOWER_TILES_KEYS.map(tile => renderTileBtn(tile, FLOWER_TILES[tile].suit))}
        </div>
      </div>

      <div className="tile-section">
        <h3>🃏 百搭</h3>
        <div className="tile-grid">
          {WILDCARD_KEYS.map(tile => renderTileBtn(tile, 'wild'))}
        </div>
      </div>

      {/* Extra Info Row */}
      {showExtraInfo && (
        <div
          id="extraInfoRow"
          style={{
            margin: '10px 0',
            padding: '10px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '10px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          {/* 莊 */}
          <div style={{ display: 'inline-flex', alignItems: 'center', margin: '0 10px', color: '#fff', fontSize: '16px' }}>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                id="chk_zhuang"
                onChange={(e) => {
                  // Handle zhuang checkbox
                  updateExtraInfo();
                }}
                style={{ transform: 'scale(1.3)' }}
              />
              <b style={{ marginLeft: '5px' }}>🏠 莊</b>
            </label>
            <button
              onClick={() => changeZhuang(-1)}
              style={{
                width: '28px', height: '28px', marginLeft: '10px', fontSize: '16px',
                cursor: 'pointer', borderRadius: '5px', border: 'none', background: '#fff', color: '#667eea'
              }}
            >
              -
            </button>
            <input
              type="number"
              id="zhuangCount"
              value={zhuangCount}
              min={0}
              max={99}
              onChange={(e) => setZhuangCount(parseInt(e.target.value) || 0)}
              style={{
                width: '45px', textAlign: 'center', margin: '0 5px', padding: '4px',
                borderRadius: '5px', border: 'none', fontWeight: 'bold'
              }}
            />
            <button
              onClick={() => changeZhuang(1)}
              style={{
                width: '28px', height: '28px', fontSize: '16px', cursor: 'pointer',
                borderRadius: '5px', border: 'none', background: '#fff', color: '#667eea'
              }}
            >
              +
            </button>
          </div>

          {/* 自摸 */}
          <label style={{ margin: '0 15px', color: '#fff', fontSize: '16px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              id="chk_zimo"
              checked={isZimo}
              onChange={(e) => setIsZimo(e.target.checked)}
              style={{ transform: 'scale(1.3)' }}
            />
            <b style={{ marginLeft: '5px' }}>✋ 自摸</b>
          </label>

          {/* 圈/位 */}
          <div style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '15px', color: '#fff', fontSize: '14px' }}>
            <select
              id="quan_wind"
              value={quanWind}
              onChange={(e) => setQuanWind(e.target.value)}
              style={{
                padding: '4px 8px', borderRadius: '5px', border: '2px solid #fff',
                background: 'rgba(255,255,255,0.9)', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              <option value="">選擇圈</option>
              <option value="東">東圈</option>
              <option value="南">南圈</option>
              <option value="西">西圈</option>
              <option value="北">北圈</option>
            </select>
            <span style={{ margin: '0 3px' }}>圈</span>
            <select
              id="wei_wind"
              value={weiWind}
              onChange={(e) => setWeiWind(e.target.value)}
              style={{
                padding: '4px 8px', borderRadius: '5px', border: '2px solid #fff',
                background: 'rgba(255,255,255,0.9)', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              <option value="">選擇位</option>
              <option value="東">東位</option>
              <option value="南">南位</option>
              <option value="西">西位</option>
              <option value="北">北位</option>
            </select>
            <span style={{ margin: '0 3px' }}>位</span>
          </div>
        </div>
      )}

      {/* Extra Fan Section */}
      {showExtraFan && (
        <div
          id="extraFanSection"
          style={{
            margin: '10px 0',
            padding: '12px',
            background: '#fff',
            border: '2px solid #4caf50',
            borderRadius: '10px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
          }}
        >
          <button
            id="editFanBtn"
            onClick={updateExtraFan}
            style={{
              display: 'block', margin: '10px auto', padding: '8px 16px',
              background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer'
            }}
          >
            編輯番數
          </button>

          <div
            id="extraFanContent"
            style={{ marginTop: '10px' }}
          >
            {Object.entries(EXTRA_FAN_CATEGORIES).map(([catName, items]) => (
              <div key={catName} style={{ marginBottom: '10px' }}>
                <span style={{ color: '#666', fontSize: '12px' }}>=== {catName} ===</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
                  {items.map(item => (
                    <label
                      key={item.id}
                      style={{
                        display: 'inline-block',
                        margin: '5px 12px',
                        color: '#333',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        id={item.id}
                        onChange={updateExtraFan}
                        style={{ transform: 'scale(1.2)' }}
                      />
                      {item.emoji} {item.name}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result Section */}
      {result && (
        <div className="result-section show">
          <div className="result-box">
            <div className={`shanten ${result.shanten === -1 || result.shanten === 0 ? 'tenpai' : ''}`}>
              {result.shanten === -1 ? (
                <>
                  🀄 已胡牌！總番數: {getTotalFan()} 番
                  {result.wait_type && ` (${result.wait_type})`}
                </>
              ) : result.shanten === 0 ? (
                '🎉 已聽牌!'
              ) : (
                <>向聽數: {result.shanten}</>
              )}
            </div>

            {result.shanten === -1 ? (
              /* Winning hand breakdown */
              <div>
                {currentBreakdown.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center' }}>
                    {currentBreakdown.map((item, i) => (
                      <span
                        key={i}
                        style={{
                          background: '#f8f9fa',
                          padding: '5px 10px',
                          borderRadius: '5px',
                          border: '1px solid #dee2e6'
                        }}
                      >
                        {item.name}: <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>{item.fan}</span>番
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : result.waiting && result.waiting.length > 0 ? (
              /* Waiting tiles */
              <div className="waiting-grid">
                {(['wan', 'tiao', 'tong', 'zi'] as const).map(suit => {
                  const suitTiles = result.waiting.filter(w => {
                    const t = w.tile;
                    if (suit === 'wan') return t.endsWith('m');
                    if (suit === 'tiao') return t.endsWith('s');
                    if (suit === 'tong') return t.endsWith('p');
                    return t.endsWith('z');
                  });

                  if (suitTiles.length === 0) return null;

                  return (
                    <div key={suit} style={{ display: 'flex', gap: '6px', justifyContent: 'center', margin: '5px 0', flexWrap: 'wrap' }}>
                      {suitTiles.map(w => {
                        const info = getTileInfo(w.tile);
                        return (
                          <div
                            key={w.tile}
                            className={`waiting-item ${info.suit}`}
                            onClick={() => showBreakdown(w.tile, info.unicode, w.breakdown || [], w.fan)}
                            style={{ position: 'relative', padding: '5px' }}
                          >
                            <span>{info.text}</span>
                            <span className="count">{w.fan}番</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: '#aaa', fontSize: '14px', textAlign: 'center' }}>
                暫無聽牌
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {modalContent && (
        <div className="modal show" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="modal-close" onClick={closeModal}>×</span>
            <div style={{ whiteSpace: 'pre-wrap' }}>{modalContent}</div>
          </div>
        </div>
      )}

      <style jsx>{`
        .selected-win {
          outline: 3px solid var(--accent);
        }
      `}</style>
    </>
  );
}
