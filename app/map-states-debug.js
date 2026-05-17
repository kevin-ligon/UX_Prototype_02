/* ============================================================
   MAP STATES — DEBUG PANEL
   - Color-tint islands (color picker + intensity slider)
   - Stroke color + width around active islands
   - Background color
   - Per-island active toggles
   Toggled by 🗺️ button (bottom-right) or pressing M.
   ============================================================ */

(function () {
  'use strict';

  // Shared defaults match the CSS custom properties in world-map-v2.html.
  // maxZoom + propThreshold mirror the runtime defaults in world-map-v3.js.
  const DEFAULTS = {
    bgColor:       '#0a0614',
    tintStrength:  0,
    strokeWidth:   0,
    bgVariant:     'disabled',
    maxZoom:       2.1,
    propThreshold: 1.2,
    // Per-category color slots — both populated at init from wm.listCategories()
    // so the panel's UI mirrors the v3 module's category list exactly.
    strokeColors:  {},
    tintColors:    {},
  };

  let state = { ...DEFAULTS };

  // ---- Stroke persistence -------------------------------------
  // Keep stroke color (per category) + width across reloads. Mirrors the v3
  // module's pattern (versioned key, JSON, localStorage). Not bundled with
  // the v3 island configs because strokes are panel-owned UI state.
  const STROKE_KEY = 'wm-states-stroke-v1';
  function saveStrokeState() {
    try {
      localStorage.setItem(STROKE_KEY, JSON.stringify({
        strokeWidth:  state.strokeWidth,
        strokeColors: state.strokeColors,
      }));
    } catch (e) {
      // Non-fatal: localStorage may be disabled.
      console.warn('[map-states] failed to save stroke state:', e);
    }
  }
  function loadStrokeState() {
    try {
      const raw = localStorage.getItem(STROKE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (typeof saved.strokeWidth === 'number') state.strokeWidth = saved.strokeWidth;
      if (saved.strokeColors && typeof saved.strokeColors === 'object') {
        state.strokeColors = { ...saved.strokeColors };
      }
    } catch (e) { /* non-fatal */ }
  }
  loadStrokeState();

  // ---- Zoom persistence ---------------------------------------
  // Persist the Zoom section's two sliders (Max + Reveal at) so they
  // survive reloads. Same pattern as stroke — a separate key keeps the
  // panel's UI state slices independent.
  // v2: bumped when DEFAULTS.maxZoom/propThreshold changed (6.0/1.6 → 2.1/1.2)
  // so stale v1 saves don't shadow the new defaults on first reload.
  const ZOOM_KEY = 'wm-states-zoom-v2';
  function saveZoomState() {
    try {
      localStorage.setItem(ZOOM_KEY, JSON.stringify({
        maxZoom:       state.maxZoom,
        propThreshold: state.propThreshold,
      }));
    } catch (e) {
      console.warn('[map-states] failed to save zoom state:', e);
    }
  }
  function loadZoomState() {
    try {
      const raw = localStorage.getItem(ZOOM_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (typeof saved.maxZoom === 'number')       state.maxZoom       = saved.maxZoom;
      if (typeof saved.propThreshold === 'number') state.propThreshold = saved.propThreshold;
    } catch (e) { /* non-fatal */ }
  }
  loadZoomState();

  // ---- Tint persistence ---------------------------------------
  // Per-category tint colors + shared strength. Same pattern as stroke,
  // separate key so the slices can evolve independently.
  const TINT_KEY = 'wm-states-tint-v1';
  function saveTintState() {
    try {
      localStorage.setItem(TINT_KEY, JSON.stringify({
        tintStrength: state.tintStrength,
        tintColors:   state.tintColors,
      }));
    } catch (e) {
      console.warn('[map-states] failed to save tint state:', e);
    }
  }
  function loadTintState() {
    try {
      const raw = localStorage.getItem(TINT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (typeof saved.tintStrength === 'number') state.tintStrength = saved.tintStrength;
      if (saved.tintColors && typeof saved.tintColors === 'object') {
        state.tintColors = { ...saved.tintColors };
      }
    } catch (e) { /* non-fatal */ }
  }
  loadTintState();

  // ---- Background color persistence ---------------------------
  // Saves the bg color picker value so reloads come up with the same
  // page backdrop the user picked, instead of reverting to the default.
  // Default itself stays at DEFAULTS.bgColor — what you see today on
  // the world map ('#0a0614', the dark purple), which is also what
  // Reset All restores.
  const BG_KEY = 'wm-states-bg-v1';
  function saveBgState() {
    try { localStorage.setItem(BG_KEY, JSON.stringify({ bgColor: state.bgColor })); }
    catch (e) { console.warn('[map-states] failed to save bg state:', e); }
  }
  function loadBgState() {
    try {
      const raw = localStorage.getItem(BG_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (typeof saved.bgColor === 'string') state.bgColor = saved.bgColor;
    } catch (e) { /* non-fatal */ }
  }
  loadBgState();

  // ---- Toggle button (mirrors existing debug-toggle visual) ----
  const toggle = document.createElement('button');
  toggle.className = 'debug-toggle map-states-toggle';
  toggle.title = 'Map States debug panel (M)';
  toggle.textContent = '🗺️';
  // Anchor on the bottom-right so it doesn't collide with the original 🐞 toggle.
  toggle.style.left  = 'auto';
  toggle.style.right = '16px';
  toggle.style.borderColor = '#5cf2ff';
  toggle.style.color = '#5cf2ff';
  document.body.appendChild(toggle);

  // ---- Panel ---------------------------------------------------
  const panel = document.createElement('aside');
  panel.className = 'debug-panel map-states-panel';
  // Slide in from the right.
  panel.style.left   = 'auto';
  panel.style.right  = '0';
  panel.style.borderLeft  = '2px solid #5cf2ff';
  panel.style.borderRight = 'none';
  panel.style.transform   = 'translateX(100%)';
  panel.innerHTML = `
    <div class="debug-header" style="border-bottom-color: rgba(92,242,255,0.3);">
      <div class="debug-title" style="color:#5cf2ff;">Map States</div>
      <div class="debug-subtitle">Tint islands, stroke active islands, change background.</div>
    </div>

    <div class="debug-actions">
      <button class="debug-btn" data-action="reset-all">Reset All</button>
      <button class="debug-btn" data-action="bg-active">Bg: Active</button>
      <button class="debug-btn" data-action="bg-disabled">Bg: Disabled</button>
    </div>
    <div class="debug-actions" style="padding-top: 0;">
      <!-- Export: download every map-related localStorage key as JSON.
           Import: pick a JSON file to apply the same settings here.
           Lets you carry your local map customizations onto another
           origin (e.g., the live GitHub Pages site) where localStorage
           doesn't follow the code. -->
      <button class="debug-btn" data-action="export-settings" title="Download all map settings as JSON">Export</button>
      <button class="debug-btn" data-action="import-settings" title="Load a previously exported JSON">Import</button>
      <input type="file" id="msImportFile" accept="application/json,.json" hidden>
    </div>

    <div class="debug-list" style="padding: 12px 18px;">

      <!-- BACKGROUND -->
      <div class="ms-section">
        <div class="ms-section-title">Background</div>
        <div class="ms-row">
          <label class="ms-label">Color</label>
          <!-- Initial value reflects any persisted bg color from localStorage -->
          <input type="color" class="ms-color" id="msBgColor" value="${state.bgColor}">
          <span class="ms-value" id="msBgColorVal">${state.bgColor}</span>
        </div>
      </div>

      <!-- TINT -->
      <!-- Mirrors the Stroke section: per-category color rows populated
           dynamically at init from wm.listCategories() + a single shared
           Strength slider. Tint only paints on .is-active islands (see
           the world-map.html CSS), so this controls the active state. -->
      <div class="ms-section">
        <div class="ms-section-title">Active Island Tint</div>
        <div id="msTintCategories"></div>
        <div class="ms-row" style="margin-top:6px;border-top:1px solid rgba(92,242,255,0.15);padding-top:8px">
          <label class="ms-label">Strength</label>
          <input type="range" class="ms-slider" id="msTintStrength" min="0" max="100" step="1" value="${state.tintStrength * 100}">
          <span class="ms-value" id="msTintStrengthVal">${Math.round(state.tintStrength * 100)}%</span>
        </div>
      </div>

      <!-- STROKE -->
      <div class="ms-section">
        <div class="ms-section-title">Active Island Stroke</div>
        <div id="msStrokeCategories"></div>
        <div class="ms-row" style="margin-top:6px;border-top:1px solid rgba(92,242,255,0.15);padding-top:8px">
          <label class="ms-label">Width</label>
          <!-- Initial value reflects any persisted stroke width from localStorage -->
          <input type="range" class="ms-slider" id="msStrokeWidth" min="0" max="20" step="1" value="${state.strokeWidth}">
          <span class="ms-value" id="msStrokeWidthVal">${state.strokeWidth}px</span>
        </div>
      </div>

      <!-- ZOOM CONTROLS -->
      <div class="ms-section">
        <div class="ms-section-title">Zoom</div>
        <div class="ms-row">
          <label class="ms-label">Max</label>
          <!-- Initial values reflect any persisted zoom state from localStorage -->
          <input type="range" class="ms-slider" id="msMaxZoom" min="1.5" max="20" step="0.1" value="${state.maxZoom}">
          <span class="ms-value" id="msMaxZoomVal">${state.maxZoom.toFixed(1)}×</span>
        </div>
        <div class="ms-row">
          <label class="ms-label">Reveal at</label>
          <input type="range" class="ms-slider" id="msPropThreshold" min="1.0" max="6.0" step="0.1" value="${state.propThreshold}">
          <span class="ms-value" id="msPropThresholdVal">${state.propThreshold.toFixed(1)}×</span>
        </div>
        <div class="ms-row" style="font-size:11px;color:#9e8cb2;padding-top:0">
          <span style="flex:1;text-transform:none;letter-spacing:0">
            Capital city, monsters, banners and towers fade in once zoom exceeds the threshold.
          </span>
        </div>
      </div>

      <!-- GLOBAL ELEMENT SIZES -->
      <div class="ms-section">
        <div class="ms-section-title">Global Element Sizes</div>
        <div class="ms-row">
          <label class="ms-label">Island label</label>
          <input type="range" class="ms-slider" id="msGlobalIslandName" min="20" max="300" step="5" value="100">
          <span class="ms-value" id="msGlobalIslandNameVal">100%</span>
        </div>
        <div class="ms-row">
          <label class="ms-label">Resource cost</label>
          <input type="range" class="ms-slider" id="msGlobalResource" min="20" max="300" step="5" value="100">
          <span class="ms-value" id="msGlobalResourceVal">100%</span>
        </div>
        <div class="ms-row">
          <label class="ms-label">Banner</label>
          <input type="range" class="ms-slider" id="msGlobalBanner" min="20" max="300" step="5" value="100">
          <span class="ms-value" id="msGlobalBannerVal">100%</span>
        </div>
        <div class="ms-row" style="font-size:11px;color:#9e8cb2;padding-top:0">
          <span style="flex:1;text-transform:none;letter-spacing:0">
            Multiplies every island's per-element scale at once. Persists across reloads.
          </span>
        </div>
      </div>

      <!-- ISLANDS -->
      <div class="ms-section">
        <div class="ms-section-title">Islands</div>
        <div class="ms-island-grid" id="msIslandList"></div>
      </div>

      <!-- PER-ISLAND PROP / BANNER / BADGE EDITOR -->
      <div class="ms-section">
        <div class="ms-section-title">Per-Island Elements</div>
        <div class="ms-row">
          <label class="ms-label">Island</label>
          <select id="msPerIsland" class="ms-select" style="flex:1;min-width:0"></select>
        </div>
        <div id="msPerIslandForm" class="ms-pi-form"></div>
      </div>

    </div>

    <div class="debug-footer" style="border-top-color: rgba(92,242,255,0.3);">
      Press <kbd>M</kbd> to toggle. Tap any island in the map to flip it.
    </div>
  `;
  document.body.appendChild(panel);

  // ---- Inline CSS for Map States layout (small, scoped) -------
  const css = document.createElement('style');
  css.textContent = `
    .map-states-panel .ms-section { margin-bottom: 16px; }
    .map-states-panel .ms-section-title {
      font-size: 11px; font-weight: 800; letter-spacing: 1px;
      text-transform: uppercase; color: #5cf2ff; margin-bottom: 6px;
    }
    .map-states-panel .ms-row {
      display: flex; align-items: center; gap: 10px;
      padding: 6px 0;
    }
    .map-states-panel .ms-label {
      flex: 0 0 70px; font-size: 12px; color: #c8b8d6;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .map-states-panel .ms-color {
      width: 36px; height: 28px; padding: 0; border: 1px solid rgba(255,255,255,0.2);
      background: transparent; border-radius: 4px; cursor: pointer;
    }
    .map-states-panel .ms-slider { flex: 1; min-width: 0; accent-color: #5cf2ff; }
    .map-states-panel .ms-value {
      flex: 0 0 56px; font-size: 12px; color: #fff; font-weight: 700; text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .map-states-panel .ms-island-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 4px;
    }
    .map-states-panel .ms-island-toggle {
      display: flex; align-items: center; justify-content: space-between;
      padding: 6px 10px; background: rgba(92,242,255,0.06);
      border: 1px solid rgba(92,242,255,0.18); border-radius: 4px;
      font-size: 12px; color: #fff; cursor: pointer;
      font-family: inherit; text-transform: uppercase; letter-spacing: 0.5px;
      transition: background 0.12s ease, border-color 0.12s ease;
    }
    .map-states-panel .ms-island-toggle:hover { background: rgba(92,242,255,0.14); }
    .map-states-panel .ms-island-toggle.is-active {
      background: rgba(92,242,255,0.22); border-color: #5cf2ff;
    }
    .map-states-panel .ms-island-toggle .ms-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #555; transition: background 0.12s ease;
    }
    .map-states-panel .ms-island-toggle.is-active .ms-dot {
      background: #5cf2ff; box-shadow: 0 0 6px #5cf2ff;
    }
    .map-states-panel .ms-select, .map-states-panel .ms-text-input {
      flex: 1; min-width: 0;
      background: rgba(0,0,0,0.6); border: 1px solid rgba(92,242,255,0.3);
      color: #fff; font-family: inherit; font-size: 12px;
      padding: 4px 8px; border-radius: 4px;
    }
    .map-states-panel .ms-pi-form { padding-top: 6px; }
    .map-states-panel .ms-pi-block {
      margin-top: 8px; padding: 8px 10px;
      background: rgba(92,242,255,0.05);
      border: 1px solid rgba(92,242,255,0.18);
      border-radius: 5px;
    }
    .map-states-panel .ms-pi-head {
      display:flex; align-items:center; justify-content:space-between;
      font-size: 11px; font-weight: 800; letter-spacing: 0.8px;
      text-transform: uppercase; color: #5cf2ff; margin-bottom: 4px;
    }
    .map-states-panel .ms-pi-toggle {
      width: 14px; height: 14px; cursor: pointer; accent-color: #5cf2ff;
    }
    .map-states-panel .ms-pi-row {
      display: flex; align-items: center; gap: 6px; padding: 3px 0;
      font-size: 11px;
    }
    .map-states-panel .ms-pi-row > label {
      flex: 0 0 36px; color: #c8b8d6; text-transform: uppercase; letter-spacing: 0.4px;
    }
    .map-states-panel .ms-pi-row .ms-slider { flex: 1; min-width: 0; }
    .map-states-panel .ms-pi-row .ms-value {
      flex: 0 0 46px; font-size: 11px; color: #fff; font-weight: 700; text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .map-states-panel .ms-pi-grid3 {
      display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px;
    }
    .map-states-panel .ms-pi-grid3 input[type=range] { width: 100%; }
    .map-states-panel .ms-pi-grid3 .ms-pi-axis {
      display:flex; flex-direction:column; gap:2px; align-items:center;
      font-size:10px; color:#9e8cb2;
    }
    .map-states-panel .ms-pi-grid3 .ms-pi-axis input { width: 100%; }
    .map-states-panel .ms-pi-grid3 .ms-pi-axis .ms-num {
      width: 100%;
      background: rgba(0,0,0,0.6); border: 1px solid rgba(92,242,255,0.2);
      color: #fff; font-family: inherit; font-size: 10px;
      padding: 1px 4px; border-radius: 3px; text-align: center;
    }
  `;
  document.head.appendChild(css);

  // ---- Wait for WorldMapV2 to be ready ------------------------
  function whenReady(cb) {
    if (window.WorldMapV2) return cb();
    document.addEventListener('worldmap:ready', cb, { once: true });
  }

  whenReady(() => {
    const wm = window.WorldMapV2;

    // Apply current state to the map.
    function applyAll() {
      wm.setBackgroundColor(state.bgColor);
      // Per-category tints + universal strength
      if (state.tintColors && wm.setCategoryTintColor) {
        Object.keys(state.tintColors).forEach(id => {
          wm.setCategoryTintColor(id, state.tintColors[id]);
        });
      }
      if (wm.setTintStrength) wm.setTintStrength(state.tintStrength);
      // Per-category strokes + universal width
      if (state.strokeColors && wm.setCategoryStrokeColor) {
        Object.keys(state.strokeColors).forEach(id => {
          wm.setCategoryStrokeColor(id, state.strokeColors[id]);
        });
      }
      if (wm.setStrokeWidth) wm.setStrokeWidth(state.strokeWidth);
      wm.setBackgroundVariant(state.bgVariant);
      if (wm.setMaxZoom)       wm.setMaxZoom(state.maxZoom);
      if (wm.setPropThreshold) wm.setPropThreshold(state.propThreshold);
    }

    // Wire up controls.
    const $ = (id) => panel.querySelector('#' + id);

    $('msBgColor').addEventListener('input', (e) => {
      state.bgColor = e.target.value;
      $('msBgColorVal').textContent = state.bgColor;
      wm.setBackgroundColor(state.bgColor);
      saveBgState();
    });

    // Strength slider — shared across all categories. Per-category color
    // rows are built below after we have the categories list from v3.
    $('msTintStrength').addEventListener('input', (e) => {
      state.tintStrength = parseInt(e.target.value, 10) / 100;
      $('msTintStrengthVal').textContent = e.target.value + '%';
      wm.setTintStrength(state.tintStrength);
      saveTintState();
    });

    // ---- Stroke: per-category color rows + universal width ----
    // Build the per-category color rows from the v3 API. If the API isn't
    // available (older module), fall back to nothing — width still works.
    const categories = (wm.listCategories ? wm.listCategories() : []);
    const catList = panel.querySelector('#msStrokeCategories');
    state.strokeColors = state.strokeColors || {};
    categories.forEach(cat => {
      // First-time default = the v3 module's per-category default color.
      if (!state.strokeColors[cat.id]) state.strokeColors[cat.id] = cat.defaultColor;
      const r = document.createElement('div');
      r.className = 'ms-row';
      r.innerHTML = `
        <label class="ms-label">${cat.label}</label>
        <input type="color" class="ms-color" data-cat="${cat.id}" value="${state.strokeColors[cat.id]}">
        <span class="ms-value" data-cat-val="${cat.id}">${state.strokeColors[cat.id]}</span>
      `;
      catList.appendChild(r);
      // Apply default to v3 immediately so the color matches even before
      // the user touches the picker.
      wm.setCategoryStrokeColor(cat.id, state.strokeColors[cat.id]);
    });
    catList.querySelectorAll('input[type=color][data-cat]').forEach(input => {
      input.addEventListener('input', (e) => {
        const id = input.dataset.cat;
        state.strokeColors[id] = input.value;
        catList.querySelector(`[data-cat-val="${id}"]`).textContent = input.value;
        wm.setCategoryStrokeColor(id, input.value);
        saveStrokeState();
      });
    });

    // ---- Tint: per-category color rows + universal strength ----
    // Same category list as strokes (so the labels and order match the
    // Strokes section exactly), but writes to per-category --tint-* vars.
    const tintList = panel.querySelector('#msTintCategories');
    state.tintColors = state.tintColors || {};
    categories.forEach(cat => {
      // Default per category = the same defaultColor used by the stroke;
      // means tints and strokes start as a matched pair per game mode.
      if (!state.tintColors[cat.id]) state.tintColors[cat.id] = cat.defaultColor;
      const r = document.createElement('div');
      r.className = 'ms-row';
      r.innerHTML = `
        <label class="ms-label">${cat.label}</label>
        <input type="color" class="ms-color" data-tint-cat="${cat.id}" value="${state.tintColors[cat.id]}">
        <span class="ms-value" data-tint-cat-val="${cat.id}">${state.tintColors[cat.id]}</span>
      `;
      tintList.appendChild(r);
      // Push to the CSS var immediately so the active-island tint matches
      // even before the user touches the picker.
      if (wm.setCategoryTintColor) wm.setCategoryTintColor(cat.id, state.tintColors[cat.id]);
    });
    tintList.querySelectorAll('input[type=color][data-tint-cat]').forEach(input => {
      input.addEventListener('input', () => {
        const id = input.dataset.tintCat;
        state.tintColors[id] = input.value;
        tintList.querySelector(`[data-tint-cat-val="${id}"]`).textContent = input.value;
        wm.setCategoryTintColor(id, input.value);
        saveTintState();
      });
    });

    $('msStrokeWidth').addEventListener('input', (e) => {
      state.strokeWidth = parseInt(e.target.value, 10);
      $('msStrokeWidthVal').textContent = state.strokeWidth + 'px';
      wm.setStrokeWidth(state.strokeWidth);
      saveStrokeState();
    });

    // ---- Global element-size sliders ------------------------
    if (wm.getGlobalScales) {
      const gs = wm.getGlobalScales();
      const wireGlobal = (sliderId, valueId, name) => {
        const slider = $(sliderId);
        const valEl  = $(valueId);
        if (!slider || !valEl) return;
        slider.value = gs[name];
        valEl.textContent = gs[name] + '%';
        slider.addEventListener('input', () => {
          valEl.textContent = slider.value + '%';
          wm.setGlobalScale(name, slider.value);
        });
      };
      wireGlobal('msGlobalIslandName', 'msGlobalIslandNameVal', 'islandNameScale');
      wireGlobal('msGlobalResource',   'msGlobalResourceVal',   'resourceScale');
      wireGlobal('msGlobalBanner',     'msGlobalBannerVal',     'bannerScale');

      // After clearStoredConfigs the v3 module dispatches this — resync UI.
      document.addEventListener('worldmap:configs-reset', () => {
        const fresh = wm.getGlobalScales();
        ['msGlobalIslandName','msGlobalResource','msGlobalBanner'].forEach((id, i) => {
          const key = ['islandNameScale','resourceScale','bannerScale'][i];
          const valId = id + 'Val';
          if ($(id))    $(id).value = fresh[key];
          if ($(valId)) $(valId).textContent = fresh[key] + '%';
        });
      });
    }

    // Zoom controls — only present when world-map-v3.js exposes the API.
    if ($('msMaxZoom') && wm.setMaxZoom) {
      // Sync the threshold slider's max attr with the loaded maxZoom on init
      // so a saved low maxZoom doesn't leave the threshold slider unbounded.
      $('msPropThreshold').max = state.maxZoom;
      $('msMaxZoom').addEventListener('input', (e) => {
        state.maxZoom = parseFloat(e.target.value);
        $('msMaxZoomVal').textContent = state.maxZoom.toFixed(1) + '×';
        wm.setMaxZoom(state.maxZoom);
        // The threshold slider can't exceed maxZoom; clamp + update if needed.
        if (state.propThreshold > state.maxZoom) {
          state.propThreshold = state.maxZoom;
          $('msPropThreshold').value = state.propThreshold;
          $('msPropThresholdVal').textContent = state.propThreshold.toFixed(1) + '×';
          wm.setPropThreshold(state.propThreshold);
        }
        // Also keep the threshold slider's max attr in sync.
        $('msPropThreshold').max = state.maxZoom;
        saveZoomState();
      });
    }
    if ($('msPropThreshold') && wm.setPropThreshold) {
      $('msPropThreshold').addEventListener('input', (e) => {
        state.propThreshold = parseFloat(e.target.value);
        $('msPropThresholdVal').textContent = state.propThreshold.toFixed(1) + '×';
        wm.setPropThreshold(state.propThreshold);
        saveZoomState();
      });
    }

    // Quick actions.
    panel.querySelector('[data-action="reset-all"]').addEventListener('click', () => {
      state = { ...DEFAULTS };
      // Restore per-category color slots, but reset their values to defaults.
      state.strokeColors = {};
      state.tintColors   = {};
      categories.forEach(cat => {
        state.strokeColors[cat.id] = cat.defaultColor;
        state.tintColors[cat.id]   = cat.defaultColor;
      });
      $('msBgColor').value      = state.bgColor;       $('msBgColorVal').textContent      = state.bgColor;
      $('msTintStrength').value = state.tintStrength * 100;
      $('msTintStrengthVal').textContent = (state.tintStrength * 100) + '%';
      // Per-category stroke color pickers
      catList.querySelectorAll('input[type=color][data-cat]').forEach(inp => {
        const id = inp.dataset.cat;
        inp.value = state.strokeColors[id];
        catList.querySelector(`[data-cat-val="${id}"]`).textContent = state.strokeColors[id];
      });
      // Per-category tint color pickers
      tintList.querySelectorAll('input[type=color][data-tint-cat]').forEach(inp => {
        const id = inp.dataset.tintCat;
        inp.value = state.tintColors[id];
        tintList.querySelector(`[data-tint-cat-val="${id}"]`).textContent = state.tintColors[id];
      });
      $('msStrokeWidth').value  = state.strokeWidth;   $('msStrokeWidthVal').textContent  = state.strokeWidth + 'px';
      // Persist the wiped panel state so a refresh keeps the reset.
      try { localStorage.removeItem(STROKE_KEY); } catch (_) {}
      try { localStorage.removeItem(TINT_KEY);   } catch (_) {}
      try { localStorage.removeItem(ZOOM_KEY);   } catch (_) {}
      try { localStorage.removeItem(BG_KEY);     } catch (_) {}
      if ($('msMaxZoom')) {
        $('msMaxZoom').value     = state.maxZoom;
        $('msMaxZoomVal').textContent = state.maxZoom.toFixed(1) + '×';
        $('msPropThreshold').max = state.maxZoom;
      }
      if ($('msPropThreshold')) {
        $('msPropThreshold').value = state.propThreshold;
        $('msPropThresholdVal').textContent = state.propThreshold.toFixed(1) + '×';
      }
      applyAll();
    });
    panel.querySelector('[data-action="bg-active"]').addEventListener('click', () => {
      state.bgVariant = 'active'; wm.setBackgroundVariant('active');
    });
    panel.querySelector('[data-action="bg-disabled"]').addEventListener('click', () => {
      state.bgVariant = 'disabled'; wm.setBackgroundVariant('disabled');
    });

    // ---- Export / Import ----------------------------------------
    // Carries every map-related localStorage key between origins, so
    // the customizations you made on file:// or localhost can land
    // on https://kevin-ligon.github.io (same code, different storage).
    //
    // Coverage = every key whose name starts with one of these
    // prefixes. Catches both the world-map (`wm-v3-*`, `wm-states-*`)
    // and the reef map (`reef-map-v1-*`) without hard-coding key names.
    const EXPORT_PREFIXES = ['wm-v3-', 'wm-states-', 'reef-map-v1-'];

    function collectMapKeys() {
      const out = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && EXPORT_PREFIXES.some(p => k.startsWith(p))) {
          out[k] = localStorage.getItem(k);
        }
      }
      return out;
    }

    panel.querySelector('[data-action="export-settings"]').addEventListener('click', () => {
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        origin: location.origin || 'file://',
        href: location.href,
        keys: collectMapKeys(),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `map-settings-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const keyCount = Object.keys(payload.keys).length;
      console.log(`[map-states] exported ${keyCount} keys`);
    });

    const importInput = panel.querySelector('#msImportFile');
    panel.querySelector('[data-action="import-settings"]').addEventListener('click', () => {
      importInput.click();
    });
    importInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        let payload;
        try { payload = JSON.parse(reader.result); }
        catch (_) { alert('Import failed: file is not valid JSON.'); return; }
        if (!payload || typeof payload.keys !== 'object') {
          alert('Import failed: JSON missing a "keys" object.');
          return;
        }
        const keyCount = Object.keys(payload.keys).length;
        const ok = window.confirm(
          `Import ${keyCount} map setting${keyCount === 1 ? '' : 's'}?\n\n` +
          `This OVERWRITES your current settings on this page.\n` +
          `The page will reload after import.`
        );
        if (!ok) { importInput.value = ''; return; }
        // First, wipe any existing map keys on this origin so a partial
        // import doesn't leave half-old / half-new state behind.
        const existing = collectMapKeys();
        Object.keys(existing).forEach(k => localStorage.removeItem(k));
        // Then write the imported keys.
        Object.entries(payload.keys).forEach(([k, v]) => {
          try { localStorage.setItem(k, v); } catch (_) {}
        });
        importInput.value = '';
        location.reload();
      };
      reader.readAsText(file);
    });

    // Per-island toggles, grouped by category. Each category renders as a
    // mini-section with a heading so Empire/PVE/Expedition/Mines/Isle/PvP
    // islands are visually grouped instead of all in one flat grid.
    const list   = panel.querySelector('#msIslandList');
    const all    = wm.listIslands();
    const byKey  = Object.fromEntries(all.map(i => [i.key, i]));
    list.innerHTML = '';            // wipe any prior content
    list.style.display = 'block';   // group headings need block flow

    function makeIslandToggle(key, label) {
      const btn = document.createElement('button');
      btn.className = 'ms-island-toggle';
      btn.dataset.key = key;
      btn.innerHTML = `<span>${label}</span><span class="ms-dot"></span>`;
      btn.classList.toggle('is-active', wm.isActive(key));
      btn.addEventListener('click', () => {
        const next = !wm.isActive(key);
        wm.setIslandActive(key, next);
        btn.classList.toggle('is-active', next);
      });
      return btn;
    }

    categories.forEach(cat => {
      const islandsInCat = cat.keys.map(k => byKey[k]).filter(Boolean);
      if (!islandsInCat.length) return;
      const head = document.createElement('div');
      head.className = 'ms-cat-head';
      head.style.cssText = 'font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#9e8cb2;padding:8px 0 3px;border-bottom:1px solid rgba(92,242,255,0.12);margin-bottom:4px;';
      head.textContent = cat.label;
      list.appendChild(head);
      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:6px;';
      islandsInCat.forEach(({ key, label }) => grid.appendChild(makeIslandToggle(key, label)));
      list.appendChild(grid);
    });

    // Keep the per-island toggle UI in sync if the user taps directly on the map.
    document.addEventListener('click', (e) => {
      const islandEl = e.target.closest('.wm-island');
      if (!islandEl) return;
      const key = islandEl.dataset.key;
      const btn = list.querySelector(`[data-key="${key}"]`);
      if (btn) btn.classList.toggle('is-active', wm.isActive(key));
    });

    applyAll();
    initPerIslandEditor(wm, categories);
  });

  // ============================================================
  // PER-ISLAND ELEMENT EDITOR
  // ============================================================
  function initPerIslandEditor(wm, categories) {
    if (!wm.getIslandConfig) return; // older world-map-v2.js — skip
    const sel  = panel.querySelector('#msPerIsland');
    const form = panel.querySelector('#msPerIslandForm');
    if (!sel || !form) return;

    // Populate island selector grouped by category. <optgroup> gives a clear
    // header for each game-mode group inside the dropdown.
    const all = wm.listIslands();
    const byKey = Object.fromEntries(all.map(i => [i.key, i]));
    const seen = new Set();
    (categories || []).forEach(cat => {
      const islandsInCat = cat.keys.map(k => byKey[k]).filter(Boolean);
      if (!islandsInCat.length) return;
      const og = document.createElement('optgroup');
      og.label = cat.label;
      islandsInCat.forEach(({ key, label }) => {
        const opt = document.createElement('option');
        opt.value = key; opt.textContent = label;
        og.appendChild(opt);
        seen.add(key);
      });
      sel.appendChild(og);
    });
    // Any island not assigned to a category falls into a final "Other" group
    // so we never lose access to one through a categorization bug.
    const orphans = all.filter(i => !seen.has(i.key));
    if (orphans.length) {
      const og = document.createElement('optgroup');
      og.label = 'Other';
      orphans.forEach(({ key, label }) => {
        const opt = document.createElement('option');
        opt.value = key; opt.textContent = label;
        og.appendChild(opt);
      });
      sel.appendChild(og);
    }

    // Asset menus
    const propTypes     = wm.getPropTypes();
    const bannerTypes   = wm.getBannerTypes();
    const resourceIcons = wm.getResourceIcons();
    const badgeTypes    = wm.getBadgeTypes();

    // Helpers ------------------------------------------------
    function row(label, child) {
      const r = document.createElement('div');
      r.className = 'ms-pi-row';
      const l = document.createElement('label'); l.textContent = label;
      r.appendChild(l); r.appendChild(child);
      return r;
    }

    function makeSelect(options, selectedId) {
      const s = document.createElement('select');
      s.className = 'ms-select';
      options.forEach(o => {
        const op = document.createElement('option');
        op.value = o.id; op.textContent = o.label;
        if (o.id === selectedId) op.selected = true;
        s.appendChild(op);
      });
      return s;
    }

    // X / Y / Scale sliders rendered as a 3-column grid with inline numeric
    // readouts that double as direct entry fields. Each input is tagged
    // data-axis="x|y|s" so drag-mode can update them in place.
    function makeXYScale(cfgRef, onChange, axes = {x:[-50,150], y:[-50,150], s:[20,300]}) {
      const wrap = document.createElement('div'); wrap.className = 'ms-pi-grid3';
      ['x','y','s'].forEach(axis => {
        const col = document.createElement('div');
        col.className = 'ms-pi-axis';
        const lbl = document.createElement('span');
        lbl.textContent = axis === 's' ? 'scale' : axis;
        const r = document.createElement('input');
        r.type = 'range'; r.className = 'ms-slider';
        r.dataset.axis = axis;
        const [lo, hi] = axes[axis];
        r.min = lo; r.max = hi; r.step = axis === 's' ? 5 : 1;
        const valKey = axis === 's' ? 'scale' : axis;
        r.value = cfgRef[valKey];
        const num = document.createElement('input');
        num.type = 'number'; num.className = 'ms-num';
        num.dataset.axis = axis;
        num.min = lo; num.max = hi;
        num.value = cfgRef[valKey];
        const sync = (v) => {
          cfgRef[valKey] = +v;
          r.value = v; num.value = v;
          onChange();
        };
        r.addEventListener('input',  () => sync(r.value));
        num.addEventListener('input',() => sync(num.value));
        col.appendChild(lbl); col.appendChild(r); col.appendChild(num);
        wrap.appendChild(col);
      });
      return wrap;
    }

    function block(title, configFn, configPath) {
      const b = document.createElement('div');
      b.className = 'ms-pi-block';
      if (configPath) b.dataset.configPath = configPath;
      const head = document.createElement('div');
      head.className = 'ms-pi-head';
      const t = document.createElement('span'); t.textContent = title;
      head.appendChild(t);
      b.appendChild(head);
      configFn(b, head);
      return b;
    }

    // ---- Renderer ----------------------------------------
    function renderForm() {
      const key = sel.value;
      if (!key) return;
      // Pull a deep clone we mutate locally; flush on each change.
      const cfg = wm.getIslandConfig(key);
      if (!cfg) return;
      form.innerHTML = '';

      const apply = () => wm.setIslandConfig(key, cfg);

      // ---- Prop ----
      form.appendChild(block('Prop', (b) => {
        const typeSel = makeSelect(propTypes, cfg.prop.type);
        typeSel.addEventListener('change', () => { cfg.prop.type = typeSel.value; apply(); });
        b.appendChild(row('Type', typeSel));
        b.appendChild(makeXYScale(cfg.prop, apply));
      }, 'prop'));

      // ---- Banner (multi-select) ----
      form.appendChild(block('Banners', (b) => {
        // Normalize: legacy single-type configs get migrated to a types array.
        if (!Array.isArray(cfg.banner.types)) {
          cfg.banner.types = (cfg.banner.type && cfg.banner.type !== 'none')
            ? [cfg.banner.type] : [];
        }
        const grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:4px;width:100%;';
        bannerTypes.filter(t => t.id !== 'none').forEach(t => {
          const lbl = document.createElement('label');
          lbl.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11px;color:#fff;cursor:pointer;padding:3px 6px;background:rgba(92,242,255,0.06);border:1px solid rgba(92,242,255,0.18);border-radius:4px';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = cfg.banner.types.includes(t.id);
          cb.style.accentColor = '#5cf2ff';
          cb.addEventListener('change', () => {
            if (cb.checked) {
              if (!cfg.banner.types.includes(t.id)) cfg.banner.types.push(t.id);
            } else {
              cfg.banner.types = cfg.banner.types.filter(x => x !== t.id);
            }
            apply();
          });
          lbl.append(cb, document.createTextNode(t.label));
          grid.appendChild(lbl);
        });
        b.appendChild(grid);

        // Per-row gap slider (% of island width)
        const gapWrap = document.createElement('div'); gapWrap.className = 'ms-pi-row';
        const gapLbl  = document.createElement('label'); gapLbl.textContent = 'Gap';
        const gap     = document.createElement('input');
        gap.type = 'range'; gap.className = 'ms-slider';
        gap.min = 0; gap.max = 30; gap.step = 1;
        gap.value = cfg.banner.gap != null ? cfg.banner.gap : 4;
        const gapVal = document.createElement('span');
        gapVal.className = 'ms-value'; gapVal.textContent = gap.value + '%';
        gap.addEventListener('input', () => {
          cfg.banner.gap = +gap.value;
          gapVal.textContent = gap.value + '%';
          apply();
        });
        gapWrap.append(gapLbl, gap, gapVal);
        b.appendChild(gapWrap);

        b.appendChild(makeXYScale(cfg.banner, apply));
      }, 'banner'));

      // ---- Prop Name ----
      form.appendChild(block('Prop Name', (b, head) => {
        const tg = document.createElement('input');
        tg.type = 'checkbox'; tg.className = 'ms-pi-toggle';
        tg.checked = !!cfg.propName.show;
        tg.addEventListener('change', () => { cfg.propName.show = tg.checked; apply(); });
        head.appendChild(tg);
        const txt = document.createElement('input');
        txt.type = 'text'; txt.className = 'ms-text-input';
        txt.placeholder = 'Capital City'; txt.value = cfg.propName.text;
        txt.addEventListener('input', () => { cfg.propName.text = txt.value; apply(); });
        b.appendChild(row('Text', txt));
        b.appendChild(makeXYScale(cfg.propName, apply));
      }, 'propName'));

      // ---- Resource Requirement ----
      form.appendChild(block('Resource Req', (b, head) => {
        const tg = document.createElement('input');
        tg.type = 'checkbox'; tg.className = 'ms-pi-toggle';
        tg.checked = !!cfg.resourceReq.show;
        tg.addEventListener('change', () => { cfg.resourceReq.show = tg.checked; apply(); });
        head.appendChild(tg);
        const txt = document.createElement('input');
        txt.type = 'text'; txt.className = 'ms-text-input';
        txt.placeholder = '24/24'; txt.value = cfg.resourceReq.text;
        txt.addEventListener('input', () => { cfg.resourceReq.text = txt.value; apply(); });
        b.appendChild(row('Text', txt));
        const iconSel = makeSelect(resourceIcons, cfg.resourceReq.icon);
        iconSel.addEventListener('change', () => { cfg.resourceReq.icon = iconSel.value; apply(); });
        b.appendChild(row('Icon', iconSel));

        // Pill position (the whole resource pill on the island).
        const pillXY = makeXYScale(cfg.resourceReq, apply);
        pillXY.classList.add('ms-pi-main-pos');
        b.appendChild(pillXY);

        // ---- Icon position (within the pill) ----
        // Backwards-compat: ensure iconPos exists for configs saved before
        // this feature shipped.
        if (!cfg.resourceReq.iconPos) {
          cfg.resourceReq.iconPos = { x: 0, y: 0, scale: 100 };
        }
        const iconHead = document.createElement('div');
        iconHead.style.cssText = 'display:flex;align-items:center;justify-content:space-between;font-size:10px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:#9e8cb2;margin:8px 0 2px;border-top:1px dashed rgba(92,242,255,0.18);padding-top:6px;';
        const iconHeadLbl = document.createElement('span'); iconHeadLbl.textContent = 'Icon position (px)';
        // Reset button — useful for getting back to flex-default (0/0/100).
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset';
        resetBtn.style.cssText = 'background:rgba(0,0,0,0.5);border:1px solid rgba(92,242,255,0.3);color:#5cf2ff;font-family:inherit;font-size:10px;padding:1px 8px;border-radius:3px;cursor:pointer;';
        resetBtn.addEventListener('click', () => {
          cfg.resourceReq.iconPos = { x: 0, y: 0, scale: 100 };
          apply();
          renderForm();           // rebuild to reset the slider visuals
        });
        iconHead.append(iconHeadLbl, resetBtn);
        b.appendChild(iconHead);

        const iconXY = makeXYScale(
          cfg.resourceReq.iconPos, apply,
          // px range for x/y, % range for scale
          { x: [-50, 50], y: [-50, 50], s: [20, 300] }
        );
        iconXY.classList.add('ms-pi-icon-pos');
        b.appendChild(iconXY);
      }, 'resourceReq'));

      // ---- Island Name ----
      form.appendChild(block('Island Name', (b, head) => {
        const tg = document.createElement('input');
        tg.type = 'checkbox'; tg.className = 'ms-pi-toggle';
        tg.checked = !!cfg.islandName.show;
        tg.addEventListener('change', () => { cfg.islandName.show = tg.checked; apply(); });
        head.appendChild(tg);
        const txt = document.createElement('input');
        txt.type = 'text'; txt.className = 'ms-text-input';
        txt.value = cfg.islandName.text;
        txt.addEventListener('input', () => { cfg.islandName.text = txt.value; apply(); });
        b.appendChild(row('Text', txt));
        b.appendChild(makeXYScale(cfg.islandName, apply));
      }, 'islandName'));

      // ---- Battle Indicators ----
      form.appendChild(block('Battle Indicators', (b) => {
        const cnt = document.createElement('input');
        cnt.type = 'range'; cnt.className = 'ms-slider';
        cnt.min = 0; cnt.max = 6; cnt.step = 1; cnt.value = cfg.battle.count;
        const cntVal = document.createElement('span');
        cntVal.className = 'ms-value'; cntVal.textContent = cfg.battle.count;
        cnt.addEventListener('input', () => {
          cfg.battle.count = +cnt.value; cntVal.textContent = cnt.value; apply();
        });
        const cntRow = document.createElement('div'); cntRow.className = 'ms-pi-row';
        const cntLbl = document.createElement('label'); cntLbl.textContent = 'Count';
        cntRow.append(cntLbl, cnt, cntVal);
        b.appendChild(cntRow);

        const sc = document.createElement('input');
        sc.type = 'range'; sc.className = 'ms-slider';
        sc.min = 20; sc.max = 300; sc.step = 5; sc.value = cfg.battle.scale;
        const scVal = document.createElement('span');
        scVal.className = 'ms-value'; scVal.textContent = cfg.battle.scale + '%';
        sc.addEventListener('input', () => {
          cfg.battle.scale = +sc.value; scVal.textContent = sc.value + '%'; apply();
        });
        const scRow = document.createElement('div'); scRow.className = 'ms-pi-row';
        const scLbl = document.createElement('label'); scLbl.textContent = 'Scale';
        scRow.append(scLbl, sc, scVal);
        b.appendChild(scRow);
      }));

      // ---- Notification Badge ----
      form.appendChild(block('Notification', (b) => {
        const typeSel = makeSelect(badgeTypes, cfg.badge.type);
        typeSel.addEventListener('change', () => { cfg.badge.type = typeSel.value; apply(); });
        b.appendChild(row('Type', typeSel));
        b.appendChild(makeXYScale(cfg.badge, apply));
      }, 'badge'));
    }

    sel.addEventListener('change', renderForm);
    // Default to the first island
    if (sel.options.length) { sel.selectedIndex = 0; renderForm(); }

    // ---- Drag Mode + Reset row -----------------------------
    {
      const ctrlRow = document.createElement('div');
      ctrlRow.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 0 10px;';
      const inner = [];
      if (wm.setEditMode) {
        inner.push(`
          <button class="ms-drag-toggle" id="msDragToggle"
                  style="flex:1;padding:6px 10px;background:rgba(0,0,0,0.6);border:1px solid rgba(92,242,255,0.35);border-radius:5px;color:#fff;font-family:inherit;font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;cursor:pointer">
            Drag mode: OFF
          </button>`);
      }
      if (wm.clearStoredConfigs) {
        inner.push(`
          <button class="ms-reset-stored" id="msResetStored"
                  title="Wipe saved positions/scales and restore seed defaults"
                  style="padding:6px 10px;background:rgba(0,0,0,0.6);border:1px solid rgba(255,138,138,0.5);border-radius:5px;color:#ff8a8a;font-family:inherit;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;cursor:pointer">
            Reset
          </button>`);
      }
      ctrlRow.innerHTML = inner.join('');
      sel.parentElement.parentElement.insertBefore(ctrlRow, sel.parentElement);

      // Helper hint line below the buttons.
      const hint = document.createElement('div');
      hint.style.cssText = 'font-size:10px;color:#9e8cb2;line-height:1.3;padding:0 0 8px;';
      hint.textContent = wm.setEditMode
        ? 'Drag mode lets you reposition any element on the map. All adjustments persist across reloads.'
        : 'Adjustments persist across reloads. Reset wipes saved positions back to defaults.';
      sel.parentElement.parentElement.insertBefore(hint, sel.parentElement);

      const dragBtn = ctrlRow.querySelector('#msDragToggle');
      if (dragBtn) {
        dragBtn.addEventListener('click', () => {
          const next = !wm.isEditMode();
          wm.setEditMode(next);
          dragBtn.textContent = 'Drag mode: ' + (next ? 'ON' : 'OFF');
          dragBtn.style.background = next ? 'linear-gradient(135deg,#5cf2ff,#2a8aff)' : 'rgba(0,0,0,0.6)';
          dragBtn.style.borderColor = next ? '#5cf2ff' : 'rgba(92,242,255,0.35)';
        });
      }
      const resetBtn = ctrlRow.querySelector('#msResetStored');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          // No native confirm() in headless tests; ok in real browser.
          if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
            if (!window.confirm('Reset all per-island element positions, scales, and types to seed defaults? This wipes saved adjustments.')) return;
          }
          wm.clearStoredConfigs();
          renderForm();   // rebuild form from the now-default config
        });
      }
    }

    // If something else clears the configs (e.g., another tab), re-render too.
    document.addEventListener('worldmap:configs-reset', () => renderForm());

    // Live update during drag — find the right block + axis inputs and set
    // them without re-rendering the whole form (preserves focus / scroll).
    document.addEventListener('worldmap:island-edited', (e) => {
      const { key, path, x, y } = e.detail;
      // Auto-switch the form to the dragged island so its sliders show.
      if (sel.value !== key) { sel.value = key; renderForm(); }
      const blk = form.querySelector(`.ms-pi-block[data-config-path="${path}"]`);
      if (!blk) return;
      // Only update the main element's XY inputs — skip nested per-element
      // sub-controls like the resource-icon offset, which has its own xy.
      const xs = blk.querySelectorAll('input[data-axis="x"]');
      const ys = blk.querySelectorAll('input[data-axis="y"]');
      xs.forEach(i => {
        if (i.closest('.ms-pi-icon-pos')) return;
        i.value = x.toFixed(0);
      });
      ys.forEach(i => {
        if (i.closest('.ms-pi-icon-pos')) return;
        i.value = y.toFixed(0);
      });
    });
    // After drag end, the island has been re-rendered; just rebuild the form
    // to ensure all values match the committed config.
    document.addEventListener('worldmap:island-edit-end', (e) => {
      if (sel.value === e.detail.key) renderForm();
    });
  }


  // ---- Open/close ---------------------------------------------
  function setOpen(open) {
    panel.classList.toggle('open', open);
    toggle.classList.toggle('open', open);
    panel.style.transform = open ? 'translateX(0)' : 'translateX(100%)';
    if (open) {
      toggle.style.background = 'linear-gradient(135deg, #5cf2ff, #2a8aff)';
      toggle.style.color = '#fff';
    } else {
      toggle.style.background = '';
      toggle.style.color = '#5cf2ff';
    }
  }
  toggle.addEventListener('click', () => setOpen(!panel.classList.contains('open')));
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea')) return;
    if (e.key === 'm' || e.key === 'M') setOpen(!panel.classList.contains('open'));
  });
})();
