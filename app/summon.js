/* ============================================================
   SUMMON HERO — gacha system (v2, analyst-tuned)
   Patterns applied (see .claude/agents/agent_game_ux_analyst.md):
     #1  Anticipation curve            — orb → beam → flash → reveal → settle
     #2  Rarity color language         — consistent per-rarity color tokens
     #3  Color tell                    — beam color = highest rarity in pull
     #4  Multi-pull UX                 — 10x, +1 Rare guaranteed, skip, sorted grid
     #5  Pity (visible)                — counter + bar + selector at hard pity
     #7  Daily Free Pull               — visible "FREE" tile, 24h cooldown
     #9  Casino borrowings             — confetti + rays-from-center on Legendary+
     #11 Time-gated chests             — daily-pull cooldown adopts this idea
     #12 Selector chest                — at hard pity, player CHOOSES from 3
     +   x10 highlight reveal          — rarest card pops big first (HSR/AFK)
     +   NEW vs DUPE                   — first-time pulls flagged; dupes show shards

   Public API (window.Summon)
     Summon.openMenu()
     Summon.pull(count)             // 1 or 10
     Summon.pullFree()              // claim daily free pull
     Summon.skipAnimation()
     Summon.closeOverlay()
     Summon.getPity()
     Summon.getResults()
     Summon.canAfford(count)
     Summon._setPity(n)             // debug: force pity
     Summon._resetOwned()           // debug: clear owned heroes
     Summon._resetDailyFree()       // debug: re-enable free pull
   ============================================================ */
