/* ============================================================
   FULL-SCREEN MENU SYSTEM
   ============================================================
   Reusable menu open/close + tab switching logic.

   ## Open / close a menu
     <button onclick="Menu.open('buildings')">Buildings</button>
     <button data-menu-close>Back</button>     // closes the menu it's inside

     Menu.open('buildings')
     Menu.close()                  // closes any open menu
     Menu.toggle('buildings')

   ## Tab structure (auto-wired)
     <div class="fullscreen-menu" id="menu-buildings">
       <nav class="menu-tabs">
         <button class="tab-btn" data-tab-id="resource-gens" data-active>...</button>
         <button class="tab-btn" data-tab-id="barracks">...</button>
       </nav>
       <main class="menu-content">
         <section class="menu-panel" data-tab-panel="resource-gens">...</section>
         <section class="menu-panel" data-tab-panel="barracks" hidden>...</section>
       </main>
     </div>

   The script auto-binds clicks on `.tab-btn` to switch panels in
   the same .fullscreen-menu container.
   ============================================================ */

(function () {
    'use strict';

    // ---- Open / close (supports stacking) ----
    // When you open menu B while menu A is open, A stays in the DOM behind B.
    // Closing B (Back/ESC) reveals A again. Useful for: Buildings → Upgrade flow.
    let zCounter = 800;

    function open(menuId) {
        const el = document.getElementById('menu-' + menuId);
        if (!el) return;
        zCounter += 1;
        el.style.zIndex = zCounter;
        el.classList.add('open');
        document.body.classList.add('menu-open');
    }

    function closeMenu(el) {
        if (!el) return;
        el.classList.remove('open');
        if (!document.querySelector('.fullscreen-menu.open')) {
            document.body.classList.remove('menu-open');
        }
    }

    // Close the top-most open menu (highest z-index)
    function close() {
        const open = Array.from(document.querySelectorAll('.fullscreen-menu.open'));
        if (open.length === 0) return;
        const top = open.reduce((a, b) =>
            (parseInt(a.style.zIndex || 0, 10) > parseInt(b.style.zIndex || 0, 10) ? a : b)
        );
        closeMenu(top);
    }

    // Close all open menus
    function closeAll() {
        document.querySelectorAll('.fullscreen-menu.open').forEach(closeMenu);
    }

    function toggle(menuId) {
        const el = document.getElementById('menu-' + menuId);
        if (el && el.classList.contains('open')) closeMenu(el);
        else open(menuId);
    }

    // ---- Tab switching ----
    function activateTab(menuEl, tabId) {
        // Update tab button states
        menuEl.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.dataset.tabId === tabId) btn.dataset.active = '';
            else delete btn.dataset.active;
        });
        // Show/hide panels
        menuEl.querySelectorAll('.menu-panel').forEach(panel => {
            panel.hidden = (panel.dataset.tabPanel !== tabId);
        });
        // Update menu title if a tab supplies a data-tab-title
        const activeBtn = menuEl.querySelector(`.tab-btn[data-tab-id="${tabId}"]`);
        if (activeBtn && activeBtn.dataset.tabTitle) {
            const title = menuEl.querySelector('.menu-title');
            if (title) title.textContent = activeBtn.dataset.tabTitle;
        }
    }

    // ---- Auto-wire ----
    function init() {
        // Tab button clicks (event delegation)
        document.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.tab-btn');
            if (tabBtn) {
                const menu = tabBtn.closest('.fullscreen-menu');
                if (menu) activateTab(menu, tabBtn.dataset.tabId);
                return;
            }
            // Close button — close only the menu it lives inside
            const closeBtn = e.target.closest('[data-menu-close]');
            if (closeBtn) {
                const menu = closeBtn.closest('.fullscreen-menu');
                closeMenu(menu);
            }
        });

        // ESC closes the top-most open menu (back-stack behavior)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') close();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.Menu = { open, close, toggle, activateTab };
})();
