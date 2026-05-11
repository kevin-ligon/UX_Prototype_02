/* ============================================================
   PLAYER INVENTORY SYSTEM
   ============================================================
   Reusable resource/currency state with animated UI.

   ## Highlights
   - Single source of truth for all resource definitions (RESOURCES below)
   - HUD pills are RENDERED DYNAMICALLY into [data-inventory-hud]
     based on which resources are flagged as `primary`
   - "Primary" set is configurable at runtime via setPrimary()
     (debug panel exposes UI for this)
   - Cost displays auto-color red when player can't afford
   - Cost-aware buttons block their own click + flash inventory
     when player tries to spend without enough resources
   - Animated feedback: pulse on add, dim on spend, shake on insufficient,
     floating delta numbers (+50 / -100)

   ## HTML Patterns

   HUD container (anywhere on the page):
     <div class="resources" data-inventory-hud></div>

   Cost on a button (declarative):
     <button data-cost='{"gold": 100, "fuel": 50}'>
       Enter
       <span class="cost-display">
         <span class="cost-item" data-cost-resource="gold" data-cost-amount="100">
           <img src="..."> 100
         </span>
       </span>
     </button>

   ## Public API (window.Inventory)
     Inventory.get(r)               // current amount
     Inventory.set(r, n)            // hard set
     Inventory.add(r, n)            // increase + animate
     Inventory.spend(r, n)          // decrease, returns false if can't
     Inventory.canAfford(costs)     // {gold:100,fuel:5} -> bool
     Inventory.spendCosts(costs)    // try-spend a multi-resource cost
     Inventory.subscribe(fn)        // (resource, newValue, delta) => {}
     Inventory.getDefinition(r)     // resource definition
     Inventory.getAllResources()    // [{id,...def}, ...]
     Inventory.setPrimary(idList)   // ['gold','steel'] -> re-render HUD
     Inventory.getPrimary()         // ['gold','steel',...]
     Inventory.isPrimary(r)         // bool
   ============================================================ */

