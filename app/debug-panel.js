/* ============================================================
   NOTIFICATION DEBUG PANEL
   Inspects all elements with [data-badge-target] and lets you
   set/clear their badge state. Enforces guide rules:
     - One badge per element (priority: alert > arrow > number > new > dot)
     - Click any badged element to auto-clear its badge
     - "NEW" badges auto-clear after 48hr (simulated via 30s in debug)
     - Warns if total visible badges > 7 (Christmas tree rule)
   ============================================================ */

(function () {
    'use strict';

    const BADGE_TYPES = [
        { value: 'none',   label: '— None —',          priority: 0 },
        { value: 'alert',  label: '! Alert (yellow)',  priority: 5 },  // expires <24hr
        { value: 'arrow',  label: '↑ Arrow (green)',   priority: 4 },  // can upgrade
        { value: 'number', label: '# Number (purple)', priority: 3 },  // count
        { value: 'new',    label: 'NEW (blue)',        priority: 2 },  // fresh content
        { value: 'dot',    label: '● Dot (red)',       priority: 1 },  // general
    ];

    // --- Build panel DOM ---------------------------------------
    const toggle = document.createElement('button');
    toggle.className = 'debug-toggle';
    toggle.title = 'Notification debug panel (D)';
    toggle.textContent = '🐞';
    document.body.appendChild(toggle);

    const panel = document.createElement('aside');
    panel.className = 'debug-panel';
    panel.innerHTML = `
        <div class="debug-header">
            <div class="debug-title">Prototype Debug</div>
            <div class="debug-subtitle">Configure notification badges and player inventory.</div>
        </div>

        <!-- Tab switcher -->
        <div class="debug-tabs">
            <button class="debug-tab active" data-tab="badges">Badges</button>
            <button class="debug-tab" data-tab="inventory">Inventory</button>
            <button class="debug-tab" data-tab="conquest">Conquest</button>
            <button class="debug-tab" data-tab="positions">Positions</button>
        </div>

        <!-- BADGES TAB -->
        <div class="debug-tab-panel" data-panel="badges">
            <div class="debug-stats">
                <span class="debug-stats-label">Visible badges</span>
                <span class="debug-stats-count" id="debugBadgeCount">0 / 7</span>
            </div>
            <div class="debug-actions">
                <button class="debug-btn" data-action="reset">Reset</button>
                <button class="debug-btn" data-action="all-arrow">All ↑</button>
                <button class="debug-btn" data-action="all-alert">All !</button>
                <button class="debug-btn danger" data-action="clear">Clear All</button>
            </div>
            <div class="debug-list" id="debugList"></div>
        </div>

        <!-- POSITIONS TAB -->
        <div class="debug-tab-panel" data-panel="positions" hidden>
            <div class="debug-section-title">Notification Badge Positions</div>
            <div class="debug-subtitle" style="padding: 0 18px 8px;">
                Live-edit badge anchor offsets per element category.
                Changes apply globally and persist (localStorage).
            </div>
            <div class="debug-actions">
                <button class="debug-btn danger" data-action="pos-reset-all">Reset All</button>
            </div>
            <div class="debug-list" id="positionList"></div>
        </div>

        <!-- INVENTORY TAB -->
        <div class="debug-tab-panel" data-panel="inventory" hidden>
            <div class="debug-section-title">HUD Resources</div>
            <div class="debug-subtitle" style="padding: 0 18px 8px;">
                Toggle which resources show in the top-right HUD pills.
            </div>
            <div class="debug-actions">
                <button class="debug-btn" data-action="inv-give-100">+100 each</button>
                <button class="debug-btn" data-action="inv-spend-50">−50 each</button>
                <button class="debug-btn danger" data-action="inv-zero">Zero out</button>
                <button class="debug-btn" data-action="inv-reset">Reset</button>
            </div>
            <div class="debug-list" id="inventoryList"></div>
        </div>

        <!-- CONQUEST TAB -->
        <div class="debug-tab-panel" data-panel="conquest" hidden>
            <div class="debug-section-title">Conquest Guide</div>
            <div class="debug-subtitle" style="padding: 0 18px 8px;">
                Open the guide and exercise the claim/animation flow.
            </div>
            <div class="debug-actions">
                <button class="debug-btn" data-action="cq-open">Open Guide</button>
                <button class="debug-btn" data-action="cq-close">Close Guide</button>
            </div>
            <div class="debug-actions">
                <button class="debug-btn" data-action="cq-claim-next">Claim Next</button>
                <button class="debug-btn" data-action="cq-claim-all">Claim All</button>
            </div>
            <div class="debug-actions">
                <button class="debug-btn" data-action="cq-mark-claimable">Mark Next Claimable</button>
                <button class="debug-btn" data-action="cq-advance">Advance Progress (+1)</button>
            </div>
            <div class="debug-actions">
                <button class="debug-btn danger" data-action="cq-reset">Reset Chapter</button>
            </div>
            <div class="debug-list" id="conquestList"></div>
        </div>

        <div class="debug-footer">
            Press <kbd>D</kbd> to toggle. Click any badged map button to auto-clear its badge.
            NEW badges auto-clear after 30s in debug mode.
        </div>
    `;
    document.body.appendChild(panel);

    const listEl   = panel.querySelector('#debugList');
    const countEl  = panel.querySelector('#debugBadgeCount');

    // --- State ---------------------------------------------------
    /**
     * Map of target id -> { type, count, host, badgeEl, defaultType, defaultCount, autoClearTimer }
     */
    const targets = new Map();

    function readBadge(host) {
        const badgeEl = host.querySelector(':scope > .badge');
        if (!badgeEl) return { type: 'none', count: 1 };
        for (const t of BADGE_TYPES) {
            if (t.value !== 'none' && badgeEl.classList.contains('badge-' + t.value)) {
                let count = 1;
                if (t.value === 'number') count = parseInt(badgeEl.textContent, 10) || 1;
                return { type: t.value, count };
            }
        }
        return { type: 'none', count: 1 };
    }

    function applyBadge(targetId, type, count) {
        const t = targets.get(targetId);
        if (!t) return;
        t.type  = type;
        t.count = Math.max(1, count || 1);

        // Cancel any pending auto-clear
        if (t.autoClearTimer) {
            clearTimeout(t.autoClearTimer);
            t.autoClearTimer = null;
        }

        // Remove any existing badge child
        let badgeEl = t.host.querySelector(':scope > .badge');
        if (badgeEl) badgeEl.remove();

        if (type === 'none') {
            t.badgeEl = null;
        } else {
            const span = document.createElement('span');
            span.className = 'badge badge-' + type;
            if (type === 'alert')  span.textContent = '!';
            if (type === 'arrow')  span.textContent = '↑';
            if (type === 'new')    span.textContent = 'NEW';
            if (type === 'number') span.textContent = String(t.count);
            t.host.appendChild(span);
            t.badgeEl = span;

            // Per the guide: NEW badges auto-clear after 24-48h.
            // In debug mode, use 30 seconds so it's observable.
            if (type === 'new') {
                t.autoClearTimer = setTimeout(() => {
                    if (t.type === 'new') {
                        applyBadge(targetId, 'none');
                        syncControls(targetId);
                        updateStats();
                    }
                }, 30 * 1000);
            }
        }
        updateStats();
    }

    function syncControls(targetId) {
        const t = targets.get(targetId);
        const sel = panel.querySelector(`select[data-target="${targetId}"]`);
        const num = panel.querySelector(`input[data-target="${targetId}"]`);
        if (sel) sel.value = t.type;
        if (num) {
            num.value = t.count;
            num.hidden = (t.type !== 'number');
        }
    }

    function updateStats() {
        let visible = 0;
        targets.forEach(t => { if (t.type !== 'none') visible++; });
        countEl.textContent = `${visible} / 7`;
        countEl.classList.toggle('warn', visible > 5 && visible <= 7);
        countEl.classList.toggle('over', visible > 7);
    }

    // --- Discover all badge-able elements -----------------------
    function discoverTargets() {
        const hosts = document.querySelectorAll('[data-badge-target]');
        hosts.forEach(host => {
            const id    = host.dataset.badgeTarget;
            const label = host.dataset.badgeLabel || id;
            // Make sure host is positioned so absolute badge anchors work
            const cs = getComputedStyle(host);
            if (cs.position === 'static') host.style.position = 'relative';

            const initial = readBadge(host);
            targets.set(id, {
                label,
                host,
                type:         initial.type,
                count:        initial.count,
                defaultType:  initial.type,
                defaultCount: initial.count,
                badgeEl:      host.querySelector(':scope > .badge'),
                autoClearTimer: null,
            });

            // Wire click-to-clear (guide rule: action complete = badge clears)
            host.addEventListener('click', (e) => {
                const t = targets.get(id);
                if (t.type !== 'none') {
                    applyBadge(id, 'none');
                    syncControls(id);
                }
            });
        });
    }

    // --- Render the panel rows ---------------------------------
    function renderList() {
        const rows = [];
        targets.forEach((t, id) => {
            const opts = BADGE_TYPES.map(b =>
                `<option value="${b.value}" ${t.type === b.value ? 'selected' : ''}>${b.label}</option>`
            ).join('');
            rows.push(`
                <div class="debug-item">
                    <div class="debug-item-row">
                        <span class="debug-item-name">${t.label}</span>
                        <select class="debug-item-select" data-target="${id}">${opts}</select>
                        <input type="number" class="debug-item-number" data-target="${id}"
                               value="${t.count}" min="1" max="999" ${t.type !== 'number' ? 'hidden' : ''}>
                    </div>
                </div>
            `);
        });
        listEl.innerHTML = rows.join('');

        // Wire change handlers
        listEl.querySelectorAll('select[data-target]').forEach(sel => {
            sel.addEventListener('change', (e) => {
                const id   = sel.dataset.target;
                const type = sel.value;
                const t    = targets.get(id);
                applyBadge(id, type, t.count);
                syncControls(id);
            });
        });
        listEl.querySelectorAll('input[data-target]').forEach(num => {
            num.addEventListener('input', (e) => {
                const id    = num.dataset.target;
                const count = parseInt(num.value, 10) || 1;
                const t     = targets.get(id);
                if (t.type === 'number') applyBadge(id, 'number', count);
            });
        });
    }

    // --- Quick action buttons ----------------------------------
    panel.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            if (action === 'reset') {
                targets.forEach((t, id) => applyBadge(id, t.defaultType, t.defaultCount));
            } else if (action === 'clear') {
                targets.forEach((t, id) => applyBadge(id, 'none'));
            } else if (action === 'all-arrow') {
                targets.forEach((t, id) => applyBadge(id, 'arrow'));
            } else if (action === 'all-alert') {
                targets.forEach((t, id) => applyBadge(id, 'alert'));
            }
            // Resync all controls
            targets.forEach((_, id) => syncControls(id));
        });
    });

    // --- Toggle visibility -------------------------------------
    function setOpen(open) {
        panel.classList.toggle('open', open);
        toggle.classList.toggle('open', open);
    }
    toggle.addEventListener('click', () => setOpen(!panel.classList.contains('open')));
    document.addEventListener('keydown', (e) => {
        // Ignore typing in inputs
        if (e.target.matches('input, select, textarea')) return;
        if (e.key === 'd' || e.key === 'D') setOpen(!panel.classList.contains('open'));
    });

    // ============================================================
    // INVENTORY TAB
    // ============================================================
    const invListEl = panel.querySelector('#inventoryList');
    const inventoryDefaults = {}; // snapshot of starting amounts for "Reset"

    function renderInventoryList() {
        if (!window.Inventory) return;
        const all = window.Inventory.getAllResources();
        if (Object.keys(inventoryDefaults).length === 0) {
            all.forEach(r => { inventoryDefaults[r.id] = r.initial; });
        }
        const primarySet = new Set(window.Inventory.getPrimary());

        const rows = all.map(r => {
            const isPrimary = primarySet.has(r.id);
            const current = window.Inventory.get(r.id);
            return `
                <div class="debug-item inv-row" data-resource="${r.id}">
                    <div class="debug-item-row">
                        <label class="inv-primary-toggle" title="Show in HUD">
                            <input type="checkbox" data-inv-primary="${r.id}" ${isPrimary ? 'checked' : ''}>
                            <img src="${r.icon}" alt="" class="inv-icon">
                        </label>
                        <span class="debug-item-name">${r.display}</span>
                        <span class="inv-amount" data-inv-amount="${r.id}">${current.toLocaleString()}</span>
                    </div>
                    <div class="debug-item-row inv-quick">
                        <button class="debug-btn" data-inv-give="${r.id}" data-amt="100">+100</button>
                        <button class="debug-btn" data-inv-spend="${r.id}" data-amt="50">−50</button>
                        <button class="debug-btn" data-inv-spend="${r.id}" data-amt="9999">Drain</button>
                    </div>
                </div>
            `;
        }).join('');
        invListEl.innerHTML = rows;

        // Wire primary toggles
        invListEl.querySelectorAll('[data-inv-primary]').forEach(cb => {
            cb.addEventListener('change', () => {
                const checked = invListEl.querySelectorAll('[data-inv-primary]:checked');
                const primaryIds = Array.from(checked).map(c => c.dataset.invPrimary);
                window.Inventory.setPrimary(primaryIds);
            });
        });

        // Wire +/-/drain buttons
        invListEl.querySelectorAll('[data-inv-give]').forEach(b => {
            b.addEventListener('click', () => {
                window.Inventory.add(b.dataset.invGive, parseInt(b.dataset.amt, 10));
                refreshAmounts();
            });
        });
        invListEl.querySelectorAll('[data-inv-spend]').forEach(b => {
            b.addEventListener('click', () => {
                const r = b.dataset.invSpend;
                const a = parseInt(b.dataset.amt, 10);
                if (!window.Inventory.spend(r, a)) {
                    window.Inventory.flashInsufficient(r);
                }
                refreshAmounts();
            });
        });
    }

    function refreshAmounts() {
        if (!window.Inventory) return;
        invListEl.querySelectorAll('[data-inv-amount]').forEach(el => {
            el.textContent = window.Inventory.get(el.dataset.invAmount).toLocaleString();
        });
    }

    // Subscribe to inventory changes so the panel stays in sync
    function subscribeInventory() {
        if (!window.Inventory || !window.Inventory.subscribe) return;
        window.Inventory.subscribe((res, val) => {
            const cell = invListEl.querySelector(`[data-inv-amount="${res}"]`);
            if (cell) cell.textContent = val.toLocaleString();
        });
    }

    // Quick-action buttons
    panel.querySelectorAll('[data-action^="inv-"]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!window.Inventory) return;
            const action = btn.dataset.action;
            const all = window.Inventory.getAllResources();
            if (action === 'inv-give-100') {
                all.forEach(r => window.Inventory.add(r.id, 100));
            } else if (action === 'inv-spend-50') {
                all.forEach(r => {
                    if (!window.Inventory.spend(r.id, 50)) {
                        window.Inventory.flashInsufficient(r.id);
                    }
                });
            } else if (action === 'inv-zero') {
                all.forEach(r => window.Inventory.set(r.id, 0));
            } else if (action === 'inv-reset') {
                all.forEach(r => window.Inventory.set(r.id, inventoryDefaults[r.id] || 0));
            }
            refreshAmounts();
        });
    });

    // ============================================================
    // CONQUEST TAB
    // ============================================================
    // Lets us exercise the Conquest Guide: open/close the drawer,
    // claim individual missions to test the fly-to-inventory animation,
    // mark missions claimable to verify state transitions, and reset
    // the chapter to its initial DOM snapshot.
    const cqListEl = panel.querySelector('#conquestList');
    let conquestSnapshot = null;   // outerHTML of #conquest-missions on first init

    function captureConquestSnapshot() {
        const list = document.getElementById('conquest-missions');
        if (list && conquestSnapshot === null) {
            conquestSnapshot = list.innerHTML;
        }
    }

    function getMissionCards() {
        return Array.from(document.querySelectorAll('#conquest-missions .mission-card'));
    }

    function missionState(card) {
        if (card.classList.contains('is-claimed'))     return 'claimed';
        if (card.classList.contains('is-claimable'))   return 'claimable';
        if (card.classList.contains('is-locked'))      return 'locked';
        return 'progress';
    }

    function renderConquestList() {
        const cards = getMissionCards();
        if (cards.length === 0) {
            cqListEl.innerHTML = '<div class="debug-subtitle" style="padding:0 18px;">No missions found. Open the guide once to mount it.</div>';
            return;
        }
        cqListEl.innerHTML = cards.map(card => {
            const id    = card.dataset.mission;
            const title = card.querySelector('.mission-title')?.textContent || id;
            const state = missionState(card);
            return `
                <div class="debug-item" data-cq-row="${id}">
                    <div class="debug-item-row">
                        <span class="debug-item-name" style="flex:1;">${title}</span>
                        <span class="debug-item-name" style="opacity:.65;font-size:11px;">${state}</span>
                    </div>
                    <div class="debug-item-row">
                        <button class="debug-btn" data-cq-state="${id}" data-state="claimable">Claimable</button>
                        <button class="debug-btn" data-cq-state="${id}" data-state="progress">In&nbsp;Progress</button>
                        <button class="debug-btn" data-cq-state="${id}" data-state="locked">Locked</button>
                        <button class="debug-btn" data-cq-state="${id}" data-state="claimed">Claimed</button>
                    </div>
                </div>
            `;
        }).join('');

        // Wire per-mission state buttons
        cqListEl.querySelectorAll('[data-cq-state]').forEach(btn => {
            btn.addEventListener('click', () => {
                setMissionState(btn.dataset.cqState, btn.dataset.state);
                renderConquestList();
                if (typeof window.refreshConquestProgress === 'function') {
                    window.refreshConquestProgress();
                }
            });
        });
    }

    // Force a mission card into a particular state (no animations — just
    // toggles classes and sets the action button text/disabled).
    function setMissionState(id, state) {
        const card = document.querySelector(`#conquest-missions .mission-card[data-mission="${id}"]`);
        if (!card) return;
        card.classList.remove('is-claimed', 'is-claimable', 'is-locked');
        const action = card.querySelector('.mission-action');
        const fill   = card.querySelector('.mission-progress-fill');
        const text   = card.querySelector('.mission-progress-text');

        if (state === 'claimable') {
            card.classList.add('is-claimable');
            if (fill) fill.style.width = '100%';
            if (text) {
                const m = (text.textContent || '').match(/\/\s*(\d+)/);
                const total = m ? m[1] : '1';
                text.textContent = `${total} / ${total}`;
            }
            if (action) {
                action.textContent = 'Claim';
                action.disabled = false;
                action.onclick = () => window.claimMission(id);
            }
        } else if (state === 'progress') {
            if (fill) fill.style.width = '40%';
            if (text) {
                const m = (text.textContent || '').match(/\/\s*(\d+)/);
                const total = m ? parseInt(m[1], 10) : 5;
                text.textContent = `${Math.max(1, Math.floor(total * 0.4))} / ${total}`;
            }
            if (action) {
                action.textContent = 'Go';
                action.disabled = false;
                action.onclick = () => window.missionGo(id);
            }
        } else if (state === 'locked') {
            card.classList.add('is-locked');
            if (fill) fill.style.width = '0%';
            if (text) {
                const m = (text.textContent || '').match(/\/\s*(\d+)/);
                const total = m ? m[1] : '1';
                text.textContent = `0 / ${total}`;
            }
            if (action) {
                action.textContent = 'Locked';
                action.disabled = true;
                action.onclick = null;
            }
        } else if (state === 'claimed') {
            card.classList.add('is-claimed');
            if (fill) fill.style.width = '100%';
            if (text) {
                const m = (text.textContent || '').match(/\/\s*(\d+)/);
                const total = m ? m[1] : '1';
                text.textContent = `${total} / ${total}`;
            }
            if (action) {
                action.textContent = 'Claimed';
                action.disabled = true;
                action.onclick = null;
            }
        }
    }

    // Wire the top-level conquest action buttons
    panel.querySelectorAll('[data-action^="cq-"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            captureConquestSnapshot();

            if (action === 'cq-open' && typeof window.openConquestGuide === 'function') {
                window.openConquestGuide();
            } else if (action === 'cq-close' && typeof window.closeConquestGuide === 'function') {
                window.closeConquestGuide();
            } else if (action === 'cq-claim-next') {
                const next = getMissionCards().find(c => c.classList.contains('is-claimable'));
                if (next && typeof window.claimMission === 'function') {
                    window.claimMission(next.dataset.mission);
                }
            } else if (action === 'cq-claim-all') {
                // Mark every non-claimed card claimable, then claim them in
                // sequence with a small delay so the animation can play out.
                const claimables = getMissionCards()
                    .filter(c => !c.classList.contains('is-claimed'))
                    .map(c => c.dataset.mission);
                claimables.forEach(id => setMissionState(id, 'claimable'));
                claimables.forEach((id, i) => {
                    setTimeout(() => {
                        if (typeof window.claimMission === 'function') {
                            window.claimMission(id);
                        }
                    }, i * 850);
                });
            } else if (action === 'cq-mark-claimable') {
                const next = getMissionCards().find(c =>
                    !c.classList.contains('is-claimed') &&
                    !c.classList.contains('is-claimable')
                );
                if (next) {
                    setMissionState(next.dataset.mission, 'claimable');
                }
            } else if (action === 'cq-advance') {
                // Pick the first non-claimed, non-claimable in-progress card
                // and bump its progress by 1 step (or flip to claimable when
                // it hits the target).
                const card = getMissionCards().find(c => {
                    const s = missionState(c);
                    return s === 'progress' || s === 'locked';
                });
                if (card) {
                    const text = card.querySelector('.mission-progress-text');
                    const fill = card.querySelector('.mission-progress-fill');
                    if (text && fill) {
                        const m = text.textContent.match(/(\d+)\s*\/\s*(\d+)/);
                        if (m) {
                            const cur = Math.min(parseInt(m[1], 10) + 1, parseInt(m[2], 10));
                            const tot = parseInt(m[2], 10);
                            text.textContent = `${cur} / ${tot}`;
                            fill.style.width = (cur / tot * 100) + '%';
                            // Unlock + flip to claimable when complete
                            card.classList.remove('is-locked');
                            if (cur >= tot) {
                                setMissionState(card.dataset.mission, 'claimable');
                            }
                        }
                    }
                }
            } else if (action === 'cq-reset') {
                const list = document.getElementById('conquest-missions');
                if (list && conquestSnapshot !== null) {
                    list.innerHTML = conquestSnapshot;
                    // Re-bind onclick on each action button (innerHTML wipes JS bindings)
                    list.querySelectorAll('.mission-card').forEach(card => {
                        const id = card.dataset.mission;
                        const action = card.querySelector('.mission-action');
                        if (!action) return;
                        if (card.classList.contains('is-claimable')) {
                            action.onclick = () => window.claimMission(id);
                        } else if (!card.classList.contains('is-claimed') &&
                                   !card.classList.contains('is-locked')) {
                            action.onclick = () => window.missionGo(id);
                        }
                    });
                }
            }
            renderConquestList();
            if (typeof window.refreshConquestProgress === 'function') {
                window.refreshConquestProgress();
            }
        });
    });

    // ============================================================
    // POSITIONS TAB
    // ============================================================
    // Live-edits the CSS for badge positions per element category.
    // Values are written into a <style id="debug-badge-positions">
    // element so they cascade-override the rules in badges.css/menus.css.
    const POSITION_CATEGORIES = [
        {
            id: 'hud',
            label: 'Map HUD Buttons',
            note: 'Empire Summary, Conquest, Buildings, Offers, Store, Summon Hero',
            selector: '.hud-btn .badge, .hud-btn-large .badge',
            defaults: { top: '14.6%', right: '14.6%', left: '', tx: '50%', ty: '-50%' },
        },
        {
            id: 'std',
            label: 'Standard Buttons (cyan + green)',
            note: 'Popup buttons, UPGRADE, Change Governor, Enter Empire',
            selector: '.popup-btn .badge, .nslice-btn-cyan .badge, .btn-green-primary .badge',
            defaults: { top: '0', right: '0', left: '', tx: '50%', ty: '-50%' },
        },
        {
            id: 'tab',
            label: 'Tab Buttons (diamond)',
            note: 'Fullscreen menu side tabs',
            selector: '.tab-btn .badge',
            defaults: { top: '50%', right: 'auto', left: 'clamp(95px, 10vw, 150px)', tx: '0', ty: '-50%' },
        },
        {
            id: 'card',
            label: 'Card Buttons (building / hero / troop)',
            note: 'Building cards, hero cards, troop cards',
            selector: '.building-card .badge, .hero-card .badge, .troop-card .badge',
            defaults: { top: '0', right: '0', left: '', tx: '50%', ty: '-50%' },
        },
    ];

    const POS_STORAGE_KEY = 'debug-badge-positions';
    let positionState = {};

    // Load persisted state, or initialize from defaults
    function initPositionState() {
        try {
            positionState = JSON.parse(localStorage.getItem(POS_STORAGE_KEY) || '{}');
        } catch (e) {
            positionState = {};
        }
        for (const cat of POSITION_CATEGORIES) {
            if (!positionState[cat.id]) positionState[cat.id] = { ...cat.defaults };
            // Backfill any missing keys (in case defaults expanded since last save)
            for (const k of Object.keys(cat.defaults)) {
                if (positionState[cat.id][k] === undefined) {
                    positionState[cat.id][k] = cat.defaults[k];
                }
            }
        }
    }

    // Generate the live CSS and inject
    function applyPositions() {
        let css = '/* Live badge positions from debug panel */\n';
        for (const cat of POSITION_CATEGORIES) {
            const s = positionState[cat.id];
            const left = s.left ? `left: ${s.left} !important;` : 'left: auto !important;';
            const right = s.right ? `right: ${s.right} !important;` : 'right: auto !important;';
            const transform = `translate(${s.tx || '0'}, ${s.ty || '0'})`;
            css += `${cat.selector} {\n`;
            css += `    top: ${s.top || 'auto'} !important;\n`;
            css += `    ${right}\n`;
            css += `    ${left}\n`;
            css += `    transform: ${transform} !important;\n`;
            css += `}\n`;
        }
        let styleEl = document.getElementById('debug-badge-positions');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'debug-badge-positions';
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = css;
        try { localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(positionState)); }
        catch (e) { /* ignore quota */ }
    }

    // Per-property slider config (min/max/step) — different ranges per axis
    const POS_PROP_CONFIG = {
        top:   { min: -100, max: 200, step: 0.1, defaultUnit: '%' },
        right: { min: -100, max: 200, step: 0.1, defaultUnit: '%' },
        left:  { min: -100, max: 200, step: 0.1, defaultUnit: '%' },
        tx:    { min: -150, max: 150, step: 0.1, defaultUnit: '%' },
        ty:    { min: -150, max: 150, step: 0.1, defaultUnit: '%' },
    };

    // Parse "14.6%" or "12px" into { num, unit }. Returns null for "auto" or non-numeric.
    function parseCssValue(str) {
        if (!str || /^\s*auto\s*$/i.test(str)) return null;
        const m = String(str).trim().match(/^(-?\d+(?:\.\d+)?)\s*(%|px|vw|vh|em|rem)?\s*$/);
        if (!m) return null;
        return { num: parseFloat(m[1]), unit: m[2] || '%' };
    }

    function renderPositionList() {
        const listEl = panel.querySelector('#positionList');
        const rows = POSITION_CATEGORIES.map(cat => {
            const s = positionState[cat.id];
            const props = ['top', 'right', 'left', 'tx', 'ty'];
            const propRows = props.map(prop => {
                const cfg = POS_PROP_CONFIG[prop];
                const parsed = parseCssValue(s[prop]);
                const sliderVal = parsed ? parsed.num : 0;
                const sliderDisabled = parsed === null ? 'data-noscrub="1"' : '';
                return `
                    <div class="pos-control">
                        <span class="pos-label">${prop.toUpperCase()}</span>
                        <input type="range" class="pos-slider"
                               data-pos-cat="${cat.id}" data-pos-prop="${prop}"
                               min="${cfg.min}" max="${cfg.max}" step="${cfg.step}"
                               value="${sliderVal}" ${sliderDisabled}>
                        <input type="text" class="pos-input"
                               data-pos-cat="${cat.id}" data-pos-prop="${prop}"
                               value="${s[prop]}" placeholder="${cfg.defaultUnit === '%' ? 'auto' : '0'}">
                    </div>
                `;
            }).join('');
            return `
                <div class="debug-item pos-row" data-cat="${cat.id}">
                    <div class="pos-row-header">
                        <span class="debug-item-name">${cat.label}</span>
                        <button class="debug-btn pos-reset-btn" data-pos-reset="${cat.id}">Reset</button>
                    </div>
                    <div class="pos-row-note">${cat.note}</div>
                    <div class="pos-controls">${propRows}</div>
                </div>
            `;
        }).join('');
        listEl.innerHTML = rows;

        // Wire SLIDER changes — drag to scrub the numeric value live
        listEl.querySelectorAll('input.pos-slider').forEach(slider => {
            slider.addEventListener('input', () => {
                const cat  = slider.dataset.posCat;
                const prop = slider.dataset.posProp;
                const cfg  = POS_PROP_CONFIG[prop];
                const num  = parseFloat(slider.value);
                // Preserve the unit if the text already has one, otherwise default
                const parsed = parseCssValue(positionState[cat][prop]);
                const unit = parsed ? parsed.unit : cfg.defaultUnit;
                const newVal = `${num}${unit}`;
                positionState[cat][prop] = newVal;
                // Sync the text input so user sees what the slider produced
                const textInput = listEl.querySelector(
                    `input.pos-input[data-pos-cat="${cat}"][data-pos-prop="${prop}"]`
                );
                if (textInput) textInput.value = newVal;
                applyPositions();
            });
        });

        // Wire TEXT INPUT changes — typing keeps the slider in sync
        listEl.querySelectorAll('input.pos-input').forEach(textInput => {
            textInput.addEventListener('input', () => {
                const cat  = textInput.dataset.posCat;
                const prop = textInput.dataset.posProp;
                const val  = textInput.value.trim();
                positionState[cat][prop] = val;
                // Push value back to slider when it's numeric
                const parsed = parseCssValue(val);
                const slider = listEl.querySelector(
                    `input.pos-slider[data-pos-cat="${cat}"][data-pos-prop="${prop}"]`
                );
                if (slider && parsed) {
                    slider.value = parsed.num;
                    slider.removeAttribute('data-noscrub');
                } else if (slider && !parsed) {
                    // Non-numeric (e.g., "auto" or "calc(...)") — disable scrub indicator
                    slider.dataset.noscrub = '1';
                }
                applyPositions();
            });
        });

        // Per-category Reset buttons
        listEl.querySelectorAll('[data-pos-reset]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.posReset;
                const cat = POSITION_CATEGORIES.find(c => c.id === id);
                if (cat) {
                    positionState[id] = { ...cat.defaults };
                    applyPositions();
                    renderPositionList();
                }
            });
        });
    }

    // Global Reset All
    panel.querySelector('[data-action="pos-reset-all"]').addEventListener('click', () => {
        for (const cat of POSITION_CATEGORIES) {
            positionState[cat.id] = { ...cat.defaults };
        }
        applyPositions();
        renderPositionList();
    });

    // ============================================================
    // TAB SWITCHER
    // ============================================================
    panel.querySelectorAll('.debug-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            panel.querySelectorAll('.debug-tab').forEach(t => t.classList.toggle('active', t === tab));
            panel.querySelectorAll('.debug-tab-panel').forEach(p => {
                p.hidden = (p.dataset.panel !== target);
            });
            if (target === 'conquest') {
                captureConquestSnapshot();
                renderConquestList();
            }
        });
    });

    // --- Init ---------------------------------------------------
    function init() {
        discoverTargets();
        renderList();
        updateStats();
        // Inventory may load slightly later — give it one tick
        requestAnimationFrame(() => {
            renderInventoryList();
            subscribeInventory();
        });
        // Positions: load persisted values, render UI, apply CSS immediately
        initPositionState();
        renderPositionList();
        applyPositions();
        // Conquest: snapshot the initial mission list so Reset can restore it
        captureConquestSnapshot();
        renderConquestList();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
