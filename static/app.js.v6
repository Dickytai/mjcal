// Mahjong App - Optimized
(function() {
    'use strict';

    try {
    // Cache for tile unicode lookups
    const TILE_CACHE = {};

    // DOM Elements Cache
    const DOM = {};

    // State
    let gameMode = 16;
    let openTiles = [];
    let handTiles = [];
    let inputMode = 'open';

    // Get global variables (defined in HTML)
    const TILES = window.TILES || {};
    const FLOWER_TILES = window.FLOWER_TILES || {};
    const WILDCARDS = window.WILDCARDS || {};

    // Initialize
    function init() {
        cacheDOM();
        renderButtons();
        bindEvents();
        setInputMode('open');
    }

    // Cache DOM elements for performance
    function cacheDOM() {
        DOM.openDisplay = document.getElementById('openDisplay');
        DOM.handDisplay = document.getElementById('handDisplay');
        DOM.tileCount = document.getElementById('tileCount');
        DOM.codeInput = document.getElementById('codeInput');
        DOM.resultSection = document.getElementById('resultSection');
        DOM.shantenResult = document.getElementById('shantenResult');
        DOM.waitingGrid = document.getElementById('waitingGrid');
        DOM.suggestion = document.getElementById('suggestion');
        DOM.modal = document.getElementById('modal');
        DOM.modalBody = document.getElementById('modalBody');
    }

    // Bind events
    function bindEvents() {
        DOM.openDisplay?.addEventListener('click', () => setInputMode('open'));
        DOM.handDisplay?.addEventListener('click', () => setInputMode('hand'));

        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => setMode(parseInt(e.target.dataset.mode)));
        });
    }

    // Get tile unicode (cached)
    function getTileUnicode(code) {
        if (TILE_CACHE[code]) return TILE_CACHE[code];

        const map = {
            '1m':'🀇','2m':'🀈','3m':'🀉','4m':'🀊','5m':'🀋','6m':'🀌','7m':'🀍','8m':'🀎','9m':'🀏',
            '1s':'🀐','2s':'🀑','3s':'🀒','4s':'🀓','5s':'🀔','6s':'🀕','7s':'🀖','8s':'🀗','9s':'🀘',
            '1p':'🀙','2p':'🀚','3p':'🀛','4p':'🀜','5p':'🀝','6p':'🀞','7p':'🀟','8p':'🀠','9p':'🀡',
            '1z':'🀀','2z':'🀁','3z':'🀂','4z':'🀃','5z':'🀄','6z':'🀅','7z':'🀆'
        };
        TILE_CACHE[code] = map[code] || '?';
        return TILE_CACHE[code];
    }

    // Render tile buttons
    function renderButtons() {
        const suits = [
            { id: 'wanTiles', key: 'wan', tiles: ['1m','2m','3m','4m','5m','6m','7m','8m','9m'] },
            { id: 'tiaoTiles', key: 'tiao', tiles: ['1s','2s','3s','4s','5s','6s','7s','8s','9s'] },
            { id: 'tongTiles', key: 'tong', tiles: ['1p','2p','3p','4p','5p','6p','7p','8p','9p'] },
            { id: 'ziTiles', key: 'zi', tiles: ['1z','2z','3z','4z','5z','6z','7z'] },
        ];

        suits.forEach(s => {
            const container = document.getElementById(s.id);
            if (!container) return;
            s.tiles.forEach(tile => {
                const btn = document.createElement('button');
                btn.className = `tile-btn ${s.key}`;
                btn.textContent = getTileUnicode(tile);
                btn.onclick = () => addTile(tile);
                container.appendChild(btn);
            });
        });

        // Flower tiles
        const flowerContainer = document.getElementById('flowerTiles');
        if (flowerContainer) {
            Object.keys(FLOWER_TILES).forEach(tile => {
                const btn = document.createElement('button');
                btn.className = 'tile-btn flower';
                btn.textContent = FLOWER_TILES[tile].unicode;
                btn.onclick = () => addTile(tile);
                flowerContainer.appendChild(btn);
            });
        }

        // Wildcards
        const wildContainer = document.getElementById('wildTiles');
        if (wildContainer) {
            Object.keys(WILDCARDS).forEach(key => {
                const w = WILDCARDS[key];
                const btn = document.createElement('button');
                btn.className = 'tile-btn wild';
                btn.textContent = w.unicode;
                btn.title = w.name + ': ' + w.替代;
                btn.onclick = () => addTile(w.code);
                wildContainer.appendChild(btn);
            });
        }
    }

    // Add tile
    function addTile(tile) {
        const arr = inputMode === 'open' ? openTiles : handTiles;
        const counts = {};
        arr.forEach(t => counts[t] = (counts[t] || 0) + 1);

        // Check limit
        if ((counts[tile] || 0) >= 4) {
            showModal('每張牌最多4張！');
            return;
        }

        if (inputMode === 'open') {
            if (openTiles.length >= 16) {
                showModal('公開牌最多16張！');
                return;
            }
            openTiles.push(tile);
        } else {
            if (handTiles.length >= 17) {
                showModal('手牌最多17張！');
                return;
            }
            handTiles.push(tile);
        }
        updateDisplay();
    }

    // Remove tile
    function removeTile(arr, index) {
        arr.splice(index, 1);
        updateDisplay();
    }

    function removeOpen(i) { removeTile(openTiles, i); }
    function removeHand(i) { removeTile(handTiles, i); }

    // Update display
    function updateDisplay() {
        DOM.tileCount.textContent = `手牌: ${handTiles.length} | 公開牌: ${openTiles.length}`;

        DOM.openDisplay.innerHTML = '';
        openTiles.forEach((t, i) => {
            const d = createTileDiv(t);
            d.onclick = () => removeOpen(i);
            DOM.openDisplay.appendChild(d);
        });

        DOM.handDisplay.innerHTML = '';
        handTiles.forEach((t, i) => {
            const d = createTileDiv(t);
            d.onclick = () => removeHand(i);
            DOM.handDisplay.appendChild(d);
        });
    }

    // Create tile div
    function createTileDiv(tile) {
        const d = document.createElement('div');
        let c = 'tile ';
        if (TILES[tile]) c += TILES[tile].suit;
        else if (FLOWER_TILES[tile]) c += FLOWER_TILES[tile].suit;
        else if (WILDCARDS[tile]) c += 'wild';
        d.className = c;
        d.innerHTML = (TILES[tile]?.unicode || FLOWER_TILES[tile]?.unicode || WILDCARDS[tile]?.name || tile) + '<span class="remove">×</span>';
        return d;
    }

    // Set input mode
    function setInputMode(mode) {
        inputMode = mode;
        document.getElementById('openLabel').classList.toggle('active', mode === 'open');
        document.getElementById('handLabel').classList.toggle('active', mode === 'hand');
        DOM.openDisplay?.classList.toggle('active', mode === 'open');
        DOM.handDisplay?.classList.toggle('active', mode === 'hand');
    }

    // Set game mode
    function setMode(mode) {
        gameMode = mode;
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.mode) === mode);
        });
    }

    // Load from code
    function loadFromCode() {
        const code = DOM.codeInput.value.trim();
        if (!code) {
            showModal('請輸入牌代碼');
            return;
        }

        handTiles = [];
        openTiles = [];

        // Parse format: 111m222s or 111m 222s
        const tokens = code.match(/[0-9]+[mpsznj]/g) || [];
        
        tokens.forEach(token => {
            const num = token.slice(0, -1);
            const suit = token.slice(-1);
            const actualSuit = suit === 'j' ? 'z' : suit;

            for (let i = 0; i < num.length; i++) {
                const tile = num[i] + actualSuit;
                if (TILES[tile]) {
                    handTiles.push(tile);
                }
            }
        });

        updateDisplay();
        calculate();
    }

    // Generate winning hand
    function generateWinningHand() {
        try {
            const counts = new Array(34).fill(0);
            let hand = [];

            // Generate 5 melds
            for (let i = 0; i < 5; i++) {
                const meld = generateMeld(counts);
                if (meld && meld.length >= 3) {
                    hand.push(meld[0], meld[1], meld[2]);
                    if (typeof meld[0] === 'number') counts[meld[0]]++;
                    if (typeof meld[1] === 'number') counts[meld[1]]++;
                    if (typeof meld[2] === 'number') counts[meld[2]]++;
                }
            }

            // Generate 1 pair
            const pair = generatePair(counts);
            if (pair && pair.length >= 2) {
                hand.push(pair[0], pair[1]);
                if (typeof pair[0] === 'number') counts[pair[0]] += 2;
            }

            // Add 1 extra tile
            const extraAvail = [];
            for (let i = 0; i < 34; i++) {
                if (counts[i] < 4) extraAvail.push(i);
            }
            if (extraAvail.length > 0) {
                const extra = extraAvail[Math.floor(Math.random() * extraAvail.length)];
                hand.push(extra);
            }

            // Convert to tile names
            handTiles = hand
                .filter(x => typeof x === 'number' && x >= 0 && x < 34)
                .map(idxToTile)
                .filter(x => x && x.length > 0);

            // Ensure 17 tiles
            while (handTiles.length < 17) {
                const r = Math.floor(Math.random() * 34);
                handTiles.push(idxToTile(r));
            }
            if (handTiles.length > 17) {
                handTiles = handTiles.slice(0, 17);
            }

            openTiles = [];
            updateDisplay();
            setTimeout(calculate, 100);
        } catch (e) {
            showModal('Error: ' + e.message);
        }
    }

    // Generate meld
    function generateMeld(counts) {
        if (Math.random() > 0.4) {
            const chow = findAvailableChow(counts);
            if (chow && chow.length >= 3) return chow;
        }
        const pong = findAvailablePong(counts);
        if (pong && pong.length >= 3) return pong;
        const r = Math.floor(Math.random() * 34);
        return [r, r, r];
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

    function idxToTile(idx) {
        if (idx === undefined || idx === null || isNaN(idx) || idx < 0 || idx >= 34) return '';
        const suits = ['m', 's', 'p'];
        const suit = Math.floor(idx / 9);
        const num = idx % 9;
        return (num + 1) + suits[suit];
    }

    // Calculate
    function calculate() {
        fetch('/calc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hand: handTiles, open: openTiles, mode: gameMode })
        }).then(r => r.json()).then(showResult);
    }

    // Show result
    function showResult(d) {
        DOM.resultSection.classList.add('show');

        let shantenText = '';
        let shantenClass = '';

        if (d.shanten === -1) {
            // Winning hand
            const totalFan = d.winning_fan || 0;
            const breakdown = d.winning_breakdown || [];
            shantenText = `🀄 已胡牌！總番數: ${totalFan} 番`;
            shantenClass = ' tenpai';

            if (breakdown.length > 0) {
                const bdHtml = breakdown.map(b => 
                    `<span style="background:rgba(0,0,0,0.4);padding:3px 8px;border-radius:10px;margin:2px;">${b.name} ${b.fan}番</span>`
                ).join('');
                DOM.waitingGrid.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin:10px 0;">${bdHtml}</div>`;
            }
        } else if (d.shanten === 0) {
            shantenText = '🎉 已聽牌!';
            shantenClass = ' tenpai';
        } else if (d.shanten > 0) {
            shantenText = `向聽數: ${d.shanten}`;
        } else {
            shantenText = '❌ 未能聽牌';
        }

        DOM.shantenResult.textContent = shantenText;
        DOM.shantenResult.className = 'shanten' + shantenClass;

        // Show waiting tiles
        if (d.shanten !== -1) {
            if (d.waiting.length === 0) {
                DOM.waitingGrid.innerHTML = '<div style="color:#aaa;font-size:14px">暫無聽牌</div>';
            } else {
                const suits = { 'wan': [], 'tiao': [], 'tong': [], 'zi': [] };
                
                d.waiting.forEach(w => {
                    const t = w.tile;
                    if (t.endsWith('m')) suits.wan.push(w);
                    else if (t.endsWith('s')) suits.tiao.push(w);
                    else if (t.endsWith('p')) suits.tong.push(w);
                    else suits.zi.push(w);
                });

                let html = '';
                const suitNames = { 'wan': 'wan', 'tiao': 'tiao', 'tong': 'tong', 'zi': 'zi' };
                
                Object.keys(suits).forEach(suit => {
                    if (suits[suit].length === 0) return;
                    html += '<div style="display:flex;gap:6px;justify-content:center;margin:5px 0;flex-wrap:wrap;">';
                    suits[suit].forEach(w => {
                        html += `<div class="waiting-item ${suitNames[suit]}" onclick="app.showBreakdown('${w.tile}', '${w.unicode}', ${JSON.stringify(w.breakdown).replace(/"/g, '&quot;')}, ${w.fan})">
                            <span class="tc">${w.unicode}</span>
                            <span class="fan">${w.fan}番</span>
                        </div>`;
                    });
                    html += '</div>';
                });
                DOM.waitingGrid.innerHTML = html;
            }

            // Suggestion
            const sugParts = [];
            const bySuit = { 'm': [], 's': [], 'p': [], 'z': [] };
            d.waiting.forEach(w => {
                const t = w.tile;
                const suffix = t.slice(-1);
                if (bySuit[suffix]) bySuit[suffix].push(w.tile + (w.fan > 1 ? `(${w.fan}fan)` : ''));
            });
            if (bySuit.m.length) sugParts.push(`<span style="color:#f39c12">m:${bySuit.m.join('')}</span>`);
            if (bySuit.s.length) sugParts.push(`<span style="color:#27ae60">s:${bySuit.s.join('')}</span>`);
            if (bySuit.p.length) sugParts.push(`<span style="color:#9b59b6">p:${bySuit.p.join('')}</span>`);
            if (bySuit.z.length) sugParts.push(`<span style="color:#e74c3c">z:${bySuit.z.join('')}</span>`);

            DOM.suggestion.innerHTML = d.waiting.length > 0 
                ? `<strong>💡 可胡牌型：</strong><br>${sugParts.join('<br>')}`
                : (d.shanten > 0 ? '需要再食牌先可以聽牌' : '未能聽牌');
        }

        DOM.resultSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Show breakdown in modal
    window.showBreakdown = function(tile, unicode, breakdown, fan) {
        if (breakdown && breakdown.length > 0) {
            const msg = breakdown.map(b => `${b.name}: ${b.fan}番`).join('\n');
            showModal(`胡 ${unicode} 的牌型:\n${msg}\n\n總番數: ${fan}番`);
        } else {
            showModal(`胡 ${unicode}: ${fan}番`);
        }
    };

    // Show modal
    function showModal(content) {
        DOM.modalBody.innerHTML = content.replace(/\n/g, '<br>');
        DOM.modal.classList.add('show');
    }

    // Close modal
    function closeModal() {
        DOM.modal.classList.remove('show');
    }

    // Clear all
    function clearAll() {
        openTiles = [];
        handTiles = [];
        DOM.resultSection.classList.remove('show');
        updateDisplay();
    }

    // Export to window
    window.app = {
        init, loadFromCode, generateWinningHand, calculate,
        clearAll, showBreakdown, closeModal, setMode, setInputMode
    };

    // Auto init
    init();
    
    } catch(e) {
        console.error('Mahjong App Error:', e);
        alert('Error: ' + e.message);
    }
})();
