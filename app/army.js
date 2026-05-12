/* ============================================================
   ARMY / HERO INFO / LEVEL UP / GEAR / FORGE
   Renders the 21-hero collection grid, populates the Hero Info
   screen on tap, manages cross-screen navigation, and handles
   light interactivity (level meter, XP-potion selection, gear
   selection, forge attempt).

   Public API (window.Army)
     Army.openCollection()        // open the Army Collection menu
     Army.selectHero(id)          // open Hero Info for hero `id`
     Army.openLevelUp()           // open the Level Up menu for current hero
     Army.openGear(slot)          // open Gear Selection for `slot` (boots, etc.)
     Army.openForge(gearId)       // open Forge Gear for `gearId`
     Army._heroes()               // debug: hero list
   ============================================================ */
(function () {
    'use strict';

    // -------- Hero pool (21 entries spanning all 6 rarities) ----
    const ARCH = {
        tank:       '../assets/icons/ui_icon_archetype_hero_tank.png',
        assault:    '../assets/icons/ui_icon_archetype_hero_assault.png',
        hunter:     '../assets/icons/ui_icon_archetype_hero_hunter.png',
        support:    '../assets/icons/ui_icon_archetype_hero_support.png',
        tactician:  '../assets/icons/ui_icon_archetype_hero_tactician.png',
    };
    const AFFINITY = {
        symbioticliquid: '../assets/icons/ui_icon_rps_symbioticliquid.png',
        livingmetal:     '../assets/icons/ui_icon_rps_livingmetal.png',
        energycrystals:  '../assets/icons/ui_icon_rps_energycrystals.png',
    };
    const RANK_ICON = (n) => `../assets/icons/ui_icon_rank_0${Math.min(6, Math.max(1, n))}.png`;
    const FACTION_BG = '../assets/backgrounds/ui_bg_faction_avalon_01.png';

    const HEROES = [
        { id: 'gwen',       name: 'Gwen',           rarity: 'mythic',    affinity: 'symbioticliquid', archetype: 'tank',      rank: 6, level: 160, levelMax: 500,
          portrait: '../assets/characters/Gwen/ui_portrait_card_hero_gwen.png',
          infoArt:  '../assets/characters/Gwen/ui_portrait_infoscreen_gwen.png',
          rankName: 'Knight', isOwned: true, isNew: true,
          abilities: ['gwen_a1', 'gwen_a2', 'gwen_a3', 'gwen_wc'] },

        { id: 'aurelia',    name: 'Aurelia',        rarity: 'legendary', affinity: 'energycrystals',  archetype: 'support',   rank: 5, level: 80,  levelMax: 200, rankName: 'Knight', isOwned: true },
        { id: 'kael',       name: 'Kael Ironfang',  rarity: 'legendary', affinity: 'livingmetal',     archetype: 'assault',   rank: 5, level: 60,  levelMax: 200, rankName: 'Knight', isOwned: true },

        { id: 'ranger_a',   name: 'Storm Ranger',   rarity: 'epic',      affinity: 'energycrystals',  archetype: 'hunter',    rank: 4, level: 50,  levelMax: 160, rankName: 'Captain', isOwned: true },
        { id: 'mage_a',     name: 'Tide Strategist',rarity: 'epic',      affinity: 'symbioticliquid', archetype: 'tactician', rank: 4, level: 45,  levelMax: 160, rankName: 'Captain', isOwned: true },
        { id: 'tank_a',     name: 'Iron Sentinel',  rarity: 'epic',      affinity: 'livingmetal',     archetype: 'tank',      rank: 4, level: 40,  levelMax: 160, rankName: 'Captain', isOwned: true },

        { id: 'rare_a',     name: 'Crossbow Captain', rarity: 'rare',    affinity: 'energycrystals',  archetype: 'hunter',    rank: 3, level: 30,  levelMax: 120, rankName: 'Sergeant', isOwned: true },
        { id: 'rare_b',     name: 'Battle Cleric',  rarity: 'rare',      affinity: 'symbioticliquid', archetype: 'support',   rank: 3, level: 25,  levelMax: 120, rankName: 'Sergeant', isOwned: true },
        { id: 'rare_c',     name: 'Vanguard',       rarity: 'rare',      affinity: 'livingmetal',     archetype: 'assault',   rank: 3, level: 20,  levelMax: 120, rankName: 'Sergeant', isOwned: true },

        { id: 'unc_a',      name: 'Field Medic',    rarity: 'uncommon',  affinity: 'symbioticliquid', archetype: 'support',   rank: 2, level: 15,  levelMax: 80,  rankName: 'Corporal', isOwned: true },
        { id: 'unc_b',      name: 'Scout',          rarity: 'uncommon',  affinity: 'energycrystals',  archetype: 'hunter',    rank: 2, level: 12,  levelMax: 80,  rankName: 'Corporal', isOwned: true },
        { id: 'unc_c',      name: 'Foot Soldier',   rarity: 'uncommon',  affinity: 'livingmetal',     archetype: 'assault',   rank: 2, level: 10,  levelMax: 80,  rankName: 'Corporal', isOwned: true },
        { id: 'unc_d',      name: 'Pikeman',        rarity: 'uncommon',  affinity: 'livingmetal',     archetype: 'tank',      rank: 2, level:  8,  levelMax: 80,  rankName: 'Corporal', isOwned: true },

        { id: 'com_a',      name: 'Recruit',        rarity: 'common',    affinity: 'energycrystals',  archetype: 'assault',   rank: 1, level: 10,  levelMax: 50,  rankName: 'Recruit', isOwned: true },
        { id: 'com_b',      name: 'Conscript',      rarity: 'common',    affinity: 'livingmetal',     archetype: 'tank',      rank: 1, level:  8,  levelMax: 50,  rankName: 'Recruit', isOwned: true },
        { id: 'com_c',      name: 'Squire',         rarity: 'common',    affinity: 'symbioticliquid', archetype: 'tactician', rank: 1, level:  6,  levelMax: 50,  rankName: 'Recruit', isOwned: true },
        { id: 'com_d',      name: 'Lookout',        rarity: 'common',    affinity: 'energycrystals',  archetype: 'hunter',    rank: 1, level:  5,  levelMax: 50,  rankName: 'Recruit', isOwned: true },

        // 4 extras to reach 21 (varied rarities, lower levels — "newer" recruits)
        { id: 'epic_b',     name: 'Frost Magus',    rarity: 'epic',      affinity: 'energycrystals',  archetype: 'tactician', rank: 4, level: 35, levelMax: 160, rankName: 'Captain', isOwned: true },
        { id: 'rare_d',     name: 'Shieldmaiden',   rarity: 'rare',      affinity: 'symbioticliquid', archetype: 'tank',      rank: 3, level: 18, levelMax: 120, rankName: 'Sergeant', isOwned: true },
        { id: 'unc_e',      name: 'Ranger',         rarity: 'uncommon',  affinity: 'energycrystals',  archetype: 'hunter',    rank: 2, level:  7, levelMax: 80,  rankName: 'Corporal', isOwned: true },
        { id: 'com_e',      name: 'Page',           rarity: 'common',    affinity: 'livingmetal',     archetype: 'support',   rank: 1, level:  3, levelMax: 50,  rankName: 'Recruit', isOwned: true },
    ];

    // -------- Gear data --------------------------------------
    // Six slot types each get a small inventory of mock items. The Equipped
    // entry is the one the hero is currently wearing; the rest live in the
    // player's bag and can be selected/equipped/forged.
    const GEAR_SLOTS = ['boots', 'chest', 'gloves', 'helmet', 'shield', 'weapon'];
    const GEAR_ICON  = (slot) => `../assets/icons/ui_icon_card_gear_empty_${slot}.png`;

    function gearStat(slot, lvl) {
        const baseHP = ['boots', 'chest'].includes(slot) ? 12 : 8;
        return {
            primary: { label: 'HP', value: baseHP, suffix: '%' },
            setBonus: 'Life Set Bonus',
            setNote: '+30% Max health.',
            stats: [
                { name: 'Max HP',       value: '900', delta: '+1.1k' },
                { name: 'Defense',      value: '900', delta: '+1.1k' },
                { name: 'Crit Resist',  value: '900', delta: '+1.1k' },
            ],
        };
    }
    function gearItem(slot, idx, rarity, lvl) {
        return {
            id: `${slot}_${idx}`,
            slot, rarity, level: lvl,
            name: rarity.charAt(0).toUpperCase() + rarity.slice(1) + ' ' + slot.charAt(0).toUpperCase() + slot.slice(1),
            ...gearStat(slot, lvl),
        };
    }
    const GEAR_INVENTORY = (() => {
        const out = {};
        GEAR_SLOTS.forEach(slot => {
            out[slot] = [
                gearItem(slot, 'eq', 'epic',      16),  // equipped
                gearItem(slot, 'a',  'epic',      16),  // selectable
                gearItem(slot, 'b',  'epic',      14),
                gearItem(slot, 'c',  'epic',      12),
                gearItem(slot, 'd',  'rare',      10),
                gearItem(slot, 'e',  'rare',      10),
                gearItem(slot, 'f',  'rare',       8),
                gearItem(slot, 'g',  'uncommon',   6),
                gearItem(slot, 'h',  'uncommon',   6),
                gearItem(slot, 'i',  'uncommon',   4),
                gearItem(slot, 'j',  'common',     2),
                gearItem(slot, 'k',  'common',     2),
            ];
        });
        return out;
    })();

    // -------- State -------------------------------------------
    let currentHeroId   = 'gwen';
    let currentGearSlot = 'chest';
    let currentForgeId  = null;
    let levelupSelection = []; // array of { tier, count } selections

    function getHero(id) { return HEROES.find(h => h.id === id) || HEROES[0]; }

    // -------- Hero card markup (matches Gwen template) -----
    function buildHeroCard(hero, opts) {
        opts = opts || {};
        const portraitSrc = hero.portrait || ARCH[hero.archetype];
        const portraitClass = hero.portrait ? '' : 'hc-portrait--icon';
        const newBadge = opts.showNew && hero.isNew
            ? '<span class="badge badge-new">NEW</span>' : '';
        return `
            <div class="hero-card" data-rarity="${hero.rarity}" data-hero-id="${hero.id}">
                <img class="hc-portrait ${portraitClass}" src="${portraitSrc}" alt="${hero.name}">
                <div class="hc-types">
                    <div class="hc-type-badge"><img src="${AFFINITY[hero.affinity]}" alt=""></div>
                    <div class="hc-type-badge"><img src="${ARCH[hero.archetype]}" alt=""></div>
                </div>
                <div class="hc-level">
                    <span class="hc-level-prefix">Lv</span>
                    <span class="hc-level-num">${hero.level}</span>
                </div>
                <img class="hc-rank" src="${RANK_ICON(hero.rank)}" alt="Rank ${hero.rank}">
                ${newBadge}
            </div>
        `;
    }

    // -------- Army Collection render -------------------------
    function renderArmyGrid() {
        const grid = document.getElementById('army-grid');
        if (!grid) return;
        grid.innerHTML = HEROES.map(h => buildHeroCard(h, { showNew: h.isNew })).join('');
        grid.querySelectorAll('.hero-card').forEach(card => {
            card.addEventListener('click', () => selectHero(card.dataset.heroId));
        });
    }

    function openCollection() {
        if (window.Menu) window.Menu.open('heroes');
        renderArmyGrid();
    }

    // -------- Hero Info render -------------------------------
    function renderHeroInfo(id) {
        const hero = getHero(id);
        currentHeroId = id;
        const root = document.getElementById('hero-info-root');
        if (!root) return;

        const ABILITY_ICON = (key) => key.startsWith('gwen_')
            ? `../assets/characters/Gwen/ui_icon_ability_${key.split('_')[1]}_gwen.png`
            : ARCH[hero.archetype];

        const abilityHtml = (hero.abilities || ['gwen_a1', 'gwen_a2', 'gwen_a3', 'gwen_wc']).map((key, i) => {
            const isUlt = i === 3;
            return `<button class="hero-ability ${isUlt ? 'is-ultimate' : ''}" title="Ability ${i+1}">
                        <img src="${ABILITY_ICON(key)}" alt="">
                    </button>`;
        }).join('');

        const portraitArt = hero.infoArt || hero.portrait || ARCH[hero.archetype];
        const pct = Math.min(100, (hero.level / hero.levelMax) * 100);

        root.innerHTML = `
            <div class="hero-info-content">
                <!-- Left: portrait stage -->
                <div class="hero-portrait-stage">
                    <img class="hero-portrait-bg" src="${FACTION_BG}" alt="">
                    <img class="hero-portrait-character" src="${portraitArt}" alt="${hero.name}">
                    <div class="hero-portrait-overlay">
                        <div class="hero-name-bar">
                            <span class="hero-name">${hero.name}</span>
                            <span class="hero-rarity-tag" data-rarity="${hero.rarity}">${hero.rarity}</span>
                            ${hero.isNew ? '<span class="hero-new-tag">NEW</span>' : ''}
                            <span class="hero-portrait-currency">
                                <img src="../images/icons/inventory_brass.png" alt=""><span>1.5k</span>
                            </span>
                        </div>
                        <div></div>
                    </div>
                    <div class="hero-gear-row">
                        <div class="hero-gear-set">
                            <span class="hero-gear-set-row">Gear Sets</span>
                            <span class="hero-gear-set-row">1/2</span>
                            <span class="hero-gear-set-row">1/2</span>
                        </div>
                        <div class="hero-gear-slots">
                            ${GEAR_SLOTS.map((slot, i) => `
                                <button class="hero-gear-slot ${i === 1 ? 'is-equipped' : ''}"
                                        data-gear-slot="${slot}" title="${slot}">
                                    <img src="${GEAR_ICON(slot)}" alt="">
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Right: info panel -->
                <div class="hero-info-panel">
                    <div class="hero-section-header">Attributes</div>
                    <div class="hero-attributes">
                        <div class="hero-attribute">Attribute</div>
                        <div class="hero-attribute">Attribute</div>
                        <div class="hero-attribute">Attribute</div>
                        <div class="hero-attribute">Attribute</div>
                        <div class="hero-attribute">Attribute</div>
                        <div class="hero-attribute">Attribute</div>
                    </div>

                    <div class="hero-section-header">Abilities</div>
                    <div class="hero-abilities">${abilityHtml}</div>

                    <div class="hero-section-header">Stats</div>
                    <div class="hero-stats">
                        <div class="hero-stat-row">
                            <span class="hero-stat-icon">⚔</span>
                            <span>Stat Name</span>
                            <span class="hero-stat-value">900</span>
                            <span class="hero-stat-bonus">+1.1k</span>
                        </div>
                        <div class="hero-stat-row">
                            <span class="hero-stat-icon">🛡</span>
                            <span>Stat Name</span>
                            <span class="hero-stat-value">900</span>
                            <span class="hero-stat-bonus">+1.1k</span>
                        </div>
                        <div class="hero-stat-row">
                            <span class="hero-stat-icon">♥</span>
                            <span>Stat Name</span>
                            <span class="hero-stat-value">900</span>
                            <span class="hero-stat-bonus">+1.1k</span>
                        </div>
                    </div>

                    <div class="hero-section-header">Rank · ${hero.rankName || 'Knight'}</div>
                    <div class="hero-rank-row">
                        <img class="hero-rank-icon" src="${RANK_ICON(hero.rank)}" alt="Rank ${hero.rank}">
                        <div class="hero-rank-info">
                            <div class="hero-rank-name">${hero.rankName || 'Knight'}</div>
                            <div class="hero-level-bar">
                                <div class="hero-level-fill" style="width:${pct}%"></div>
                                <div class="hero-level-text">
                                    <span>LV ${hero.level}</span>
                                    <span>${hero.level} / ${hero.levelMax}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button class="hero-action-btn" onclick="Army.openLevelUp()">Level Up</button>
                </div>
            </div>
        `;

        // Wire gear slot taps
        root.querySelectorAll('[data-gear-slot]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openGear(btn.dataset.gearSlot);
            });
        });
    }

    function selectHero(id) {
        currentHeroId = id;
        renderHeroInfo(id);
        if (window.Menu) window.Menu.open('hero-info');
    }

    // -------- Hero Level Up render ---------------------------
    function renderLevelUp() {
        const hero = getHero(currentHeroId);
        const root = document.getElementById('hero-levelup-root');
        if (!root) return;
        levelupSelection = [];

        const tiers = [
            { id: 't1', amt: '+100 XP', count: 11 },
            { id: 't2', amt: '+50 XP',  count: 11 },
            { id: 't3', amt: '+25 XP',  count: 2  },
            { id: 't4', amt: '+10 XP',  count: 11 },
        ];
        const tierBar = tiers.map(t => `
            <div class="levelup-tier" data-tier="${t.id}">
                <div class="levelup-tier-icon">XP</div>
                <div class="levelup-tier-amt">${t.amt}</div>
                <div class="levelup-tier-count">x${t.count}</div>
            </div>
        `).join('');

        // Grid: 18 mock potions
        const items = [];
        for (let i = 0; i < 18; i++) {
            const tier = tiers[i % tiers.length];
            items.push(`
                <button class="levelup-item" data-item-tier="${tier.id}">
                    <span class="levelup-item-count">x${tier.count}</span>
                    <div class="levelup-item-art">XP</div>
                    <div class="levelup-item-amt">${tier.amt}</div>
                </button>
            `);
        }

        const portraitArt = hero.infoArt || hero.portrait || ARCH[hero.archetype];

        root.innerHTML = `
            <div class="hero-info-content">
                <div class="hero-portrait-stage">
                    <img class="hero-portrait-bg" src="${FACTION_BG}" alt="">
                    <img class="hero-portrait-character" src="${portraitArt}" alt="${hero.name}">
                </div>
                <div class="levelup-panel">
                    <div class="levelup-tier-row">${tierBar}</div>
                    <div class="army-toolbar"><div class="army-sort">Rarity</div></div>
                    <div class="levelup-grid">${items.join('')}</div>
                    <div class="levelup-selected-strip">
                        <span class="levelup-selected-strip-label">Selected items</span>
                        <div class="levelup-selected-list" id="levelup-selected-list"></div>
                        <button class="levelup-clear" id="levelup-clear">Clear All</button>
                    </div>
                    <div class="levelup-footer">
                        <div class="levelup-status">
                            <strong class="levelup-status-name">${hero.name}</strong>
                            <div class="levelup-status-bar">
                                <div class="levelup-status-fill" id="levelup-status-fill" style="width:${(hero.level/hero.levelMax)*100}%"></div>
                            </div>
                            <span class="levelup-status-progress" id="levelup-status-text">Lv ${hero.level} / ${hero.levelMax}</span>
                        </div>
                        <div class="levelup-target" id="levelup-target">Level Up to ${hero.level}</div>
                        <button class="hero-action-btn" id="levelup-confirm" style="margin-top:0; padding:14px 28px;">Level Up</button>
                    </div>
                </div>
            </div>
        `;

        // Wire item selection — toggle is-selected and update target preview
        root.querySelectorAll('.levelup-item').forEach(item => {
            item.addEventListener('click', () => {
                item.classList.toggle('is-selected');
                refreshLevelupSelected();
            });
        });
        document.getElementById('levelup-clear').addEventListener('click', () => {
            root.querySelectorAll('.levelup-item.is-selected').forEach(i => i.classList.remove('is-selected'));
            refreshLevelupSelected();
        });
        document.getElementById('levelup-confirm').addEventListener('click', () => confirmLevelUp());
    }

    function refreshLevelupSelected() {
        const root = document.getElementById('hero-levelup-root');
        if (!root) return;
        const selected = root.querySelectorAll('.levelup-item.is-selected');
        const tally = {};
        let xpGain = 0;
        selected.forEach(el => {
            const tier = el.dataset.itemTier;
            tally[tier] = (tally[tier] || 0) + 1;
            const amt = el.querySelector('.levelup-item-amt').textContent;
            const m = amt.match(/\+(\d+)/);
            if (m) xpGain += parseInt(m[1], 10);
        });

        const list = document.getElementById('levelup-selected-list');
        list.innerHTML = Object.entries(tally).map(([tier, count]) => {
            const sample = root.querySelector(`.levelup-item[data-item-tier="${tier}"]`);
            const label  = sample ? sample.querySelector('.levelup-item-amt').textContent : '';
            return `<span class="levelup-selected-pill">${label} ×${count}</span>`;
        }).join('');

        // Project new level (very rough: every 100 XP = 1 level)
        const hero = getHero(currentHeroId);
        const newLevel = Math.min(hero.levelMax, hero.level + Math.floor(xpGain / 100));
        document.getElementById('levelup-target').textContent =
            xpGain > 0 ? `Level Up to ${newLevel}` : `Level Up to ${hero.level}`;
        const newPct = Math.min(100, (newLevel / hero.levelMax) * 100);
        const fill = document.getElementById('levelup-status-fill');
        if (fill) fill.style.width = newPct + '%';
        document.getElementById('levelup-status-text').textContent =
            xpGain > 0 ? `Lv ${hero.level} → ${newLevel} / ${hero.levelMax}`
                       : `Lv ${hero.level} / ${hero.levelMax}`;
    }

    function confirmLevelUp() {
        const root = document.getElementById('hero-levelup-root');
        const hero = getHero(currentHeroId);
        let xpGain = 0;
        root.querySelectorAll('.levelup-item.is-selected').forEach(el => {
            const m = el.querySelector('.levelup-item-amt').textContent.match(/\+(\d+)/);
            if (m) xpGain += parseInt(m[1], 10);
        });
        if (xpGain === 0) return;
        hero.level = Math.min(hero.levelMax, hero.level + Math.floor(xpGain / 100));
        // Return to hero info, refreshed
        if (window.Menu) window.Menu.close();
        renderHeroInfo(hero.id);
    }

    function openLevelUp() {
        renderLevelUp();
        if (window.Menu) window.Menu.open('hero-levelup');
    }

    // -------- Gear Selection render --------------------------
    function renderGear(slot) {
        const hero = getHero(currentHeroId);
        currentGearSlot = slot;
        const root = document.getElementById('gear-root');
        if (!root) return;

        const inventory = GEAR_INVENTORY[slot];
        const equipped  = inventory[0];
        const selected  = inventory[1];
        const portraitArt = hero.infoArt || hero.portrait || ARCH[hero.archetype];

        function buildCard(item, mode) {
            const stats = item.stats.map(s => `
                <div class="gear-card-stat">
                    <span class="gear-card-stat-icon"></span>
                    <span class="gear-card-stat-name">${s.name}</span>
                    <span class="gear-card-stat-val">${s.value}</span>
                    <span class="gear-card-stat-delta">${s.delta}</span>
                </div>
            `).join('');
            const actions = mode === 'equipped'
                ? '<button class="gear-card-action is-equipped">Equipped</button>'
                : `<button class="gear-card-action is-forge" onclick="Army.openForge('${item.id}')">Forge</button>
                   <button class="gear-card-action is-equip" onclick="Army.equipGear('${item.id}')">Equip</button>`;
            return `
                <div class="gear-card" data-rarity="${item.rarity}">
                    <div class="gear-card-header">
                        <div class="gear-card-icon"><img src="${GEAR_ICON(slot)}" alt=""></div>
                        <div class="gear-card-stat-big">
                            <span class="gear-card-stat-big-label">${item.primary.label}</span>
                            <span class="gear-card-stat-big-value">${item.primary.value}${item.primary.suffix}</span>
                        </div>
                        <span class="gear-card-lock">🔒</span>
                    </div>
                    <div class="gear-card-level">
                        <span class="gear-card-level-num">LV ${item.level}</span>
                        <span class="gear-card-level-stars">★★★★★</span>
                    </div>
                    <div class="gear-card-name">${item.name}</div>
                    <div class="gear-card-set">
                        <span>${item.setBonus}</span>
                        <span class="gear-card-set-bonus">${item.setNote}</span>
                    </div>
                    <div class="gear-card-stats">${stats}</div>
                    <div class="gear-card-actions">${actions}</div>
                </div>
            `;
        }

        const inventoryHtml = inventory.slice(2).map((item, i) => `
            <div class="gear-inv-card ${i === 0 ? 'is-selected' : ''}" data-gear-id="${item.id}">
                <div class="gear-inv-card-art"><img src="${GEAR_ICON(slot)}" alt=""></div>
                <div class="gear-inv-card-lvl">LV ${item.level}</div>
            </div>
        `).join('');

        const slotTabs = GEAR_SLOTS.map(s => `
            <button class="gear-slot-tab ${s === slot ? 'is-active' : ''}" data-gear-slot="${s}" title="${s}">
                <img src="${GEAR_ICON(s)}" alt="">
            </button>
        `).join('');

        root.innerHTML = `
            <div class="gear-content">
                <div class="gear-portrait-stage">
                    <img src="${portraitArt}" alt="${hero.name}">
                    <div class="gear-slot-tabs">${slotTabs}</div>
                </div>
                <div class="gear-cards-col">
                    ${buildCard(equipped, 'equipped')}
                    ${buildCard(selected, 'selected')}
                </div>
                <div class="gear-inventory">${inventoryHtml}</div>
            </div>
        `;

        // Wire slot tabs
        root.querySelectorAll('[data-gear-slot]').forEach(btn => {
            btn.addEventListener('click', () => renderGear(btn.dataset.gearSlot));
        });
    }

    function openGear(slot) {
        renderGear(slot || 'chest');
        if (window.Menu) window.Menu.open('gear-selection');
    }

    function equipGear(id) {
        // For prototype: just visual feedback
        const card = document.querySelector(`.gear-card-action[onclick*="${id}"]`);
        if (card) {
            card.textContent = 'Equipped!';
            card.disabled = true;
        }
    }

    // -------- Forge Gear render -------------------------------
    function renderForge(gearId) {
        currentForgeId = gearId;
        const root = document.getElementById('forge-root');
        if (!root) return;

        const slot = currentGearSlot;
        const item = (GEAR_INVENTORY[slot] || []).find(g => g.id === gearId)
                  || GEAR_INVENTORY[slot][1];

        const stats = item.stats.map(s => `
            <div class="gear-card-stat">
                <span class="gear-card-stat-icon"></span>
                <span class="gear-card-stat-name">${s.name}</span>
                <span class="gear-card-stat-val">${s.value}</span>
                <span class="gear-card-stat-delta">${s.delta}</span>
            </div>
        `).join('');

        root.innerHTML = `
            <div class="forge-content">
                <div class="forge-gear-stage">
                    <div class="forge-chance">Upgrade Chance: Low</div>
                    <div class="forge-gear-display">
                        <div class="forge-gear-art"><img src="${GEAR_ICON(slot)}" alt=""></div>
                        <div class="forge-gear-level-row">
                            <span>LV ${item.level}</span>
                            <span class="forge-gear-stars">★★★★★</span>
                        </div>
                        <div class="forge-gear-name">${item.name}</div>
                    </div>
                </div>
                <div class="forge-stats-panel">
                    <div class="forge-stat-big">
                        <span class="forge-stat-big-label">${item.primary.label}</span>
                        <span class="forge-stat-big-value">${item.primary.value - 2}${item.primary.suffix}</span>
                    </div>
                    <span class="forge-set-bonus">${item.setBonus} <small style="opacity:.7;margin-left:6px;">${item.setNote}</small></span>
                    <div class="forge-stat-list">${stats}</div>
                    <div class="forge-reach">Reach Lv ${item.level + 1}</div>
                </div>
                <div class="forge-actions">
                    <button class="forge-action" onclick="Army.forgeAction('sell')">
                        <span class="forge-action-eyebrow">Sell and Receive</span>
                        <span class="forge-action-cost">
                            <img src="../images/icons/inventory_brass.png" alt=""><span>1.5k</span>
                        </span>
                    </button>
                    <button class="forge-action" onclick="Army.forgeAction('level')">
                        <span class="forge-action-eyebrow">Skip Forge Attempts</span>
                        <span class="forge-action-label">Level</span>
                        <span class="forge-action-cost">
                            <img src="../images/icons/inventory_brass.png" alt=""><span>1.5k</span>
                        </span>
                    </button>
                    <button class="forge-action" onclick="Army.forgeAction('forge')">
                        <span class="forge-action-eyebrow">Single Attempt</span>
                        <span class="forge-action-label">Forge</span>
                        <span class="forge-action-cost">
                            <img src="../images/icons/inventory_brass.png" alt=""><span>1.5k</span>
                        </span>
                    </button>
                </div>
            </div>
        `;
    }

    function openForge(gearId) {
        renderForge(gearId);
        if (window.Menu) window.Menu.open('forge-gear');
    }

    function forgeAction(kind) {
        // Stub: brief affordance, then close
        if (window.Menu) window.Menu.close();
    }

    // -------- Init -------------------------------------------
    function init() {
        renderArmyGrid();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        requestAnimationFrame(init);
    }

    // -------- Public API -------------------------------------
    window.Army = {
        openCollection,
        selectHero,
        openLevelUp,
        openGear,
        openForge,
        equipGear,
        forgeAction,
        _heroes: () => HEROES.slice(),
        _gear:   (slot) => GEAR_INVENTORY[slot],
    };
})();
