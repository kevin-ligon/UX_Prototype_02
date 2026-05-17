/* ============================================================
   WORLD MAP v3 — layered islands + continuous zoom/pan
                  + per-island managed prop / banner / badge system
   Mounts on top of world-map.html's existing markup.
   ============================================================ */

(function () {
  'use strict';

  // ---- Optional per-page config override -----------------------
  // Pages that want a different island set, asset directory, or
  // localStorage namespace (e.g. the standalone Ravagers Reef map)
  // set window.WM_MAP_CONFIG = { ... } BEFORE this script loads.
  // World-map.html sets nothing → all defaults below apply, so its
  // behavior is unchanged.
  const _cfg = (typeof window !== 'undefined' && window.WM_MAP_CONFIG) || {};

  const ASSET_DIR = _cfg.assetDir || '../assets/map%20islands/';

  // Background images used by setBackgroundVariant(). The reef map
  // can override to use empty strings or its own atmospheric bg.
  const BG_FILES = _cfg.bgFiles || {
    active:   'World-Map-Active.png',
    disabled: 'World-Map-Disabled.png',
  };
  const BG_DIR = _cfg.bgDir || '../assets/backgrounds/';

  // Storage prefix lets a second page (the reef map) keep its own
  // per-island configs / global settings / active set without
  // colliding with the world map's localStorage.
  const STORAGE_PREFIX = _cfg.storagePrefix || 'wm-v3-';

  // Versioned storage keys — bump the suffix on a breaking schema
  // change; deepMerge handles additive changes automatically.
  const STORAGE_KEY = STORAGE_PREFIX + 'island-configs-v1';
  const GLOBAL_KEY  = STORAGE_PREFIX + 'global-settings-v1';

  function saveIslandConfigs() {
    try {
      const obj = {};
      perIslandConfig.forEach((cfg, key) => { obj[key] = cfg; });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      // Non-fatal: localStorage may be disabled (private mode) or full.
      console.warn('[wm-v3] failed to save island configs:', e);
    }
  }
  function loadIslandConfigs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('[wm-v3] failed to load island configs:', e);
      return null;
    }
  }

  // Global element-size multipliers (% of per-island scale). Affect every
  // island at once, exposed as CSS custom properties consumed by placeAt's
  // `calc(... * var(...))`. Defaults = 100%, no effect.
  const GLOBAL_DEFAULTS = { islandNameScale: 100, resourceScale: 100, bannerScale: 100 };
  let globalSettings = { ...GLOBAL_DEFAULTS };

  function saveGlobalSettings() {
    try { localStorage.setItem(GLOBAL_KEY, JSON.stringify(globalSettings)); }
    catch (e) { console.warn('[wm-v3] failed to save global settings:', e); }
  }
  function loadGlobalSettings() {
    try {
      const raw = localStorage.getItem(GLOBAL_KEY);
      if (raw) Object.assign(globalSettings, JSON.parse(raw));
    } catch (e) { /* non-fatal */ }
  }
  function applyGlobalScales() {
    const root = document.documentElement;
    root.style.setProperty('--wm-island-name-scale', String(globalSettings.islandNameScale / 100));
    root.style.setProperty('--wm-resource-scale',    String(globalSettings.resourceScale    / 100));
    root.style.setProperty('--wm-banner-scale',      String(globalSettings.bannerScale      / 100));
  }
  loadGlobalSettings();
  // applyGlobalScales is called again later, but do it now too so the very
  // first paint already respects the user's saved global sizes.
  applyGlobalScales();

  // Canonical island data — anchored on World-Map-Active.png (2577 × 1245).
  // World-map default. Override per-page via window.WM_MAP_CONFIG.islands.
  const ISLANDS = _cfg.islands || [
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

  const DEFAULT_ACTIVE = new Set(
    _cfg.defaultActive || ['empire', 'expedition', 'pve', 'ravagers', 'pvp1', 'pvp2', 'pvp3']
  );

  // Persisted set of active islands. When the user toggles an island
  // active/inactive via the Map States debug panel, we save the resulting
  // set here so the choice survives reload. If localStorage has no saved
  // value, fall back to DEFAULT_ACTIVE.
  const ACTIVE_KEY = STORAGE_PREFIX + 'active-islands-v1';
  function saveActiveSet() {
    try {
      const list = [];
      islandRefs && islandRefs.forEach((ref, key) => {
        if (ref.wrapper.classList.contains('is-active')) list.push(key);
      });
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('[wm-v3] failed to save active islands:', e);
    }
  }
  function loadActiveSet() {
    try {
      const raw = localStorage.getItem(ACTIVE_KEY);
      if (!raw) return null;
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? new Set(arr) : null;
    } catch (e) { return null; }
  }

  // Game-mode categories. Each island gets a `cat-<id>` class so a per-category
  // SVG stroke filter can be applied. The order here drives the order islands
  // appear in the debug panel (toggle grid + Per-Island dropdown).
  // World-map default; overridable per-page via WM_MAP_CONFIG.categories.
  const ISLAND_CATEGORIES = _cfg.categories || [
    { id: 'empire',     label: 'Empire',     keys: ['empire'],                                                                                              defaultColor: '#5cf2ff' },
    { id: 'pve',        label: 'PVE',        keys: ['pve', 'ravagers'],                                                                                     defaultColor: '#a06bff' },
    { id: 'expedition', label: 'Expedition', keys: ['expedition'],                                                                                          defaultColor: '#ff8a3d' },
    { id: 'mines',      label: 'Mines',      keys: ['mines1', 'mines2', 'mines3', 'mines4'],                                                                defaultColor: '#ffc14d' },
    { id: 'isle',       label: 'Isle',       keys: ['isle1','isle2','isle3','isle4','isle5','isle6','isle7','isle8','isle9','isle10','isle11','isle12','isle13'], defaultColor: '#9999cc' },
    { id: 'pvp',        label: 'PvP',        keys: ['pvp1', 'pvp2', 'pvp3'],                                                                                defaultColor: '#ff5cdf' },
  ];
  const CATEGORY_FOR_KEY = {};
  ISLAND_CATEGORIES.forEach(c => c.keys.forEach(k => { CATEGORY_FOR_KEY[k] = c.id; }));

  // ---- Asset menus exposed to the debug panel -----------------
  // basePct = natural rendered width as % of the island wrapper. Tuned so a
  // 100%-scale prop sits sensibly on its island. The scale slider multiplies.
  const PROP_TYPES = [
    { id: 'none',            label: 'None',            src: null,                                                         basePct: 0  },
    { id: 'capital-city',    label: 'Capital City',    src: '../assets/ui-elements/map_image_capital_city.png',           basePct: 50 },
    { id: 'tower-flag',      label: 'Tower (Flag)',    src: '../assets/ui-elements/map_image_tower_flag.png',             basePct: 24 },
    { id: 'tower',           label: 'Tower',           src: '../assets/ui-elements/map_image_tower.png',                  basePct: 24 },
    { id: 'roaming-monster', label: 'Roaming Monster', src: '../assets/ui-elements/map_roaming_monster.png',              basePct: 18 },
    { id: 'boss',            label: 'Boss',            src: '../assets/ui-elements/Map%20Boss.png',                       basePct: 32 },
    { id: 'expedition-prop', label: 'Map Prop (Exp)',  src: '../assets/ui-elements/Map%20Prop%20Expedition.png',          basePct: 32 },
    { id: 'pvp-prop',        label: 'Map Prop (PVP)',  src: '../assets/ui-elements/Map%20Prop%20PVP.png',                 basePct: 32 },
    { id: 'ravagers-prop',   label: 'Map Prop (Rav)',  src: '../assets/ui-elements/Map%20Prop%20Ravagers%20Reef.png',     basePct: 32 },
  ];

  const BANNER_TYPES = [
    { id: 'none',    label: 'None',    src: null },
    { id: 'boss',    label: 'Boss',    src: '../assets/icons/ui_map_banner_battle_boss.png'    },
    { id: 'dungeon', label: 'Dungeon', src: '../assets/icons/ui_map_banner_battle_dungeon.png' },
    { id: 'fuel',    label: 'Fuel',    src: '../assets/icons/ui_map_banner_fuel.png'           },
    { id: 'pvp',     label: 'PVP',     src: '../assets/icons/ui_map_pvp_banners.png'           },
  ];

  const RESOURCE_ICONS = [
    { id: 'none',      label: '— none —', src: null },
    { id: 'energy',    label: 'Energy',    src: '../assets/icons/resource_energy.png' },
    { id: 'gold',      label: 'Gold',      src: '../assets/icons/resource_gold.png' },
    { id: 'meteorite', label: 'Meteorite', src: '../assets/icons/resource_meteorite.png' },
    { id: 'fuel',      label: 'Fuel',      src: '../assets/icons/ui_currency_fuel.png' },
    { id: 'brass',     label: 'Brass',     src: '../assets/icons/resource_brass.png' },
    { id: 'coal',      label: 'Coal',      src: '../assets/icons/resource_coal.png' },
    { id: 'steel',     label: 'Steel',     src: '../assets/icons/resource_steel.png' },
  ];

  const BADGE_TYPES = [
    { id: 'none',   label: '— none —' },
    { id: 'alert',  label: '! Alert (yellow)' },
    { id: 'arrow',  label: '↑ Arrow (green)' },
    { id: 'number', label: '# Number (purple)' },
    { id: 'new',    label: 'NEW (blue)' },
    { id: 'dot',    label: '● Dot (red)' },
    { id: 'pip',    label: 'Pulse pip' },
  ];

  // ---- Per-island defaults ------------------------------------
  // Numbers below are % within each island wrapper. (50,50) = island center.
  // Negative or >100 values are allowed so banners/badges can overhang.
  function blankConfig() {
    return {
      prop:        { type: 'none', x: 50, y: 50, scale: 100 },
      // banner.types is an array — multi-select. Multiple banners lay out
      // horizontally on a row centered on (x, y) with a fixed gap.
      banner:      { types: [], x: 50, y: -8, scale: 100, gap: 4 },
      propName:    { show: false, text: '',       x: 50, y: -16, scale: 100 },
      islandName:  { show: true,  text: '',       x: 50, y: 105, scale: 100 },
      // iconPos = independent transform on the icon img inside the pill —
      // x/y in px (negative = left/up), scale in %.
      resourceReq: { show: false, text: '24/24', icon: 'energy', x: 50, y: 115, scale: 100,
                     iconPos: { x: 0, y: 0, scale: 100 } },
      battle:      { count: 0, scale: 100 },
      badge:       { type: 'none', x: 90, y: 8, scale: 100 },
    };
  }

  // Pre-populate the named gameplay islands so the page looks like the
  // earlier version on first load (Empire = capital city + 4 monsters,
  // Ravagers = tower with PVP banner + score, Expedition = tower + score).
  // Per-page override via WM_MAP_CONFIG.seedConfigs.
  const SEED_CONFIGS = _cfg.seedConfigs || {
    empire: {
      prop:        { type: 'capital-city', x: 50, y: 48, scale: 100 },
      // Three banners stacked horizontally above the capital city — boss,
      // dungeon, fuel — matching the original Empire layout.
      banner:      { types: ['boss', 'dungeon', 'fuel'], x: 50, y: 4, scale: 100, gap: 4 },
      propName:    { show: true,  text: 'Capital City', x: 50, y: 25, scale: 100 },
      islandName:  { show: true,  text: 'EMPIRE',       x: 50, y: 102, scale: 100 },
      resourceReq: { show: false, text: '',       icon: 'none', x: 50, y: 115, scale: 100 },
      battle:      { count: 4, scale: 100 },
      badge:       { type: 'none', x: 90, y: 8, scale: 100 },
    },
    ravagers: {
      prop:        { type: 'tower-flag',   x: 50, y: 50, scale: 100 },
      banner:      { types: ['pvp'], x: 50, y: -10, scale: 100, gap: 4 },
      islandName:  { show: true, text: 'RAVAGERS REEF', x: 50, y: 110, scale: 100 },
      // Energy cost = 1 attempt to tap into the reef. Icon 'energy' resolves
      // to resource_energy.png — the battery glyph the world-map cost pills use.
      resourceReq: { show: true, text: '1', icon: 'energy', x: 50, y: 125, scale: 100 },
    },
    expedition: {
      prop:        { type: 'tower', x: 50, y: 52, scale: 100 },
      banner:      { types: ['pvp'], x: 50, y: 8, scale: 100, gap: 4 },
      islandName:  { show: true, text: 'EXPEDITION', x: 50, y: 102, scale: 100 },
      resourceReq: { show: true, text: '24/24', icon: 'energy', x: 50, y: 115, scale: 100 },
    },
    pve: {
      islandName:  { show: true, text: 'PVE', x: 50, y: 105, scale: 100 },
      badge:       { type: 'pip', x: 100, y: -10, scale: 100 },
    },
    pvp1: { islandName: { show: true, text: 'PVP', x: 50, y: 110, scale: 100 } },
    pvp2: { islandName: { show: true, text: 'PVP', x: 50, y: 110, scale: 100 } },
    pvp3: { islandName: { show: true, text: 'PVP', x: 50, y: 110, scale: 100 } },
    mines1: { islandName: { show: true, text: 'MINES', x: 50, y: 110, scale: 100 } },
    mines2: { islandName: { show: true, text: 'MINES', x: 50, y: 110, scale: 100 } },
    mines3: { islandName: { show: true, text: 'MINES', x: 50, y: 110, scale: 100 } },
    mines4: { islandName: { show: true, text: 'MINES', x: 50, y: 110, scale: 100 } },
  };

  // Click handlers wired by key — connect each prop to its real popup.
  // The optional `anchor` is forwarded to openPopup so the popup pins next to
  // the tapped element (the prop, or the whole island wrapper).
  // World-map default; per-page override via WM_MAP_CONFIG.propClick.
  // The reef map currently provides no per-island popups (pages with no
  // popup handlers will just have non-interactive island taps).
  const PROP_CLICK = _cfg.propClick || {
    empire:     (anchor) => window.openPopup && window.openPopup('empire', anchor),
    expedition: (anchor) => window.openPopup && window.openPopup('pvp-expedition', anchor),
    ravagers:   (anchor) => window.openPopup && window.openPopup('pvp-ravagers', anchor),
    pve:        (anchor) => window.openPopup && window.openPopup('pve', anchor),
  };

  // Zoom config — defaults; mutable at runtime via the WorldMapV2 API.
  // The Map States debug panel persists user overrides to localStorage and
  // applies them on page load (so a saved value will replace these defaults).
  const ZOOM_MIN     = 1.0;
  let   zoomMax            = 2.1;
  const ZOOM_DEFAULT       = 1.0;
  const ZOOM_PRESET        = 2.0;
  let   zoomPropThreshold  = 1.2;
  const WHEEL_SPEED        = 0.0018;

  const islandsEl  = document.getElementById('wmIslands');
  const mapContent = document.getElementById('mapContent');
  const mapCanvas  = document.getElementById('mapCanvas');
  const stage      = document.querySelector('.stage');
  const bgImgEl    = document.getElementById('wmBg');
  const zoomInBtn  = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomLevelEl = document.getElementById('zoomLevel');

  if (!islandsEl || !mapContent || !mapCanvas || !stage) {
    console.warn('[wm-v3] required DOM not found, skipping init');
    return;
  }

  // ---- Inject styles for the managed-fx layer -----------------
  // Done in JS so the world-map.html doesn't need a parallel stylesheet.
  const fxStyle = document.createElement('style');
  fxStyle.textContent = `
    /* Keep the entire map (islands + their fx) below the HUD, even at deep
       zoom or weird pan positions. HUD elements have z-index 50+. */
    .map-content { z-index: 1; }

    .wm-island { overflow: visible; }
    .island-fx {
      position: absolute; inset: 0;
      pointer-events: none;
      z-index: 12;
    }

    /* Per-category stroke + tint rules are generated dynamically below
       from ISLAND_CATEGORIES so a custom config (e.g. the reef map's
       single 'reef' category) gets the same per-category selectors as
       the built-in world-map ones. */
    .ifx-el {
      position: absolute;
      transform-origin: center;
      transition: opacity 0.5s ease;
      pointer-events: auto;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.6));
    }
    /* Image scales by width; height follows aspect ratio. The wrapper sets
       width and lets height be intrinsic, so we never get a 0px-tall image. */
    .ifx-el img { display:block; width:100%; height:auto; pointer-events:none; -webkit-user-drag:none; }
    .ifx-prop:hover     { filter: drop-shadow(0 4px 8px rgba(0,0,0,0.6)) brightness(1.18); }
    .ifx-prop:active    { filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6)) brightness(0.88); }
    .ifx-text {
      position: absolute; transform-origin: center;
      font-family: 'Barlow Condensed', sans-serif;
      font-weight: 700; color: #fff;
      text-shadow: 0 2px 4px rgba(0,0,0,0.95);
      white-space: nowrap; pointer-events: none;
      transition: opacity 0.5s ease;
    }
    .ifx-prop-name { color: #fff5b8; font-size: 1.1vw; }
    .ifx-island-name {
      background: rgba(0, 0, 0, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 4px;
      padding: 4px 14px;
      font-size: clamp(10px, 1.1vw, 16px);
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .ifx-resource {
      position: absolute; transform-origin: center;
      background: rgba(0,0,0,0.85);
      border: 2px solid rgba(255,200,50,0.5);
      border-radius: 6px;
      padding: 3px 10px 3px 6px;
      display: flex; align-items: center; gap: 6px;
      font-family: 'Barlow Condensed', sans-serif;
      font-weight: 700; color: #fffbe4;
      font-size: clamp(11px, 1.1vw, 16px);
      pointer-events: none; transition: opacity 0.5s ease;
      white-space: nowrap;
    }
    .ifx-resource img { width: clamp(18px, 1.8vw, 24px); height: auto; }
    .ifx-battle {
      animation: wmBattlePulse 2.4s ease-in-out infinite;
      filter: drop-shadow(0 0 6px rgba(255,60,40,0.6)) drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    }
    @keyframes wmBattlePulse {
      0%, 100% { transform: translate(-50%, -50%) scale(var(--ifx-scale,1)); filter: drop-shadow(0 0 6px rgba(255,60,40,0.55)); }
      50%      { transform: translate(-50%, -50%) scale(calc(var(--ifx-scale,1) * 1.08));
                 filter: drop-shadow(0 0 18px rgba(255,70,50,0.95)) drop-shadow(0 0 30px rgba(255,30,20,0.45)); }
    }
    .ifx-badge {
      position: absolute; transform-origin: center;
      transition: opacity 0.5s ease;
      pointer-events: none;
    }
    .ifx-badge.badge-pip {
      animation: wmPulse 2s infinite;
    }
    @keyframes wmPulse {
      0%,100% { transform: translate(-50%, -50%) scale(var(--ifx-scale,1)); }
      50%     { transform: translate(-50%, -50%) scale(calc(var(--ifx-scale,1) * 1.15)); }
    }

    /* Zoom-gating: hide most fx children below the threshold. Island name is
       NOT gated — it should remain visible at all zooms. */
    .map-canvas[data-zoom="out"] .ifx-prop,
    .map-canvas[data-zoom="out"] .ifx-banner,
    .map-canvas[data-zoom="out"] .ifx-prop-name,
    .map-canvas[data-zoom="out"] .ifx-resource,
    .map-canvas[data-zoom="out"] .ifx-battle,
    .map-canvas[data-zoom="out"] .ifx-badge {
      opacity: 0;
      pointer-events: none;
    }

    /* ---- Drag Mode ----
       When body.wm-edit-mode is set, every draggable fx element shows a
       dashed outline + grab cursor; the v3 module's document-level handler
       routes the actual drag. */
    body.wm-edit-mode .ifx-prop,
    body.wm-edit-mode .ifx-banner,
    body.wm-edit-mode .ifx-prop-name,
    body.wm-edit-mode .ifx-island-name,
    body.wm-edit-mode .ifx-resource,
    body.wm-edit-mode .ifx-badge {
      cursor: grab;
      outline: 2px dashed rgba(92, 242, 255, 0.55);
      outline-offset: 2px;
      pointer-events: auto !important;
    }
    body.wm-edit-mode .ifx-dragging {
      cursor: grabbing;
      outline-color: #5cf2ff;
      outline-style: solid;
    }
    /* Force-show fx elements while editing so the user can grab them even
       when not zoomed in past the prop-reveal threshold. */
    body.wm-edit-mode .map-canvas .ifx-prop,
    body.wm-edit-mode .map-canvas .ifx-banner,
    body.wm-edit-mode .map-canvas .ifx-prop-name,
    body.wm-edit-mode .map-canvas .ifx-resource,
    body.wm-edit-mode .map-canvas .ifx-badge {
      opacity: 1 !important;
      pointer-events: auto !important;
    }
  `;
  // Append per-category stroke + tint rules generated from ISLAND_CATEGORIES.
  // This lets a custom config (e.g. the reef map's 'reef' category) get the
  // same per-category selectors world-map has, without anyone having to
  // hand-edit the CSS to add them.
  fxStyle.textContent += ISLAND_CATEGORIES.map(c =>
    `.wm-island.cat-${c.id}.is-active .wm-active { filter: var(--stroke-${c.id}, none); }\n` +
    `.wm-island.is-active.cat-${c.id} .wm-tint { background-color: var(--tint-${c.id}); opacity: var(--tint-strength); }`
  ).join('\n');
  document.head.appendChild(fxStyle);

  // ---- Build per-category SVG stroke filters ------------------
  // The world-map.html ships with a single <filter id="wmStroke">. We
  // duplicate it per category so each can hold its own color, then leave the
  // original in place for legacy callers.
  (function buildCategoryFilters() {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.querySelector('.wm-svg-defs svg, svg.wm-svg-defs');
    let defs;
    if (svg) {
      defs = svg.querySelector('defs');
    } else {
      // Create our own defs host if the page doesn't already have one.
      const host = document.createElementNS(svgNS, 'svg');
      host.setAttribute('class', 'wm-svg-defs');
      host.setAttribute('aria-hidden', 'true');
      defs = document.createElementNS(svgNS, 'defs');
      host.appendChild(defs);
      document.body.appendChild(host);
    }
    if (!defs) {
      const wrapper = document.querySelector('.wm-svg-defs');
      if (wrapper) {
        defs = wrapper.querySelector('defs');
        if (!defs) { defs = document.createElementNS(svgNS, 'defs'); wrapper.appendChild(defs); }
      }
    }
    ISLAND_CATEGORIES.forEach(cat => {
      const id = 'wmStroke-' + cat.id;
      if (document.getElementById(id)) return;
      const filter = document.createElementNS(svgNS, 'filter');
      filter.setAttribute('id', id);
      filter.setAttribute('x', '-20%');
      filter.setAttribute('y', '-20%');
      filter.setAttribute('width', '140%');
      filter.setAttribute('height', '140%');
      const morph = document.createElementNS(svgNS, 'feMorphology');
      morph.setAttribute('in', 'SourceAlpha');
      morph.setAttribute('operator', 'dilate');
      morph.setAttribute('radius', '0');
      morph.setAttribute('result', 'dilated');
      const flood = document.createElementNS(svgNS, 'feFlood');
      flood.setAttribute('flood-color', cat.defaultColor);
      flood.setAttribute('result', 'color');
      const composite = document.createElementNS(svgNS, 'feComposite');
      composite.setAttribute('in', 'color');
      composite.setAttribute('in2', 'dilated');
      composite.setAttribute('operator', 'in');
      composite.setAttribute('result', 'stroke');
      const merge = document.createElementNS(svgNS, 'feMerge');
      const m1 = document.createElementNS(svgNS, 'feMergeNode'); m1.setAttribute('in', 'stroke');
      const m2 = document.createElementNS(svgNS, 'feMergeNode'); m2.setAttribute('in', 'SourceGraphic');
      merge.appendChild(m1); merge.appendChild(m2);
      filter.append(morph, flood, composite, merge);
      defs.appendChild(filter);
    });
  })();

  // ---- Build island DOM ---------------------------------------
  const islandRefs       = new Map();
  const perIslandConfig  = new Map();

  function deepMerge(base, partial) {
    const out = { ...base };
    for (const k in partial) {
      if (partial[k] && typeof partial[k] === 'object' && !Array.isArray(partial[k])) {
        out[k] = { ...base[k], ...partial[k] };
      } else {
        out[k] = partial[k];
      }
    }
    return out;
  }

  // Load persisted user adjustments (positions, scales, prop/banner choices,
  // texts, etc.) so the page comes up exactly as the user left it last.
  const storedConfigs = loadIslandConfigs() || {};
  // Prefer the user's saved active-island set; otherwise seed with DEFAULT_ACTIVE.
  const initialActiveSet = loadActiveSet() || DEFAULT_ACTIVE;

  // ---- One-shot migrations on storedConfigs --------------------
  // When we change a seed default that an existing user has already
  // had merged into their localStorage, the seed change alone is
  // invisible until they hit Reset. A targeted migration overrides
  // their stored value ONLY when it still matches the old default —
  // preserving any value they explicitly picked.
  (function migrateStoredConfigs() {
    let dirty = false;
    // 2026-05: Ravagers Reef resource requirement label '24/24' → '1'.
    const rav = storedConfigs.ravagers;
    if (rav && rav.resourceReq && rav.resourceReq.text === '24/24') {
      rav.resourceReq.text = '1';
      dirty = true;
    }
    if (dirty) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(storedConfigs)); }
      catch (_) { /* non-fatal */ }
    }
  })();

  ISLANDS.forEach(def => {
    const w = document.createElement('div');
    w.className = 'wm-island';
    const cat = CATEGORY_FOR_KEY[def.key];
    if (cat) w.classList.add('cat-' + cat);
    w.dataset.key = def.key;
    w.dataset.label = def.label;
    w.dataset.category = cat || '';
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

    const tintEl = document.createElement('div');
    tintEl.className = 'wm-tint';
    const maskUrl = `url("${ASSET_DIR + def.active}")`;
    tintEl.style.maskImage = maskUrl;
    tintEl.style.webkitMaskImage = maskUrl;

    w.appendChild(disabledImg);
    w.appendChild(activeImg);
    w.appendChild(tintEl);
    islandsEl.appendChild(w);

    if (initialActiveSet.has(def.key)) w.classList.add('is-active');

    islandRefs.set(def.key, { wrapper: w, activeImg, disabledImg, tintEl, def });

    // Seed the per-island config (blank + any defaults), then overlay any
    // user adjustments that were previously persisted to localStorage.
    let cfg = deepMerge(blankConfig(), SEED_CONFIGS[def.key] || {});
    if (cfg.islandName.show && !cfg.islandName.text) {
      cfg.islandName.text = def.label.toUpperCase();
    }
    if (storedConfigs[def.key]) {
      cfg = deepMerge(cfg, storedConfigs[def.key]);
    }
    perIslandConfig.set(def.key, cfg);
  });

  // ---- Element renderers --------------------------------------
  function clearFx(islandRef) {
    const fx = islandRef.wrapper.querySelector(':scope > .island-fx');
    if (fx) fx.remove();
  }

  function makeFxWrapper() {
    const fx = document.createElement('div');
    fx.className = 'island-fx';
    return fx;
  }

  function placeAt(el, xPct, yPct, scalePct, globalVar) {
    el.style.left = xPct + '%';
    el.style.top  = yPct + '%';
    el.style.setProperty('--ifx-scale', String(scalePct / 100));
    // If a global CSS var is provided, multiply by it via calc() so a single
    // root-level variable change rescales every matching element instantly.
    const sc = globalVar
      ? `calc(${scalePct / 100} * var(${globalVar}, 1))`
      : `${scalePct / 100}`;
    el.style.transform = `translate(-50%, -50%) scale(${sc})`;
  }

  function renderProp(fx, key, cfg) {
    if (cfg.type === 'none') return;
    const t = PROP_TYPES.find(p => p.id === cfg.type);
    if (!t || !t.src) return;
    const el = document.createElement('div');
    el.className = 'ifx-el ifx-prop';
    // Width as % of the island wrapper — scales naturally with island size.
    el.style.width  = (t.basePct) + '%';
    el.style.height = 'auto';
    el.innerHTML = `<img src="${t.src}" alt="${t.label}">`;
    placeAt(el, cfg.x, cfg.y, cfg.scale);
    if (PROP_CLICK[key]) {
      el.style.cursor = 'pointer';
      // Forward the prop element as anchor so the popup pins next to it.
      el.addEventListener('click', () => PROP_CLICK[key](el));
    } else {
      el.style.pointerEvents = 'none';
    }
    fx.appendChild(el);
  }

  function renderBanner(fx, cfg) {
    // Backwards compat: convert legacy {type} → {types: [type]}.
    const types = Array.isArray(cfg.types)
      ? cfg.types.filter(t => t && t !== 'none')
      : (cfg.type && cfg.type !== 'none' ? [cfg.type] : []);
    if (!types.length) return;

    // Sizing in % of the island wrapper. Absolute positioning for each
    // banner inside the row makes the layout fully predictable — no flex
    // surprises with auto-height images.
    const itemPct = 14;                                 // each banner = 14% of island width
    const gap     = cfg.gap != null ? cfg.gap : 4;      // gap = % of island width
    const totalW  = itemPct * types.length + gap * (types.length - 1);

    const row = document.createElement('div');
    row.className = 'ifx-el ifx-banner';
    row.style.width  = totalW + '%';
    row.style.height = itemPct + '%';
    row.style.pointerEvents = 'none';

    types.forEach((id, i) => {
      const t = BANNER_TYPES.find(b => b.id === id);
      if (!t || !t.src) return;
      const item = document.createElement('div');
      item.style.position = 'absolute';
      item.style.left = (i * (itemPct + gap) / totalW * 100) + '%';
      item.style.top  = '0';
      item.style.width  = (itemPct / totalW * 100) + '%';
      item.innerHTML = `<img src="${t.src}" alt="${t.label}" style="width:100%;height:auto;display:block">`;
      row.appendChild(item);
    });

    placeAt(row, cfg.x, cfg.y, cfg.scale, '--wm-banner-scale');
    fx.appendChild(row);
  }

  function renderText(fx, kind, cfg, fallback) {
    if (!cfg.show) return;
    const text = (cfg.text && cfg.text.trim()) || fallback || '';
    if (!text) return;
    const el = document.createElement('div');
    el.className = 'ifx-text ifx-' + kind;
    el.textContent = text;
    // Only the island-name participates in the global scale group; the
    // prop-name stays per-island so it can be tuned to its prop.
    const globalVar = (kind === 'island-name') ? '--wm-island-name-scale' : null;
    placeAt(el, cfg.x, cfg.y, cfg.scale, globalVar);
    fx.appendChild(el);
  }

  function renderResource(fx, cfg) {
    if (!cfg.show) return;
    const text = (cfg.text || '').trim();
    const icon = RESOURCE_ICONS.find(r => r.id === cfg.icon);
    if (!text && (!icon || !icon.src)) return;
    const el = document.createElement('div');
    el.className = 'ifx-resource';
    if (icon && icon.src) {
      const img = document.createElement('img');
      img.src = icon.src;
      img.alt = '';
      const ip = cfg.iconPos || { x: 0, y: 0, scale: 100 };
      // Apply iconPos as a transform on top of whatever the flex layout gives us.
      // Pixels feel the most predictable here — the pill is small enough that a
      // ±50 px slider range covers the useful adjustment space.
      const sc = (ip.scale != null ? ip.scale : 100) / 100;
      img.style.transform = `translate(${ip.x || 0}px, ${ip.y || 0}px) scale(${sc})`;
      img.style.transformOrigin = 'center';
      el.appendChild(img);
    }
    el.appendChild(document.createTextNode(text));
    placeAt(el, cfg.x, cfg.y, cfg.scale, '--wm-resource-scale');
    fx.appendChild(el);
  }

  function renderBattle(fx, cfg) {
    if (!cfg.count || cfg.count <= 0) return;
    const positions = [
      [25, 35], [70, 35], [30, 70], [70, 70], [50, 25], [50, 80],
    ];
    for (let i = 0; i < cfg.count && i < positions.length; i++) {
      const el = document.createElement('div');
      el.className = 'ifx-el ifx-battle';
      el.style.width = '12%';   // % of island wrapper
      el.innerHTML = `<img src="../assets/ui-elements/Map%20Battle%20Indicator.png" alt="Battle">`;
      el.style.animationDelay = (i * 0.6) + 's';
      placeAt(el, positions[i][0], positions[i][1], cfg.scale);
      el.style.pointerEvents = 'none';
      fx.appendChild(el);
    }
  }

  function renderBadge(fx, cfg) {
    if (cfg.type === 'none') return;
    const el = document.createElement('div');
    el.className = 'ifx-badge badge-' + cfg.type;
    if (cfg.type === 'pip') {
      el.style.width = '14%'; // % of island wrapper
      el.innerHTML = `<img src="../assets/ui-elements/Notification%20Pip%20Large.png" alt="Alert" style="width:100%;height:auto;">`;
    } else {
      // Reuse the badge styles already defined in app/badges.css.
      el.classList.add('badge', 'badge-' + cfg.type);
      if (cfg.type === 'alert')  el.textContent = '!';
      if (cfg.type === 'arrow')  el.textContent = '↑';
      if (cfg.type === 'new')    el.textContent = 'NEW';
      if (cfg.type === 'number') el.textContent = '12';
    }
    placeAt(el, cfg.x, cfg.y, cfg.scale);
    fx.appendChild(el);
  }

  function renderIsland(key) {
    const ref = islandRefs.get(key);
    if (!ref) return;
    const cfg = perIslandConfig.get(key);
    if (!cfg) return;
    clearFx(ref);
    const fx = makeFxWrapper();
    ref.wrapper.appendChild(fx);

    renderProp(fx, key, cfg.prop);
    renderBanner(fx, cfg.banner);
    renderText(fx, 'prop-name',   cfg.propName);
    renderText(fx, 'island-name', cfg.islandName, ref.def.label.toUpperCase());
    renderResource(fx, cfg.resourceReq);
    renderBattle(fx, cfg.battle);
    renderBadge(fx, cfg.badge);
  }

  function renderAllIslands() { ISLANDS.forEach(d => renderIsland(d.key)); }
  renderAllIslands();

  // The original world-map.html still ships its own .label-empire etc.
  // labels in the markup. They'd duplicate the new ifx-island-name, so hide
  // them now that the per-island system owns the island name.
  ['label-empire','label-expedition','label-ravagers','label-pve',
   'label-mines-1','label-mines-2','label-mines-3','label-mines-4',
   'label-pvp-1','label-pvp-2','label-pvp-3',
   'label-empire-z','label-ravagers-z','label-expedition-z','label-pve-z']
    .forEach(c => document.querySelectorAll('.' + c).forEach(el => { el.style.display = 'none'; }));

  // Tap an island wrapper (not its fx children):
  //   - If the island has a popup wired in PROP_CLICK:
  //       - At zoom > 1, smoothly pan the camera so the island lands at
  //         screen center first, then open the popup once the transition
  //         completes. Keeps the popup anchored on the (now-centered)
  //         island art instead of spawning off-screen toward whichever
  //         edge the player tapped from.
  //       - At zoom = 1, just open the popup immediately (no pan needed).
  //   - If no popup is wired, do nothing. (Designer state toggles live in
  //     the Map States panel → Islands grid.)
  // Animation duration matches applyTransform's CSS transition (0.45s);
  // we add a tiny buffer so the popup's getBoundingClientRect measurement
  // sees the final transformed anchor position.
  const CENTER_THEN_POPUP_DELAY_MS = 470;
  let pendingPopupTimer = null;

  islandsEl.addEventListener('click', (e) => {
    if (didDrag) return;
    if (e.target.closest('.island-fx')) return;
    const islandEl = e.target.closest('.wm-island');
    if (!islandEl) return;
    const key = islandEl.dataset.key;
    if (!key || !PROP_CLICK[key]) return;

    // A fresh click cancels any in-flight pan-then-popup chain so two
    // rapid taps on different islands don't stack popups.
    if (pendingPopupTimer) {
      clearTimeout(pendingPopupTimer);
      pendingPopupTimer = null;
    }

    if (zoom > ZOOM_MIN + 0.001) {
      const { changed } = window.WorldMapV2.centerOnIsland(key, true);
      if (changed) {
        // Wait for the smooth pan to finish before showing the popup so the
        // anchor (the island wrapper) is at its final on-screen position when
        // openPopup() measures it for placement.
        pendingPopupTimer = setTimeout(() => {
          pendingPopupTimer = null;
          PROP_CLICK[key](islandEl);
        }, CENTER_THEN_POPUP_DELAY_MS);
      } else {
        // Already centered — show popup immediately, no laggy delay.
        PROP_CLICK[key](islandEl);
      }
    } else {
      // Fully zoomed out — current popup positioning (anchored to the tap
      // point) is fine; no recenter needed.
      PROP_CLICK[key](islandEl);
    }
  });

  // ---- Continuous zoom + pan ----------------------------------
  let zoom    = ZOOM_DEFAULT;
  let panX    = 0;
  let panY    = 0;
  let didDrag = false;

  function applyTransform(animated = true) {
    mapContent.style.transition = animated ? 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
    mapContent.style.transform  = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  }

  function clampPan() {
    const cw = mapContent.offsetWidth;
    const ch = mapContent.offsetHeight;
    const stageRect = stage.getBoundingClientRect();
    const maxX = Math.max(0, (cw * zoom - stageRect.width)  / 2);
    const maxY = Math.max(0, (ch * zoom - stageRect.height) / 2);
    panX = Math.max(-maxX, Math.min(maxX, panX));
    panY = Math.max(-maxY, Math.min(maxY, panY));
  }

  function syncZoomBtnState() {
    if (zoomInBtn)  zoomInBtn .classList.toggle('active', zoom > ZOOM_MIN + 0.001);
    if (zoomOutBtn) zoomOutBtn.classList.toggle('active', zoom <= ZOOM_MIN + 0.001);
    if (zoomLevelEl) {
      zoomLevelEl.textContent = zoom.toFixed(1) + '×';
      // Highlight when pinned at the configured ceiling so the player can see
      // why the wheel won't zoom in any further.
      zoomLevelEl.classList.toggle('at-max', zoom >= zoomMax - 0.01);
    }
    mapCanvas.dataset.zoom = zoom > zoomPropThreshold ? 'in' : 'out';
  }

  function setZoom(level, anchor = null, animated = true) {
    const next = Math.max(ZOOM_MIN, Math.min(zoomMax, level));
    if (anchor && next !== zoom) {
      const rect = mapContent.getBoundingClientRect();
      const cx = rect.left + rect.width  / 2;
      const cy = rect.top  + rect.height / 2;
      const ox = anchor.clientX - cx;
      const oy = anchor.clientY - cy;
      const px = (ox - panX) / zoom;
      const py = (oy - panY) / zoom;
      panX = ox - px * next;
      panY = oy - py * next;
    }
    zoom = next;
    if (zoom <= ZOOM_MIN + 0.001) { panX = 0; panY = 0; }
    clampPan();
    syncZoomBtnState();
    applyTransform(animated);
  }

  if (zoomInBtn)  zoomInBtn .addEventListener('click', () => setZoom(zoom * 1.5));
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => setZoom(zoom / 1.5));

  stage.addEventListener('wheel', (e) => {
    if (document.querySelector('.popup-overlay.open, .fullscreen-menu.open')) return;
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * WHEEL_SPEED);
    setZoom(zoom * factor, { clientX: e.clientX, clientY: e.clientY }, false);
  }, { passive: false });

  // ---- Drag-to-pan --------------------------------------------
  let dragging  = false;
  let dragStart = { x: 0, y: 0, panX: 0, panY: 0 };

  function isInteractive(el) {
    // Anything in this list short-circuits the pan starter — pointerdown on
    // these elements is treated as a tap, not the start of a drag. Without
    // this, any 4px+ wiggle during a tap sets didDrag=true and the click
    // handler bails, so islands without a dedicated .tap-region (Ravagers,
    // Expedition, PVE) would lose their tap.
    return !!el.closest(
      '.tap-region, .hud-btn, .heroes, .ifx-prop, .ifx-badge, .banner-item, ' +
      '.wm-island, .ifx-island-name, ' +
      '.player-profile, .resources, .zoom-controls, ' +
      '.popup-overlay, .fullscreen-menu, .debug-panel, .debug-toggle, .map-states-toggle'
    );
  }

  mapContent.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (isInteractive(e.target)) return;
    dragging = true;
    didDrag  = false;
    dragStart = { x: e.clientX, y: e.clientY, panX, panY };
    mapContent.classList.add('is-panning');
    try { mapContent.setPointerCapture(e.pointerId); } catch (_) {}
  });

  mapContent.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (!didDrag && Math.hypot(dx, dy) > 4) didDrag = true;
    if (zoom <= ZOOM_MIN + 0.001) return;
    panX = dragStart.panX + dx;
    panY = dragStart.panY + dy;
    clampPan();
    applyTransform(false);
  });

  function endPan(e) {
    if (!dragging) return;
    dragging = false;
    mapContent.classList.remove('is-panning');
    if (e && e.pointerId !== undefined) {
      try { mapContent.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    setTimeout(() => { didDrag = false; }, 0);
  }
  mapContent.addEventListener('pointerup',     endPan);
  mapContent.addEventListener('pointercancel', endPan);
  mapContent.addEventListener('pointerleave',  endPan);

  mapContent.addEventListener('click', (e) => {
    if (didDrag) { e.stopPropagation(); e.preventDefault(); }
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea')) return;
    if (e.key === '+' || e.key === '=') setZoom(zoom * 1.5);
    if (e.key === '-' || e.key === '_') setZoom(zoom / 1.5);
  });

  window.addEventListener('resize', () => { clampPan(); applyTransform(false); });

  // ---- Public API ---------------------------------------------
  window.WorldMapV2 = {
    setBackgroundColor(color) {
      document.documentElement.style.setProperty('--wm-bg-color', color);
      document.body.style.background = color;
    },
    // Legacy single-color tint API — applies the same color to every
    // category. Kept for backwards compat; new code should prefer
    // setCategoryTintColor + setTintStrength.
    setTint(color, strength) {
      ISLAND_CATEGORIES.forEach(c => this.setCategoryTintColor(c.id, color));
      this.setTintStrength(strength);
    },
    setTintStrength(strength) {
      // strength is expected in 0..1 range; clamp defensively.
      const s = Math.max(0, Math.min(1, +strength));
      document.documentElement.style.setProperty('--tint-strength', String(s));
    },
    setCategoryTintColor(catId, color) {
      // Sets the per-category tint var, e.g. --tint-empire. The CSS rule
      // .wm-island.is-active.cat-empire .wm-tint reads it, so a single
      // setProperty() recolors every island in that category at once.
      document.documentElement.style.setProperty('--tint-' + catId, color);
    },
    // Legacy single-color stroke API — applies the same color to all
    // categories. Kept for backwards compat with older debug code.
    setStroke(color, widthPx) {
      ISLAND_CATEGORIES.forEach(c => this.setCategoryStrokeColor(c.id, color));
      this.setStrokeWidth(widthPx);
    },
    setStrokeWidth(widthPx) {
      const w = +widthPx;
      ISLAND_CATEGORIES.forEach(cat => {
        const f = document.querySelector('#wmStroke-' + cat.id);
        if (f) f.querySelector('feMorphology').setAttribute('radius', String(w));
        const value = w > 0 ? `url(#wmStroke-${cat.id})` : 'none';
        document.documentElement.style.setProperty('--stroke-' + cat.id, value);
      });
    },
    setCategoryStrokeColor(catId, color) {
      const f = document.querySelector('#wmStroke-' + catId);
      if (f) f.querySelector('feFlood').setAttribute('flood-color', color);
    },
    listCategories() { return ISLAND_CATEGORIES.map(c => ({ id: c.id, label: c.label, defaultColor: c.defaultColor, keys: c.keys.slice() })); },
    categoryFor(key) { return CATEGORY_FOR_KEY[key] || null; },
    setIslandActive(key, isActive) {
      const ref = islandRefs.get(key);
      if (ref) ref.wrapper.classList.toggle('is-active', !!isActive);
      saveActiveSet();   // persist so the choice survives reload
    },
    setAllActive(on) {
      islandRefs.forEach(ref => ref.wrapper.classList.toggle('is-active', on));
      saveActiveSet();
    },
    listIslands() { return ISLANDS.map(i => ({ key: i.key, label: i.label })); },
    isActive(key) {
      const ref = islandRefs.get(key);
      return ref ? ref.wrapper.classList.contains('is-active') : false;
    },
    setBackgroundVariant(variant) {
      if (!bgImgEl) return;
      const file = variant === 'active' ? BG_FILES.active : BG_FILES.disabled;
      // Allow per-page configs to set an empty bg (no full-canvas image),
      // useful for the reef map where the islands ARE the visual content.
      if (!file) { bgImgEl.removeAttribute('src'); bgImgEl.style.display = 'none'; return; }
      bgImgEl.style.display = '';
      bgImgEl.src = BG_DIR + file;
    },
    getZoomConfig() {
      return { min: ZOOM_MIN, max: zoomMax, current: zoom, propThreshold: zoomPropThreshold };
    },
    setMaxZoom(maxLevel) {
      zoomMax = Math.max(ZOOM_MIN + 0.1, Math.min(20, +maxLevel));
      if (zoom > zoomMax) setZoom(zoomMax);
      else syncZoomBtnState();
    },
    setPropThreshold(level) {
      zoomPropThreshold = Math.max(ZOOM_MIN, Math.min(zoomMax, +level));
      syncZoomBtnState();
    },

    // Pan-only camera move that lands a named island at the center of
    // the visible stage WITHOUT changing zoom. Used by the island-tap
    // handler so a player who's already zoomed in gets a smooth recenter
    // before the popup opens (instead of the popup spawning off to the
    // side of where they tapped). Returns { changed } so callers can
    // skip the popup-open delay when no pan was actually needed.
    centerOnIsland(key, animated = true) {
      const def = ISLANDS.find(i => i.key === key);
      if (!def) return { changed: false };
      const cxPct = def.x + def.w / 2;
      const cyPct = def.y + def.h / 2;
      const cw = mapContent.offsetWidth;
      const ch = mapContent.offsetHeight;
      const prevX = panX, prevY = panY;
      panX = (0.5 - cxPct / 100) * cw * zoom;
      panY = (0.5 - cyPct / 100) * ch * zoom;
      clampPan();   // may shrink the requested pan if we'd push past the edges
      syncZoomBtnState();
      applyTransform(animated);
      // Tolerance of 1px so a no-op pan reports {changed:false} and the
      // caller can skip the post-pan delay.
      const moved = Math.hypot(panX - prevX, panY - prevY) > 1;
      return { changed: moved };
    },

    // Center the map on a named island at a zoom comfortably above the
    // prop reveal threshold (so the tower/banner/label all render). The
    // user lands on the regular world map UI — same Map States panel,
    // drag mode, popups — just framed on the target island. Used by the
    // Ravagers' Reef popup ENTER button to "enter" the reef without
    // navigating to a separate page.
    focusOnIsland(key, opts = {}) {
      const def = ISLANDS.find(i => i.key === key);
      if (!def) {
        console.warn('[wm-v3] focusOnIsland: unknown island key', key);
        return false;
      }
      // Center of the island, expressed as % of the mapContent.
      const cxPct = def.x + def.w / 2;
      const cyPct = def.y + def.h / 2;
      // Default zoom = above prop threshold so the island's props/banners
      // reveal. Capped at zoomMax so we never blow past the configured ceiling.
      const target = opts.zoom != null
        ? Math.max(ZOOM_MIN, Math.min(zoomMax, +opts.zoom))
        : Math.min(zoomMax, Math.max(zoomPropThreshold + 0.3, ZOOM_PRESET));
      const cw = mapContent.offsetWidth;
      const ch = mapContent.offsetHeight;
      // Pan math: scale is around mapContent's center, so to center a
      // point at (cxPct%, cyPct%) on the stage we translate by the
      // signed offset between that point and content-center, scaled.
      zoom = target;
      panX = (0.5 - cxPct / 100) * cw * target;
      panY = (0.5 - cyPct / 100) * ch * target;
      clampPan();
      syncZoomBtnState();
      applyTransform(opts.animated !== false);
      return true;
    },

    // ---- Per-island management API --------------------------
    getPropTypes()     { return PROP_TYPES.map(p => ({ id: p.id, label: p.label })); },
    getBannerTypes()   { return BANNER_TYPES.map(b => ({ id: b.id, label: b.label })); },
    getResourceIcons() { return RESOURCE_ICONS.map(r => ({ id: r.id, label: r.label })); },
    getBadgeTypes()    { return BADGE_TYPES.map(b => ({ id: b.id, label: b.label })); },
    getIslandConfig(key) {
      const cfg = perIslandConfig.get(key);
      return cfg ? JSON.parse(JSON.stringify(cfg)) : null;
    },
    setIslandConfig(key, partial) {
      const cur = perIslandConfig.get(key);
      if (!cur) return;
      perIslandConfig.set(key, deepMerge(cur, partial));
      renderIsland(key);
      saveIslandConfigs();
    },

    // ---- Global element-size scales (applied to every island at once) ----
    getGlobalScales() { return { ...globalSettings }; },
    setGlobalScale(name, valuePct) {
      if (!(name in GLOBAL_DEFAULTS)) return;
      globalSettings[name] = Math.max(5, Math.min(500, +valuePct));
      applyGlobalScales();
      saveGlobalSettings();
    },
    resetGlobalScales() {
      Object.assign(globalSettings, GLOBAL_DEFAULTS);
      applyGlobalScales();
      saveGlobalSettings();
    },
    // Wipes saved positions/scales/etc. and restores every island to its
    // seed default. Triggered by the panel's "Reset to Defaults" button.
    // Also resets global element-size multipliers.
    clearStoredConfigs() {
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      try { localStorage.removeItem(GLOBAL_KEY);  } catch (_) {}
      Object.assign(globalSettings, GLOBAL_DEFAULTS);
      applyGlobalScales();
      ISLANDS.forEach(def => {
        let cfg = deepMerge(blankConfig(), SEED_CONFIGS[def.key] || {});
        if (cfg.islandName.show && !cfg.islandName.text) {
          cfg.islandName.text = def.label.toUpperCase();
        }
        perIslandConfig.set(def.key, cfg);
        renderIsland(def.key);
      });
      document.dispatchEvent(new CustomEvent('worldmap:configs-reset'));
    },
  };

  // ============================================================
  // DRAG MODE — drag fx elements directly on the map to position
  // ============================================================
  // Maps a class on the dragged element to the perIslandConfig key whose
  // x/y we should update.
  const DRAG_CONFIG_PATH = {
    'ifx-prop':        'prop',
    'ifx-banner':      'banner',
    'ifx-prop-name':   'propName',
    'ifx-island-name': 'islandName',
    'ifx-resource':    'resourceReq',
    'ifx-badge':       'badge',
  };
  const DRAG_SELECTOR = Object.keys(DRAG_CONFIG_PATH).map(c => '.' + c).join(', ');

  let editMode = false;
  let drag    = null;

  function configPathFor(el) {
    for (const cls in DRAG_CONFIG_PATH) {
      if (el.classList.contains(cls)) return DRAG_CONFIG_PATH[cls];
    }
    return null;
  }

  // Capture phase so we beat the per-fx click handlers (which would otherwise
  // open the popup). preventDefault()/stopPropagation() inside.
  document.addEventListener('pointerdown', (e) => {
    if (!editMode) return;
    const el = e.target.closest(DRAG_SELECTOR);
    if (!el) return;
    const islandWrap = el.closest('.wm-island');
    if (!islandWrap) return;
    const key = islandWrap.dataset.key;
    const path = configPathFor(el);
    if (!key || !path) return;
    const cfg = perIslandConfig.get(key);
    if (!cfg || !cfg[path]) return;

    e.stopPropagation();
    e.preventDefault();

    const r = islandWrap.getBoundingClientRect();
    drag = {
      el, key, path,
      // Cache the wrapper rect — avoids reflow per pointermove. Acceptable
      // because a single drag is brief and the wrapper doesn't move during it.
      rect: r,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startCfgX:    cfg[path].x,
      startCfgY:    cfg[path].y,
      curX:         cfg[path].x,
      curY:         cfg[path].y,
    };
    el.classList.add('ifx-dragging');
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
  }, true);

  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.startClientX;
    const dy = e.clientY - drag.startClientY;
    // Convert pixel delta → % of island wrapper's CURRENT rendered size.
    // (Already accounts for the map zoom transform.)
    drag.curX = drag.startCfgX + (dx / drag.rect.width  * 100);
    drag.curY = drag.startCfgY + (dy / drag.rect.height * 100);
    drag.el.style.left = drag.curX + '%';
    drag.el.style.top  = drag.curY + '%';
    document.dispatchEvent(new CustomEvent('worldmap:island-edited', {
      detail: { key: drag.key, path: drag.path, x: drag.curX, y: drag.curY },
    }));
  });

  function endDrag(e) {
    if (!drag) return;
    drag.el.classList.remove('ifx-dragging');
    try { drag.el.releasePointerCapture(e.pointerId); } catch (_) {}
    // Commit the new position to perIslandConfig (this also re-renders the
    // island so we don't drift from the source of truth).
    const partial = {};
    partial[drag.path] = { x: drag.curX, y: drag.curY };
    const cur = perIslandConfig.get(drag.key);
    perIslandConfig.set(drag.key, deepMerge(cur, partial));
    renderIsland(drag.key);
    saveIslandConfigs();
    document.dispatchEvent(new CustomEvent('worldmap:island-edit-end', {
      detail: { key: drag.key, path: drag.path, x: drag.curX, y: drag.curY },
    }));
    drag = null;
  }
  document.addEventListener('pointerup',     endDrag);
  document.addEventListener('pointercancel', endDrag);

  // Expose Drag-Mode toggle alongside existing API.
  window.WorldMapV2.setEditMode = function (on) {
    editMode = !!on;
    document.body.classList.toggle('wm-edit-mode', editMode);
  };
  window.WorldMapV2.isEditMode = function () { return editMode; };

  syncZoomBtnState();
  applyTransform(false);

  // ---- URL param: ?focus=<island-key> -------------------------
  // Lets the Ravagers' Reef popup ENTER (and any other deep link)
  // open the world map already framed on the target island instead
  // of routing the player to a separate page. We defer one frame so
  // the initial untransformed paint lands first, then animate into
  // the focused view — visually "zooms in" from the world map.
  try {
    const focusKey = new URLSearchParams(window.location.search).get('focus');
    if (focusKey) {
      requestAnimationFrame(() => {
        window.WorldMapV2.focusOnIsland(focusKey);
      });
    }
  } catch (_) { /* non-fatal: bad URL or older browser */ }

  document.dispatchEvent(new CustomEvent('worldmap:ready'));
})();