(function () {
    'use strict';

    // -------- Asset paths --------------------------------------
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

    // Default starting rank per rarity (visual hint of power)
    const DEFAULT_RANK = {
        common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6,
    };
    // Dupe shard payout per rarity (the "you already own this hero" reward)
    const DUPE_SHARDS = {
        common: 5, uncommon: 10, rare: 25, epic: 50, legendary: 100, mythic: 200,
    };

    // -------- Hero pool ----------------------------------------
    // Each entry mirrors the structure used to render the Gwen card in the
    // Capital City popup, so the same .hero-card component can render every
    // pulled hero — the only thing that changes is data-rarity and the
    // affinity/archetype/rank/portrait fields.
    const HEROES = [
        // Mythic — banner-tier
        { id: 'gwen',     name: 'Gwen the Unbroken', rarity: 'mythic',
          affinity: 'symbioticliquid', archetype: 'tank',  rank: 6,
          portrait: '../assets/characters/Gwen/ui_portrait_card_hero_gwen.png',
          tag: 'Featured 5★' },

        // Legendary
        { id: 'aurelia',  name: 'Aurelia',           rarity: 'legendary',
          affinity: 'energycrystals',  archetype: 'support',   rank: 5 },
        { id: 'kael',     name: 'Kael Ironfang',     rarity: 'legendary',
          affinity: 'livingmetal',     archetype: 'assault',   rank: 5 },

        // Epic
        { id: 'ranger_a', name: 'Storm Ranger',      rarity: 'epic',
          affinity: 'energycrystals',  archetype: 'hunter',    rank: 4 },
        { id: 'mage_a',   name: 'Tide Strategist',   rarity: 'epic',
          affinity: 'symbioticliquid', archetype: 'tactician', rank: 4 },
        { id: 'tank_a',   name: 'Iron Sentinel',     rarity: 'epic',
          affinity: 'livingmetal',     archetype: 'tank',      rank: 4 },

        // Rare
        { id: 'rare_a',   name: 'Crossbow Captain',  rarity: 'rare',
          affinity: 'energycrystals',  archetype: 'hunter',    rank: 3 },
        { id: 'rare_b',   name: 'Battle Cleric',     rarity: 'rare',
          affinity: 'symbioticliquid', archetype: 'support',   rank: 3 },
        { id: 'rare_c',   name: 'Vanguard',          rarity: 'rare',
          affinity: 'livingmetal',     archetype: 'assault',   rank: 3 },

        // Uncommon
        { id: 'unc_a',    name: 'Field Medic',       rarity: 'uncommon',
          affinity: 'symbioticliquid', archetype: 'support',   rank: 2 },
        { id: 'unc_b',    name: 'Scout',             rarity: 'uncommon',
          affinity: 'energycrystals',  archetype: 'hunter',    rank: 2 },
        { id: 'unc_c',    name: 'Foot Soldier',      rarity: 'uncommon',
          affinity: 'livingmetal',     archetype: 'assault',   rank: 2 },
        { id: 'unc_d',    name: 'Pikeman',           rarity: 'uncommon',
          affinity: 'livingmetal',     archetype: 'tank',      rank: 2 },

        // Common
        { id: 'com_a',    name: 'Recruit',           rarity: 'common',
          affinity: 'energycrystals',  archetype: 'assault',   rank: 1 },
        { id: 'com_b',    name: 'Conscript',         rarity: 'common',
          affinity: 'livingmetal',     archetype: 'tank',      rank: 1 },
        { id: 'com_c',    name: 'Squire',            rarity: 'common',
          affinity: 'symbioticliquid', archetype: 'tactician', rank: 1 },
        { id: 'com_d',    name: 'Lookout',           rarity: 'common',
          affinity: 'energycrystals',  archetype: 'hunter',    rank: 1 },
    ];

    // Bucketed by rarity for fast picks
    const POOL = {};
    for (const h of HEROES) (POOL[h.rarity] = POOL[h.rarity] || []).push(h);

    // -------- Rates / cost -------------------------------------
    const BASE_RATES = [
        { rarity: 'mythic',    weight: 0.3 },
        { rarity: 'legendary', weight: 1.7 },
        { rarity: 'epic',      weight: 5   },
        { rarity: 'rare',      weight: 13  },
        { rarity: 'uncommon',  weight: 30  },
        { rarity: 'common',    weight: 50  },
    ];
    const SOFT_PITY_START = 50;
    const HARD_PITY       = 60;

    const COST_X1   = 150;
    const COST_X10  = 1350;
    const COST_RES  = 'brass';
    const FREE_COOLDOWN_MS = 24 * 60 * 60 * 1000;   // 24h
    const HIGHLIGHT_THRESHOLD = 'epic';              // x10 highlight kicks in for epic+

    const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
    const rarityRank = (r) => RARITY_ORDER.indexOf(r);

    // -------- State --------------------------------------------
    let pity = 0;
    let lastResults = [];
    let lastFlags = [];          // parallel array: { isNew: bool, dupeShards: number }
    let isPulling = false;
    const owned = new Set();     // hero ids the player has claimed
    let dailyFreeReadyAt = 0;    // unix ms; 0 = ready

    // -------- RNG / pull math ----------------------------------
    function weightedPick(rates) {
        const total = rates.reduce((s, r) => s + r.weight, 0);
        let roll = Math.random() * total;
        for (const r of rates) {
            roll -= r.weight;
            if (roll <= 0) return r.rarity;
        }
        return rates[rates.length - 1].rarity;
    }
    function ratesWithPity(currentPity) {
        if (currentPity >= HARD_PITY) {
            // The hard-pity result is handled via the SELECTOR flow, not RNG
            return [{ rarity: 'legendary', weight: 1 }];
        }
        if (currentPity >= SOFT_PITY_START) {
            const ramp = (currentPity - SOFT_PITY_START + 1) * 8;
            return BASE_RATES.map(r => r.rarity === 'legendary'
                ? { ...r, weight: r.weight + ramp } : r);
        }
        return BASE_RATES;
    }
    function pickHeroByRarity(rarity) {
        const bucket = POOL[rarity] || POOL.common;
        return bucket[Math.floor(Math.random() * bucket.length)];
    }
    function rollOne() {
        const rarity = weightedPick(ratesWithPity(pity));
        if (rarity === 'legendary' || rarity === 'mythic') pity = 0;
        else pity += 1;
        return pickHeroByRarity(rarity);
    }
    function rollMany(n) {
        const results = [];
        for (let i = 0; i < n; i++) results.push(rollOne());
        if (n === 10) {
            const hasRarePlus = results.some(h => rarityRank(h.rarity) >= rarityRank('rare'));
            if (!hasRarePlus) {
                let worstIdx = 0;
                for (let i = 1; i < results.length; i++) {
                    if (rarityRank(results[i].rarity) < rarityRank(results[worstIdx].rarity)) worstIdx = i;
                }
                results[worstIdx] = pickHeroByRarity('rare');
            }
        }
        return results;
    }

    // Mark each result as NEW or DUPE — does NOT add to owned yet (that
    // happens at "Done" / reveal-confirmation so the moment of ownership
    // lines up with the player's tap, per analyst anti-pattern #6).
    function annotateResults(results) {
        return results.map(h => ({
            isNew: !owned.has(h.id),
            dupeShards: owned.has(h.id) ? DUPE_SHARDS[h.rarity] : 0,
        }));
    }
    function commitOwnership(results) {
        results.forEach(h => owned.add(h.id));
    }

    // -------- Costs --------------------------------------------
    function canAfford(count) {
        const cost = count === 10 ? COST_X10 : COST_X1;
        return window.Inventory ? window.Inventory.get(COST_RES) >= cost : true;
    }
    function spendForPull(count) {
        const cost = count === 10 ? COST_X10 : COST_X1;
        if (!window.Inventory) return true;
        if (!window.Inventory.spend(COST_RES, cost)) {
            window.Inventory.flashInsufficient(COST_RES);
            return false;
        }
        return true;
    }

    // -------- Daily free pull ----------------------------------
    function freeReady()  { return Date.now() >= dailyFreeReadyAt; }
    function freeRemaining() {
        const ms = Math.max(0, dailyFreeReadyAt - Date.now());
        const h = Math.floor(ms / 3.6e6);
        const m = Math.floor((ms % 3.6e6) / 6e4);
        return `${h}h ${m}m`;
    }

    // -------- Card markup --------------------------------------
    // Builds a fully-styled .hero-card identical to the Gwen template,
    // with optional NEW / DUPE overlays and a no-portrait fallback for
    // heroes that don't have full art yet (uses the archetype icon).
    function buildHeroCard(hero, opts) {
        opts = opts || {};
        const portraitSrc = hero.portrait || ARCH[hero.archetype];
        const portraitClass = hero.portrait ? '' : 'hc-portrait--icon';
        const newBadge   = opts.isNew && !opts.skipBadges
            ? '<span class="summon-card-badge summon-card-new">NEW</span>' : '';
        const dupeBadge  = !opts.isNew && opts.dupeShards && !opts.skipBadges
            ? `<span class="summon-card-badge summon-card-dupe">+${opts.dupeShards} <small>shards</small></span>` : '';
        const tag        = hero.tag && opts.showTag
            ? `<div class="summon-card-tag">${hero.tag}</div>` : '';

        return `
            <div class="hero-card summon-hero-card" data-rarity="${hero.rarity}">
                <img class="hc-portrait ${portraitClass}" src="${portraitSrc}" alt="${hero.name}">
                <div class="hc-types">
                    <div class="hc-type-badge" title="Affinity: ${hero.affinity}">
                        <img src="${AFFINITY[hero.affinity]}" alt="">
                    </div>
                    <div class="hc-type-badge" title="Archetype: ${hero.archetype}">
                        <img src="${ARCH[hero.archetype]}" alt="">
                    </div>
                </div>
                <div class="hc-level">
                    <span class="hc-level-prefix">Lv</span>
                    <span class="hc-level-num">1</span>
                </div>
                <img class="hc-rank" src="${RANK_ICON(hero.rank)}" alt="Rank ${hero.rank}">
                ${newBadge}${dupeBadge}${tag}
            </div>
        `;
    }

    function buildSingleReveal(hero, flags) {
        return `
            <div class="summon-single" data-rarity="${hero.rarity}">
                <div class="summon-single-card">
                    ${buildHeroCard(hero, { isNew: flags.isNew, dupeShards: flags.dupeShards, showTag: true })}
                </div>
                <div class="summon-single-name">${hero.name}</div>
                <div class="summon-single-rank summon-rank-${hero.rarity}">${rarityDisplay(hero.rarity)}</div>
            </div>
        `;
    }

    function buildHighlight(hero, flags, count) {
        return `
            <div class="summon-single" data-rarity="${hero.rarity}">
                <div class="summon-single-card">
                    ${buildHeroCard(hero, { isNew: flags.isNew, dupeShards: flags.dupeShards, showTag: true })}
                </div>
                <div class="summon-single-name">${hero.name}</div>
                <div class="summon-single-rank summon-rank-${hero.rarity}">${rarityDisplay(hero.rarity)}</div>
                <div class="summon-highlight-hint">Tap to see all ${count}</div>
            </div>
        `;
    }

    function buildResultGrid(results, flags) {
        // Sort highest rarity first; preserve original index for flag lookup
        const indexed = results.map((h, i) => ({ h, f: flags[i] }));
        indexed.sort((a, b) => rarityRank(b.h.rarity) - rarityRank(a.h.rarity));
        const cells = indexed.map((entry, i) => `
            <div class="summon-grid-cell" style="animation-delay: ${i * 60}ms">
                ${buildHeroCard(entry.h, { isNew: entry.f.isNew, dupeShards: entry.f.dupeShards })}
                <div class="summon-grid-name">${entry.h.name}</div>
            </div>
        `).join('');
        return `<div class="summon-grid">${cells}</div>`;
    }

    function buildSelector(choices) {
        // Three face-down cards. Tapping flips to the hero behind it.
        return `
            <div class="summon-selector">
                <div class="summon-selector-title">PITY REWARD — Choose your Legendary</div>
                <div class="summon-selector-row">
                    ${choices.map((h, i) => `
                        <button class="summon-selector-card" data-selector-idx="${i}">
                            <div class="summon-selector-back">
                                <span class="summon-selector-back-glyph">?</span>
                            </div>
                        </button>
                    `).join('')}
                </div>
                <div class="summon-selector-hint">Tap a card to claim your hero</div>
            </div>
        `;
    }

    function rarityDisplay(r) { return r.charAt(0).toUpperCase() + r.slice(1); }
    function highestRarity(results) {
        let top = results[0];
        for (const h of results) if (rarityRank(h.rarity) > rarityRank(top.rarity)) top = h;
        return top.rarity;
    }
    function highestIndex(results) {
        let topIdx = 0;
        for (let i = 1; i < results.length; i++) {
            if (rarityRank(results[i].rarity) > rarityRank(results[topIdx].rarity)) topIdx = i;
        }
        return topIdx;
    }

    // -------- Confetti / rays (jackpot fanfare) ----------------
    // Spawned when reveal contains Legendary or Mythic. Uses CSS keyframes
    // for the fall + tumble; particles are removed after their animation.
    const CONFETTI_COLORS_LEG  = ['#ffd773', '#ffc043', '#fff5c2', '#ff9d3a', '#ffe9b8'];
    const CONFETTI_COLORS_MYTH = ['#ff5cf0', '#ffd773', '#b066ff', '#ff9d3a', '#ffffff'];

    function spawnJackpotFanfare(rarity) {
        const overlay = document.getElementById('summon-overlay');
        if (!overlay) return;

        // Rays-from-center backdrop (single element with rotating gradient)
        let rays = overlay.querySelector('.summon-rays');
        if (!rays) {
            rays = document.createElement('div');
            rays.className = 'summon-rays';
            overlay.insertBefore(rays, overlay.firstChild);
        }
        rays.classList.remove('rarity-legendary', 'rarity-mythic');
        rays.classList.add('rarity-' + rarity, 'is-active');

        // Confetti
        const colors = rarity === 'mythic' ? CONFETTI_COLORS_MYTH : CONFETTI_COLORS_LEG;
        const count  = rarity === 'mythic' ? 70 : 50;
        const layer  = document.createElement('div');
        layer.className = 'summon-confetti';
        for (let i = 0; i < count; i++) {
            const p = document.createElement('span');
            p.className = 'summon-confetti-piece';
            p.style.left = (Math.random() * 100) + '%';
            p.style.background = colors[Math.floor(Math.random() * colors.length)];
            p.style.animationDuration = (1.6 + Math.random() * 1.4) + 's';
            p.style.animationDelay = (Math.random() * 0.4) + 's';
            p.style.transform = `rotate(${Math.floor(Math.random() * 360)}deg)`;
            p.style.width  = (5 + Math.random() * 7) + 'px';
            p.style.height = (8 + Math.random() * 10) + 'px';
            layer.appendChild(p);
        }
        overlay.appendChild(layer);
        setTimeout(() => {
            layer.remove();
            if (rays) rays.classList.remove('is-active', 'rarity-legendary', 'rarity-mythic');
        }, 3200);
    }

    // -------- Animation orchestration --------------------------
    const T_BUILDUP = 1400;
    const T_BEAM    = 600;
    const T_FLASH   = 280;
    let activeTimers = [];
    function clearTimers() {
        activeTimers.forEach(clearTimeout);
        activeTimers = [];
    }
    function later(fn, ms) {
        const t = setTimeout(fn, ms);
        activeTimers.push(t);
        return t;
    }

    function setOverlayState(state) {
        const overlay = document.getElementById('summon-overlay');
        overlay.classList.remove('is-summoning', 'is-revealing', 'is-highlight', 'is-result', 'is-selector');
        if (state) overlay.classList.add(state);
    }

    function refreshSummonScreen() {
        const pityNum  = document.getElementById('summon-pity-num');
        const pityFill = document.getElementById('summon-pity-fill');
        if (pityNum)  pityNum.textContent  = `${pity} / ${HARD_PITY}`;
        if (pityFill) pityFill.style.width = Math.min(100, (pity / HARD_PITY) * 100) + '%';

        // Pull buttons — disable + dim when not affordable, gentle pulse on affordable x10
        document.querySelectorAll('[data-summon-pull]').forEach(btn => {
            const n = parseInt(btn.dataset.summonPull, 10);
            const ok = canAfford(n);
            btn.classList.toggle('is-disabled', !ok);
            btn.classList.toggle('is-ready-pulse', ok && n === 10);
        });

        // Daily free pull tile
        const free = document.getElementById('summon-free-tile');
        if (free) {
            const ready = freeReady();
            free.classList.toggle('is-ready', ready);
            free.classList.toggle('is-cooldown', !ready);
            const stateLabel = free.querySelector('[data-free-state]');
            const cdLabel    = free.querySelector('[data-free-cd]');
            if (stateLabel) stateLabel.textContent = ready ? 'FREE' : 'On cooldown';
            if (cdLabel)    cdLabel.textContent    = ready ? 'Ready now' : `Next in ${freeRemaining()}`;
        }
    }

    // Selector flow — used at hard pity. Picks 3 distinct legendaries the
    // player chooses between. Returns immediately; the actual selection
    // happens on tap and goes through finalizeSinglePull().
    function startSelectorFlow() {
        // Pick 3 distinct legendaries
        const pool = POOL.legendary.slice();
        // Add one mythic chance into the selector (small dopamine): 1-in-3
        // pity rewards include a mythic option
        if (Math.random() < 0.33 && POOL.mythic.length) {
            pool.push(POOL.mythic[Math.floor(Math.random() * POOL.mythic.length)]);
        }
        // Shuffle and take 3
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const choices = pool.slice(0, 3);
        const overlay = document.getElementById('summon-overlay');
        const slot    = document.getElementById('summon-selector');
        if (!slot) return;
        slot.innerHTML = buildSelector(choices);
        setOverlayState('is-selector');

        // Wire taps
        slot.querySelectorAll('[data-selector-idx]').forEach((btn, idx) => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('is-revealed')) return;
                // Flip the chosen card; mark others as discarded
                slot.querySelectorAll('[data-selector-idx]').forEach(other => {
                    if (other !== btn) other.classList.add('is-discarded');
                });
                const chosen = choices[idx];
                btn.classList.add('is-revealed');
                btn.innerHTML = buildHeroCard(chosen, { isNew: !owned.has(chosen.id),
                                                        dupeShards: owned.has(chosen.id) ? DUPE_SHARDS[chosen.rarity] : 0,
                                                        showTag: true });
                // Reset pity now that the player claimed
                pity = 0;
                refreshSummonScreen();

                // After a beat, transition into the standard single-reveal so
                // the player gets fanfare consistent with all other pulls
                later(() => {
                    lastResults = [chosen];
                    lastFlags   = annotateResults([chosen]);
                    document.getElementById('summon-reveal').innerHTML =
                        buildSingleReveal(chosen, lastFlags[0]);
                    setOverlayState('is-revealing');
                    if (rarityRank(chosen.rarity) >= rarityRank('legendary')) {
                        spawnJackpotFanfare(chosen.rarity);
                    }
                    isPulling = false;
                }, 900);
            });
        });
    }

    function playPullAnimation(results, flags, count) {
        const overlay = document.getElementById('summon-overlay');
        const beam    = document.getElementById('summon-beam');
        const flash   = document.getElementById('summon-flash');
        const reveal  = document.getElementById('summon-reveal');
        const result  = document.getElementById('summon-result');
        const hi      = document.getElementById('summon-highlight');

        const topRarity = highestRarity(results);

        setOverlayState('is-summoning');
        beam.className   = 'summon-beam';
        flash.className  = 'summon-flash';
        reveal.innerHTML = '';
        result.innerHTML = '';
        if (hi) hi.innerHTML = '';

        later(() => beam.classList.add('is-active', 'rarity-' + topRarity), T_BUILDUP);
        later(() => flash.classList.add('is-active', 'rarity-' + topRarity), T_BUILDUP + T_BEAM);

        later(() => {
            if (count === 1) {
                reveal.innerHTML = buildSingleReveal(results[0], flags[0]);
                setOverlayState('is-revealing');
                if (rarityRank(results[0].rarity) >= rarityRank('legendary')) {
                    spawnJackpotFanfare(results[0].rarity);
                }
            } else {
                // x10 highlight: if the top rarity is Epic+, show that hero
                // BIG first with a "Tap to see all" prompt before the grid.
                const showHighlight = rarityRank(topRarity) >= rarityRank(HIGHLIGHT_THRESHOLD);
                if (showHighlight && hi) {
                    const idx = highestIndex(results);
                    hi.innerHTML = buildHighlight(results[idx], flags[idx], count);
                    setOverlayState('is-highlight');
                    if (rarityRank(topRarity) >= rarityRank('legendary')) {
                        spawnJackpotFanfare(topRarity);
                    }
                } else {
                    result.innerHTML = buildResultGrid(results, flags);
                    setOverlayState('is-result');
                }
            }
            isPulling = false;
        }, T_BUILDUP + T_BEAM + T_FLASH);
    }

    // -------- Public actions -----------------------------------
    function pull(count) {
        count = (count === 10) ? 10 : 1;
        if (isPulling) return;

        // Hard-pity check happens BEFORE charging — show selector for free
        // (pity reset happens inside the selector once the player picks).
        if (pity >= HARD_PITY && count === 1) {
            // Player still pays for the pull (pity was earned by spending)
            if (!canAfford(count)) {
                if (window.Inventory) window.Inventory.flashInsufficient(COST_RES);
                return;
            }
            if (!spendForPull(count)) return;
            isPulling = true;
            const overlay = document.getElementById('summon-overlay');
            if (overlay) overlay.classList.add('is-open');
            startSelectorFlow();
            return;
        }

        if (!canAfford(count)) {
            if (window.Inventory) window.Inventory.flashInsufficient(COST_RES);
            return;
        }
        if (!spendForPull(count)) return;
        isPulling = true;

        const results = rollMany(count);
        lastResults = results;
        lastFlags   = annotateResults(results);
        refreshSummonScreen();

        const overlay = document.getElementById('summon-overlay');
        if (overlay) overlay.classList.add('is-open');
        playPullAnimation(results, lastFlags, count);
    }

    function pullFree() {
        if (isPulling) return;
        if (!freeReady()) return;
        dailyFreeReadyAt = Date.now() + FREE_COOLDOWN_MS;
        isPulling = true;
        const results = [rollOne()];
        lastResults = results;
        lastFlags   = annotateResults(results);
        refreshSummonScreen();
        const overlay = document.getElementById('summon-overlay');
        if (overlay) overlay.classList.add('is-open');
        playPullAnimation(results, lastFlags, 1);
    }

    function skipAnimation() {
        if (!isPulling) return;
        clearTimers();
        const beam   = document.getElementById('summon-beam');
        const flash  = document.getElementById('summon-flash');
        const reveal = document.getElementById('summon-reveal');
        const result = document.getElementById('summon-result');
        const hi     = document.getElementById('summon-highlight');
        beam.classList.remove('is-active');
        flash.classList.remove('is-active');
        const count = lastResults.length;
        const topRarity = highestRarity(lastResults);
        if (count === 1) {
            reveal.innerHTML = buildSingleReveal(lastResults[0], lastFlags[0]);
            setOverlayState('is-revealing');
            if (rarityRank(lastResults[0].rarity) >= rarityRank('legendary')) {
                spawnJackpotFanfare(lastResults[0].rarity);
            }
        } else {
            const showHighlight = rarityRank(topRarity) >= rarityRank(HIGHLIGHT_THRESHOLD);
            if (showHighlight && hi) {
                const idx = highestIndex(lastResults);
                hi.innerHTML = buildHighlight(lastResults[idx], lastFlags[idx], count);
                setOverlayState('is-highlight');
                if (rarityRank(topRarity) >= rarityRank('legendary')) {
                    spawnJackpotFanfare(topRarity);
                }
            } else {
                result.innerHTML = buildResultGrid(lastResults, lastFlags);
                setOverlayState('is-result');
            }
        }
        isPulling = false;
    }

    function expandHighlightToGrid() {
        // Called when the player taps through the highlight stage
        const result = document.getElementById('summon-result');
        result.innerHTML = buildResultGrid(lastResults, lastFlags);
        setOverlayState('is-result');
    }

    function closeOverlay() {
        if (isPulling) return;
        // Commit ownership at the moment the player taps Done (per analyst
        // anti-pattern #6 — confirmation is part of the dopamine)
        commitOwnership(lastResults);
        const overlay = document.getElementById('summon-overlay');
        if (overlay) overlay.classList.remove('is-open');
        setOverlayState(null);
        clearTimers();
    }

    function openMenu() {
        if (window.Menu && typeof window.Menu.open === 'function') {
            window.Menu.open('summon');
        }
        requestAnimationFrame(refreshSummonScreen);
    }

    // -------- Init --------------------------------------------
    function init() {
        refreshSummonScreen();

        // Tick free-pull cooldown each minute so the label stays current
        setInterval(refreshSummonScreen, 60 * 1000);

        const overlay = document.getElementById('summon-overlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target.closest('[data-summon-action]'))   return;
                if (e.target.closest('[data-selector-idx]'))    return;
                if (overlay.classList.contains('is-summoning')) {
                    skipAnimation();
                    return;
                }
                if (overlay.classList.contains('is-highlight')) {
                    expandHighlightToGrid();
                    return;
                }
                if ((overlay.classList.contains('is-revealing') ||
                     overlay.classList.contains('is-result')) && e.target === overlay) {
                    closeOverlay();
                }
            });
        }

        document.querySelectorAll('[data-summon-pull]').forEach(btn => {
            btn.addEventListener('click', () => pull(parseInt(btn.dataset.summonPull, 10)));
        });
        const freeBtn = document.querySelector('[data-summon-free]');
        if (freeBtn) freeBtn.addEventListener('click', pullFree);

        document.querySelectorAll('[data-summon-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.summonAction;
                if (action === 'close') {
                    closeOverlay();
                } else if (action === 'pull-1' || action === 'pull-10') {
                    const n = action === 'pull-10' ? 10 : 1;
                    closeOverlay();
                    requestAnimationFrame(() => pull(n));
                }
            });
        });

        if (window.Inventory && window.Inventory.subscribe) {
            window.Inventory.subscribe(() => refreshSummonScreen());
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        requestAnimationFrame(init);
    }

    // -------- Public API ---------------------------------------
    window.Summon = {
        openMenu,
        pull,
        pullFree,
        skipAnimation,
        closeOverlay,
        getPity:    () => pity,
        getResults: () => lastResults.slice(),
        canAfford,
        // Debug
        _setPity:        (n) => { pity = Math.max(0, Math.min(HARD_PITY, n)); refreshSummonScreen(); },
        _resetOwned:     ()  => { owned.clear(); },
        _resetDailyFree: ()  => { dailyFreeReadyAt = 0; refreshSummonScreen(); },
        _heroes:         ()  => HEROES.slice(),
        _cost:           ()  => ({ x1: COST_X1, x10: COST_X10, currency: COST_RES }),
    };
})();
