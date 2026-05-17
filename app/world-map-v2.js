/* ============================================================
   WORLD MAP v2
   - Renders disabled background + per-island PNG layers
   - Tap an island to toggle active
   - Click "Zoom in" then drag to pan around
   - Exposes window.WorldMapV2 for the Map States debug panel
   ============================================================ */

(function () {
  'use strict';

  // Anchored on World-Map-Active.png (2577 × 1245); World-Map-Disabled.png is identical.
  const ASSET_DIR = '../assets/map%20islands/';

  // Sorted biggest → smallest so smaller islands paint on top.
  const ISLANDS = [
    { key: 'empire',    label: 'Empire',         active: 'Island-Empire.png',         disabled: 'Island-Empire-Disabled.png',         x: 24.3694, y: 29.4779, w: 23.7873, h: 37.7510 },
    { key: 'expedition',label: 'Expedition',     active: 'Island-Expedition.png',     disabled: 'Island-Expedition-Disabled.png',     x: 51.1059, y: 30.3614, w: 19.3248, h: 33.4940 },
    { key: 'mines3',    label: 'Mines 3',        active: 'Island-Mines-3.png',        disabled: 'Island-Mines-3-Disabled.png',        x: 73.9232, y: 20.6426, w: 14.3966, h: 20.8032 },
    { key: 'mines2',    label: 'Mines 2',        active: 'Island-Mines-2.png',        disabled: 'Island-Mines-2-Disabled.png',        x: 21.4979, y: 65.6225, w: 11.4862, h: 25.1406 },
    { key: 'isle2',     label: 'Isle 2',         active: 'Island-2.png',              disabled: 'Island-2-Disabled.png',              x: 22.9724, y:  4.4177, w: 11.5638, h: 21.1245 },
    { key: 'isle7',     label: 'Isle 7',         active: 'Island-7.png',              disabled: 'Island-7-Disabled.png',              x: 81.5677, y: 45.0602, w:  6.8685, h: 33.1727 },
    { key: 'isle3',     label: 'Isle 3',         active: 'Island-3.png',              disabled: 'Island-3-Disabled.png',              x: 35.8945, y:  1.5261, w: 12.5340, h: 18.1526 },
    { key: 'mines4',    label: 'Mines 4',        active: 'Island-Mines-4.png',        disabled: 'Island-Mines-4-Disabled.png',        x: 69.0338, y: 64.4177, w:  9.6236, h: 20.6426 },
    { key: 'pve',       label: 'PvE',            active: 'PVE-Island.png',            disabled: 'PVE-Island-Disabled.png',            x: 51.3776, y: 10.3614, w: 12.6504, h: 15.5020 },
    { key: 'isle13',    label: 'Isle 13',        active: 'Island-13.png',             disabled: 'Island-13-Disabled.png',             x: 11.7967, y: 33.0120, w:  7.5281, h: 25.0602 },
    { key: 'isle1',     label: 'Isle 1',         active: 'Island-1.png',              disabled: 'Island-1-Disabled.png',              x:  9.3520, y: 10.5221, w: 11.6026, h: 15.5823 },
    { key: 'isle4',     label: 'Isle 4',         active: 'Island-4.png',              disabled: 'Island-4-Disabled.png',              x: 66.5891, y:  3.9357, w:  8.0326, h: 22.0080 },
    { key: 'isle9',     label: 'Isle 9',         active: 'Island-9.png',              disabled: 'Island-9-Disabled.png',              x: 58.1296, y: 62.8112, w: 10.2833, h: 16.3855 },
    { key: 'pvp3',      label: 'PvP 3',          active: 'Island-PVP-3.png',          disabled: 'Island-PVP-3-Disabled.png',          x: 48.8553, y: 75.2610, w: 11.2146, h: 14.9398 },
    { key: 'mines1',    label: 'Mines 1',        active: 'Island-Mines-1.png',        disabled: 'Island-Mines-1-Disabled.png',        x:  2.3283, y: 51.5663, w: 10.2833, h: 16.2249 },
    { key: 'ravagers',  label: 'Ravagers Reef',  active: 'Island-Ravagers-Reef.png',  disabled: 'Island-Ravagers-Reef-Disabled.png',  x: 42.0256, y: 22.4900, w:  8.5371, h: 19.2771 },
    { key: 'isle5',     label: 'Isle 5',         active: 'Island-5.png',              disabled: 'Island-5-Disabled.png',              x: 77.9201, y:  5.1406, w: 11.2922, h: 14.1365 },
    { key: 'isle8',     label: 'Isle 8',         active: 'Island-8.png',              disabled: 'Island-8-Disabled.png',              x: 78.8902, y: 81.4458, w: 10.3997, h: 14.8594 },
    { key: 'isle10',    label: 'Isle 10',        active: 'Island-10.png',             disabled: 'Island-10-Disabled.png',             x: 37.0974, y: 73.9759, w:  8.9639, h: 15.8233 },
    { key: 'isle6',     label: 'Isle 6',         active: 'Island-6.png',              disabled: 'Island-6-Disabled.png',              x: 72.0993, y: 43.8554, w:  7.0625, h: 16.2249 },
    { key: 'isle11',    label: 'Isle 11',        active: 'Island-11.png',             disabled: 'Island-11-Disabled.png',             x: 11.3698, y: 75.8233, w:  7.1401, h: 15.9036 },
    { key: 'pvp2',      label: 'PvP 2',          active: 'Island-PVP-2.png',          disabled: 'Island-PVP-2-Disabled.png',          x: 46.0225, y: 59.8394, w:  8.4206, h: 13.0120 },
    { key: 'pvp1',      label: 'PvP 1',          active: 'Island-PVP-1.png',          disabled: 'Island-PVP-1-Disabled.png',          x: 20.1397, y: 24.0964, w:  6.6356, h: 14.2169 },
    { key: 'isle12',    label: 'Isle 12',        active: 'Island-12.png',             disabled: 'Island-12-Disabled.png',             x: 15.3279, y: 61.6064, w:  7.0237, h: 11.4056 },
  ];

  // Default-active set: the named gameplay islands.
  const DEFAULT_ACTIVE = new Set(['empire', 'expedition', 'pve', 'ravagers', 'pvp1', 'pvp2', 'pvp3']);

  const stageEl   = document.getElementById('wmStage');
  const canvasEl  = document.getElementById('wmCanvas');
  const islandsEl = document.getElementById('wmIslands');
  const btnZoom   = document.getElementById('btnZoom');
  const btnReset  = document.getElementById('btnRecenter');
  const btnAllOn  = document.getElementById('btnAllActive');
  const btnAllOff = document.getElementById('btnAllOff');
  const bgImgEl   = document.getElementById('wmBg');

  // ---- Build island DOM ----------------------------------------
  const islandRefs = new Map();

  ISLANDS.forEach(def => {
    const w = document.createElement('div');
    w.className = 'wm-island';
    w.dataset.key = def.key;
    w.dataset.label = def.label;
    w.style.left   = def.x + '%';
    w.style.top    = def.y + '%';
    w.style.width  = def.w + '%';
    w.style.height = def.h + '%';

    const disabledImg = document.createElement('img');
    disabledImg.className = 'wm-disabled';
    disabledImg.src = ASSET_DIR + def.disabled;
    disabledImg.alt = def.label + ' (disabled)';

    const activeImg = document.createElement('img');
    activeImg.className = 'wm-active';
    activeImg.src = ASSET_DIR + def.active;
    activeImg.alt = def.label;

    // Tint sits on top, masked to the active sprite shape so the multiply
    // is confined to the island silhouette. We set mask-image directly on
    // the element (not via CSS var) for maximum browser compatibility.
    const tintEl = document.createElement('div');
    tintEl.className = 'wm-tint';
    const maskUrl = `url("${ASSET_DIR + def.active}")`;
    tintEl.style.maskImage = maskUrl;
    tintEl.style.webkitMaskImage = maskUrl;

    w.appendChild(disabledImg);
    w.appendChild(activeImg);
    w.appendChild(tintEl);
    islandsEl.appendChild(w);

    // Tap → toggle active
    activeImg.addEventListener('click',   (e) => { e.stopPropagation(); toggleActive(def.key); });
    disabledImg.addEventListener('click', (e) => { e.stopPropagation(); toggleActive(def.key); });

    if (DEFAULT_ACTIVE.has(def.key)) w.classList.add('is-active');

    islandRefs.set(def.key, { wrapper: w, activeImg, disabledImg, tintEl, def });
  });

  function toggleActive(key) {
    if (didDrag) return;
    const ref = islandRefs.get(key);
    if (!ref) return;
    ref.wrapper.classList.toggle('is-active');
  }

  function setAllActive(on) {
    islandRefs.forEach(ref => ref.wrapper.classList.toggle('is-active', on));
  }

  // ---- Zoom + pan ---------------------------------------------
  const ZOOM_MIN     = 1.0;
  const ZOOM_MAX     = 6.0;
  const ZOOM_DEFAULT = 1.0;
  const ZOOM_PRESET  = 2.4;   // button quick-zoom level
  const WHEEL_SPEED  = 0.0018; // tuned for typical mouse + trackpad deltas

  let zoom    = ZOOM_DEFAULT;
  let panX    = 0;
  let panY    = 0;
  let didDrag = false;

  function applyTransform(animated = true) {
    canvasEl.style.transition = animated ? 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
    canvasEl.style.transform =
      `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${zoom})`;
  }

  function clampPan() {
    const stageRect = stageEl.getBoundingClientRect();
    const cw = canvasEl.offsetWidth;
    const ch = canvasEl.offsetHeight;
    const maxX = Math.max(0, (cw * zoom - stageRect.width)  / 2);
    const maxY = Math.max(0, (ch * zoom - stageRect.height) / 2);
    panX = Math.max(-maxX, Math.min(maxX, panX));
    panY = Math.max(-maxY, Math.min(maxY, panY));
  }

  function updateZoomBtn() {
    if (zoom <= ZOOM_MIN + 0.001) {
      btnZoom.textContent = 'Zoom in';
      btnZoom.classList.remove('is-on');
    } else {
      btnZoom.textContent = `Reset · ${zoom.toFixed(1)}×`;
      btnZoom.classList.add('is-on');
    }
    canvasEl.dataset.zoom = zoom > ZOOM_MIN ? 'in' : 'out';
  }

  // Set zoom to an absolute level. If anchor is supplied (clientX/clientY in
  // stage coords), the canvas point under that screen pixel stays put.
  function setZoom(level, anchor = null, animated = true) {
    const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, level));
    if (anchor && next !== zoom) {
      const stageRect = stageEl.getBoundingClientRect();
      // Cursor offset from stage center
      const ox = anchor.clientX - (stageRect.left + stageRect.width  / 2);
      const oy = anchor.clientY - (stageRect.top  + stageRect.height / 2);
      // Canvas point currently under cursor (pre-zoom, in canvas pixels from center)
      const px = (ox - panX) / zoom;
      const py = (oy - panY) / zoom;
      // After zoom change, keep that same canvas point under the cursor
      panX = ox - px * next;
      panY = oy - py * next;
    }
    zoom = next;
    if (zoom <= ZOOM_MIN + 0.001) { panX = 0; panY = 0; }
    clampPan();
    updateZoomBtn();
    applyTransform(animated);
  }

  btnZoom.addEventListener('click', () => {
    setZoom(zoom > ZOOM_MIN + 0.001 ? ZOOM_DEFAULT : ZOOM_PRESET);
  });
  btnReset.addEventListener('click', () => { panX = 0; panY = 0; clampPan(); applyTransform(true); });
  btnAllOn.addEventListener('click',  () => setAllActive(true));
  btnAllOff.addEventListener('click', () => setAllActive(false));

  // ---- Wheel zoom ---------------------------------------------
  // Multiplicative scaling feels natural: each notch changes zoom by a fixed
  // ratio so going from 1×→2× takes the same effort as 2×→4×.
  // `ctrlKey` on a wheel event = browser-level pinch gesture on a trackpad —
  // we want to handle that too instead of letting the page itself zoom.
  stageEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    // Negative deltaY = scroll up = zoom in.
    const factor = Math.exp(-e.deltaY * WHEEL_SPEED);
    setZoom(zoom * factor, { clientX: e.clientX, clientY: e.clientY }, false);
  }, { passive: false });

  // ---- Drag-to-pan (pointer events) ---------------------------
  let dragging  = false;
  let dragStart = { x: 0, y: 0, panX: 0, panY: 0 };

  stageEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    dragging = true;
    didDrag  = false;
    dragStart = { x: e.clientX, y: e.clientY, panX, panY };
    stageEl.classList.add('is-panning');
    stageEl.setPointerCapture(e.pointerId);
  });

  stageEl.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (!didDrag && Math.hypot(dx, dy) > 4) didDrag = true;
    if (zoom <= 1) return;
    panX = dragStart.panX + dx;
    panY = dragStart.panY + dy;
    clampPan();
    applyTransform(false);
  });

  function endPan(e) {
    if (!dragging) return;
    dragging = false;
    stageEl.classList.remove('is-panning');
    if (e.pointerId !== undefined) {
      try { stageEl.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    setTimeout(() => { didDrag = false; }, 0);
  }
  stageEl.addEventListener('pointerup',     endPan);
  stageEl.addEventListener('pointercancel', endPan);
  stageEl.addEventListener('pointerleave',  endPan);

  window.addEventListener('resize', () => { clampPan(); applyTransform(false); });

  // ---- Public API for the debug panel -------------------------
  window.WorldMapV2 = {
    setBackgroundColor(color) {
      document.documentElement.style.setProperty('--bg-color', color);
    },
    setTint(color, strength /* 0–1 */) {
      document.documentElement.style.setProperty('--tint-color',    color);
      document.documentElement.style.setProperty('--tint-strength', String(strength));
    },
    setStroke(color, widthPx) {
      const svg = document.querySelector('#wmStroke');
      if (!svg) return;
      svg.querySelector('feMorphology').setAttribute('radius', String(widthPx));
      svg.querySelector('feFlood').setAttribute('flood-color', color);
      const filterValue = widthPx > 0 ? 'url(#wmStroke)' : 'none';
      document.documentElement.style.setProperty('--stroke-filter', filterValue);
      document.documentElement.style.setProperty('--stroke-color',  color);
      document.documentElement.style.setProperty('--stroke-width',  widthPx + 'px');
    },
    setIslandActive(key, isActive) {
      const ref = islandRefs.get(key);
      if (!ref) return;
      ref.wrapper.classList.toggle('is-active', !!isActive);
    },
    setAllActive,
    listIslands() { return ISLANDS.map(i => ({ key: i.key, label: i.label })); },
    isActive(key) {
      const ref = islandRefs.get(key);
      return ref ? ref.wrapper.classList.contains('is-active') : false;
    },
    setBackgroundVariant(variant /* 'active' | 'disabled' */) {
      const file = variant === 'active' ? 'World-Map-Active.png' : 'World-Map-Disabled.png';
      bgImgEl.src = '../assets/backgrounds/' + file;
    },
  };

  applyTransform(false);
  document.dispatchEvent(new CustomEvent('worldmap:ready'));
})();
