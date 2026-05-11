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
            <div class="debug-title">Notification Debug</div>
            <div class="debug-subtitle">Set badge state per element. Click a button on the map to auto-clear its badge.</div>
        </div>
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
        <div class="debug-footer">
            Press <kbd>D</kbd> to toggle. Click any map button to auto-clear its badge (per guide). NEW badges auto-clear after 30s in debug mode.
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

    // --- Init ---------------------------------------------------
    function init() {
        discoverTargets();
        renderList();
        updateStats();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