(function () {
    'use strict';

    // ================== Resource Catalog ==================
    // Single source of truth. Add new resources here.
    const RESOURCES = {
        gold:      { display: 'Gold',      icon: '../images/icons/inventory_gold.png',   initial: 1500, primary: true  },
        steel:     { display: 'Steel',     icon: '../images/icons/inventory_steel.png',  initial: 1500, primary: true  },
        brass:     { display: 'Brass',     icon: '../images/icons/inventory_brass.png',  initial: 1500, primary: true  },
        coal:      { display: 'Coal',      icon: '../images/icons/inventory_coal.png',   initial: 1500, primary: true  },
        fuel:      { display: 'Fuel',      icon: '../assets/icons/resource_energy.png',  initial: 1500, primary: true  },
        energy:    { display: 'Energy',    icon: '../assets/icons/resource_energy.png',  initial: 100,  primary: false },
        meteorite: { display: 'Meteorite', icon: '../images/icons/currency-gear-meteorite.png', initial: 25, primary: false },
    };

    // ================== Internal state ====================
    const state = {};        // { gold: 1500, ... }
    const pills = [];        // [{ el, resource, valueEl }]
    const costDisplays = []; // [{ el, resource, amount }]
    const subscribers = [];
    const FLOATER_LIFETIME = 1200;

    let primarySet = new Set(
        Object.entries(RESOURCES).filter(([_, d]) => d.primary).map(([k]) => k)
    );

    // Initialize state from definitions
    for (const id in RESOURCES) state[id] = RESOURCES[id].initial;

    // ================== Number formatting =================
    function formatNumber(n) {
        const abs = Math.abs(n);
        if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (abs >= 10_000)    return Math.round(n / 1000) + 'k';
        if (abs >= 1000)      return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        return String(n);
    }

    // ================== Core state ops ====================
    function get(resource) { return state[resource] || 0; }

    function set(resource, value) {
        const prev = state[resource] || 0;
        const next = Math.max(0, Math.floor(value));
        if (prev === next) return;
        state[resource] = next;
        notify(resource, next - prev);
    }

    function add(resource, amount) {
        if (amount <= 0) return;
        set(resource, get(resource) + amount);
    }

    function spend(resource, amount) {
        if (amount <= 0) return true;
        if (get(resource) < amount) return false;
        set(resource, get(resource) - amount);
        return true;
    }

    function canAfford(costs) {
        for (const r of Object.keys(costs)) {
            if (get(r) < costs[r]) return false;
        }
        return true;
    }

    function getInsufficient(costs) {
        const out = [];
        for (const r of Object.keys(costs)) {
            if (get(r) < costs[r]) out.push(r);
        }
        return out;
    }

    function spendCosts(costs) {
        if (!canAfford(costs)) return false;
        for (const r of Object.keys(costs)) spend(r, costs[r]);
        return true;
    }

    function subscribe(fn) {
        subscribers.push(fn);
        return () => {
            const i = subscribers.indexOf(fn);
            if (i >= 0) subscribers.splice(i, 1);
        };
    }

    // ================== Notification ======================
    function notify(resource, delta) {
        pills.forEach(p => { if (p.resource === resource) updatePill(p, delta); });
        costDisplays.forEach(c => { if (c.resource === resource) updateCostDisplay(c); });
        subscribers.forEach(fn => {
            try { fn(resource, get(resource), delta); } catch (e) { console.error(e); }
        });
    }

    function updatePill(pill, delta) {
        const newVal = get(pill.resource);
        if (pill.valueEl) pill.valueEl.textContent = formatNumber(newVal);

        if (delta > 0) {
            triggerAnim(pill.el, 'inv-pulse-add');
            spawnFloater(pill.el, '+' + formatNumber(delta), 'add');
        } else if (delta < 0) {
            triggerAnim(pill.el, 'inv-pulse-spend');
            spawnFloater(pill.el, formatNumber(delta), 'spend');
        }
    }

    function flashInsufficient(resource) {
        pills.forEach(p => { if (p.resource === resource) triggerAnim(p.el, 'inv-shake'); });
    }

    function updateCostDisplay(cost) {
        const have = get(cost.resource);
        const enough = have >= cost.amount;
        cost.el.classList.toggle('cost-insufficient', !enough);
        // Per Figma button library: when insufficient show "<have>/<need>"
        // (e.g. "1.5k/5k" in red); when affordable show just "<need>".
        if (cost.amountEl) {
            cost.amountEl.textContent = enough
                ? formatNumber(cost.amount)
                : formatNumber(have) + '/' + formatNumber(cost.amount);
        }
    }

    function triggerAnim(el, cls) {
        el.classList.remove(cls);
        // eslint-disable-next-line no-unused-expressions
        void el.offsetWidth;
        el.classList.add(cls);
    }

    function spawnFloater(host, text, kind) {
        const cs = getComputedStyle(host);
        if (cs.position === 'static') host.style.position = 'relative';
        const f = document.createElement('div');
        f.className = 'inv-floater inv-floater-' + kind;
        f.textContent = text;
        host.appendChild(f);
        setTimeout(() => f.remove(), FLOATER_LIFETIME);
    }

    // ================== HUD rendering =====================
    // Renders <div class="resources"> contents from primarySet
    function renderHud() {
        document.querySelectorAll('[data-inventory-hud]').forEach(container => {
            // Clear existing pills (and any floaters left)
            // Reset pills array to drop bindings for this container's old children
            const oldEls = Array.from(container.querySelectorAll('.resource'));
            for (let i = pills.length - 1; i >= 0; i--) {
                if (oldEls.includes(pills[i].el)) pills.splice(i, 1);
            }
            container.innerHTML = '';

            // Render in the order resources appear in RESOURCES, filtered to primarySet
            for (const id of Object.keys(RESOURCES)) {
                if (!primarySet.has(id)) continue;
                const def = RESOURCES[id];
                const pill = document.createElement('div');
                pill.className = 'resource';
                pill.dataset.resource = id;
                pill.innerHTML = `
                    <img src="${def.icon}" alt="${def.display}">
                    <span class="resource-amount">${formatNumber(get(id))}</span>
                `;
                container.appendChild(pill);

                pills.push({
                    el: pill,
                    resource: id,
                    valueEl: pill.querySelector('.resource-amount'),
                });
            }
        });
    }

    function setPrimary(idList) {
        primarySet = new Set(idList.filter(id => RESOURCES[id]));
        renderHud();
    }

    function getPrimary() { return Array.from(primarySet); }
    function isPrimary(r) { return primarySet.has(r); }

    // ================== DOM binding =======================
    function bindCostDisplays(scope) {
        scope = scope || document;
        scope.querySelectorAll('[data-cost-resource]').forEach(el => {
            if (costDisplays.some(c => c.el === el)) return;
            const amountEl = el.querySelector('.cost-amount');
            const cost = {
                el,
                resource: el.dataset.costResource,
                amount:   parseInt(el.dataset.costAmount, 10) || 0,
                amountEl, // text node we update with `<need>` or `<have>/<need>`
            };
            costDisplays.push(cost);
            updateCostDisplay(cost);
        });
    }

    function bindCostButtons(scope) {
        scope = scope || document;
        scope.querySelectorAll('[data-cost]').forEach(btn => {
            if (btn._invBound) return;
            btn._invBound = true;
            btn.addEventListener('click', (e) => {
                let costs;
                try { costs = JSON.parse(btn.dataset.cost); }
                catch (err) { console.warn('Bad data-cost JSON on', btn, err); return; }

                if (canAfford(costs)) {
                    spendCosts(costs);
                    // success: let click propagate
                } else {
                    e.stopPropagation();
                    e.preventDefault();
                    const display = btn.querySelector('.cost-display');
                    if (display) triggerAnim(display, 'cost-shake');
                    getInsufficient(costs).forEach(flashInsufficient);
                }
            }, true);
        });
    }

    function init() {
        renderHud();
        bindCostDisplays();
        bindCostButtons();

        // Watch for new badges/buttons added later (popups, etc.)
        const obs = new MutationObserver((muts) => {
            for (const m of muts) {
                for (const node of m.addedNodes) {
                    if (!(node instanceof Element)) continue;
                    bindCostDisplays(node);
                    bindCostButtons(node);
                }
            }
        });
        obs.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ================== Public API ========================
    window.Inventory = {
        get, set, add, spend,
        canAfford, spendCosts, getInsufficient,
        subscribe,
        formatNumber,
        flashInsufficient,
        // Resource catalog access
        getDefinition: (id) => RESOURCES[id],
        getAllResources: () => Object.entries(RESOURCES).map(([id, def]) => ({ id, ...def })),
        // Primary set (what shows in HUD)
        setPrimary, getPrimary, isPrimary,
        renderHud,
        // For debug
        all: () => ({ ...state }),
    };
})();
