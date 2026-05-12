/* ============================================================
   UI INSPECTOR — designer-facing debug overlay
   Toggles a top toolbar with independent layers:
     1. GRID         pixel grid + centerlines (8 / 16 / 24 px)
     2. BOXES        dashed outline on every interactive element
     3. SPACING      hover any element to see margin / padding / box
     4. TAP          red ring on anything < 44 px (mobile floor)
     5. CURSOR       live xy chip following the mouse
     6. INSPECT      click any element → side panel with details
                     + 1-click "Copy selector" / "Copy CSS"

   Keyboard shortcuts:
     U           toggle inspector
     G           cycle grid (off → 8 → 16 → 24 → off)
     B           toggle box outlines
     S           toggle spacing inspector
     T           toggle tap-target check
     C           toggle cursor coords
     I           toggle click-inspect
     Esc         close detail panel / exit inspect mode

   Public API (window.Inspector)
     Inspector.toggle()                     // open/close inspector
     Inspector.setGrid(size | null)         // null | 8 | 16 | 24
     Inspector.toggleBoxes()
     Inspector.toggleSpacing()
     Inspector.toggleTapTargets()
     Inspector.toggleCursor()
     Inspector.toggleInspect()
     Inspector.selectElement(el)            // programmatically select
   ============================================================ */
(function () {
    'use strict';

    // ----- Build DOM ------------------------------------------------
    const launcher = document.createElement('button');
    launcher.className = 'uii-launcher';
    launcher.title = 'UI Inspector (press U)';
    launcher.textContent = 'UI';

    const bar = document.createElement('div');
    bar.className = 'uii-bar';
    bar.innerHTML = `
        <div class="uii-section">
            <span class="uii-section-label">Grid</span>
            <button class="uii-toggle" data-uii="grid">Off</button>
            <select class="uii-select" data-uii-grid-size>
                <option value="8">8 px</option>
                <option value="16">16 px</option>
                <option value="24">24 px</option>
            </select>
            <button class="uii-toggle" data-uii="centerlines">Center</button>
        </div>
        <div class="uii-section">
            <span class="uii-section-label">Layers</span>
            <button class="uii-toggle" data-uii="boxes" title="Outline interactive elements (B)">Boxes</button>
            <button class="uii-toggle" data-uii="spacing" title="Hover any element to see padding/margin (S)">Spacing</button>
            <button class="uii-toggle" data-uii="tap" title="Red ring on anything < 44 px (T)">Tap 44</button>
        </div>
        <div class="uii-section">
            <span class="uii-section-label">Tools</span>
            <button class="uii-toggle" data-uii="cursor" title="Live cursor xy (C)">Cursor</button>
            <button class="uii-toggle" data-uii="inspect" title="Click an element to inspect (I)">Inspect</button>
        </div>
        <button class="uii-close" title="Close (U or Esc)">×</button>
    `;

    const help = document.createElement('div');
    help.className = 'uii-help';
    help.innerHTML = `
        <strong>Shortcuts</strong> &nbsp;
        <kbd>U</kbd> toggle &middot;
        <kbd>G</kbd> grid &middot;
        <kbd>B</kbd> boxes &middot;
        <kbd>S</kbd> spacing &middot;
        <kbd>T</kbd> tap &middot;
        <kbd>C</kbd> cursor &middot;
        <kbd>I</kbd> inspect &middot;
        <kbd>Esc</kbd> close
    `;

    document.body.appendChild(launcher);
    document.body.appendChild(bar);
    document.body.appendChild(help);

    // Persistent overlay layers (created once, mounted on demand)
    const gridEl   = document.createElement('div');     gridEl.className   = 'uii-grid';
    const centerEl = document.createElement('div');     centerEl.className = 'uii-centerlines';
    const spaceL   = document.createElement('div');     spaceL.className   = 'uii-spacing-layer';
    const dimChip  = document.createElement('div');     dimChip.className  = 'uii-dim-chip';
    const cursor   = document.createElement('div');     cursor.className   = 'uii-cursor';
    const selOut   = document.createElement('div');     selOut.className   = 'uii-selected-outline';
    const detail   = document.createElement('div');     detail.className   = 'uii-detail';

    // ----- State -----------------------------------------------------
    const state = {
        open: false,
        grid: null,           // null | 8 | 16 | 24
        centerlines: false,
        boxes: false,
        spacing: false,
        tap: false,
        cursor: false,
        inspect: false,
        selected: null,
    };

    // ----- Helpers ---------------------------------------------------
    function $(sel) { return bar.querySelector(sel); }
    function setBtn(name, on) {
        const btn = bar.querySelector(`[data-uii="${name}"]`);
        if (btn) btn.classList.toggle('is-on', !!on);
    }
    function rgbToHex(rgb) {
        if (!rgb || rgb === 'transparent' || rgb.startsWith('rgba(0, 0, 0, 0)')) return 'transparent';
        const m = rgb.match(/\d+/g);
        if (!m || m.length < 3) return rgb;
        const hex = (n) => parseInt(n, 10).toString(16).padStart(2, '0');
        const out = '#' + hex(m[0]) + hex(m[1]) + hex(m[2]);
        if (m.length === 4 && parseFloat(m[3]) < 1) {
            return out + ' (α ' + parseFloat(m[3]).toFixed(2) + ')';
        }
        return out;
    }
    function shortClassList(el) {
        return Array.from(el.classList).filter(c => !c.startsWith('uii-'));
    }
    function isInspectorEl(el) {
        if (!el) return false;
        return !!el.closest('.uii-bar, .uii-launcher, .uii-detail, .uii-grid, .uii-centerlines, .uii-spacing-layer, .uii-cursor, .uii-dim-chip, .uii-selected-outline, .uii-help');
    }

    // ----- Selector path generator (short, readable) ---------------
    // Returns the shortest path that uniquely identifies the element.
    // Prefers id > class chain > tag + nth-child fallback.
    function generateSelector(el) {
        if (!el || el === document.body) return 'body';
        if (el.id) return '#' + el.id;
        const parts = [];
        let cur = el;
        let depth = 0;
        while (cur && cur !== document.body && depth < 6) {
            let part = cur.tagName.toLowerCase();
            const classes = shortClassList(cur).filter(c =>
                !/^(open|is-|js-)/.test(c) && c.length < 35);
            if (classes.length) {
                part = '.' + classes.slice(0, 2).join('.');
            } else {
                const sibs = Array.from(cur.parentElement?.children || []).filter(s => s.tagName === cur.tagName);
                if (sibs.length > 1) {
                    const idx = sibs.indexOf(cur) + 1;
                    part += `:nth-of-type(${idx})`;
                }
            }
            parts.unshift(part);
            // Stop early if we hit something with an id (uniqueness anchor)
            if (cur.parentElement && cur.parentElement.id) {
                parts.unshift('#' + cur.parentElement.id);
                break;
            }
            cur = cur.parentElement;
            depth++;
        }
        return parts.join(' > ');
    }

    // ----- Detail panel render -------------------------------------
    function renderDetail(el) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const sel = generateSelector(el);
        const padding = `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`;
        const margin  = `${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft}`;
        const bgHex   = rgbToHex(cs.backgroundColor);
        const colorHex = rgbToHex(cs.color);
        const fontFamily = (cs.fontFamily || '').replace(/['"]/g, '').split(',')[0];
        const cssBlock = [
            `width:  ${Math.round(r.width)}px;`,
            `height: ${Math.round(r.height)}px;`,
            `padding: ${padding};`,
            `font: ${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} '${fontFamily}';`,
            `color: ${colorHex};`,
            `background: ${bgHex};`,
            `border-radius: ${cs.borderTopLeftRadius};`,
        ].join('\n');

        detail.innerHTML = `
            <h3>Selected Element</h3>
            <div class="uii-detail-section">
                <div class="uii-detail-label">Selector</div>
                <div class="uii-detail-value">${sel}</div>
            </div>
            <div class="uii-detail-section">
                <div class="uii-detail-row"><span>Size</span><span>${Math.round(r.width)} × ${Math.round(r.height)} px</span></div>
                <div class="uii-detail-row"><span>Pos</span><span>(${Math.round(r.left)}, ${Math.round(r.top)})</span></div>
                <div class="uii-detail-row"><span>Padding</span><span>${padding}</span></div>
                <div class="uii-detail-row"><span>Margin</span><span>${margin}</span></div>
                <div class="uii-detail-row"><span>Radius</span><span>${cs.borderTopLeftRadius}</span></div>
            </div>
            <div class="uii-detail-section">
                <div class="uii-detail-label">Typography</div>
                <div class="uii-detail-row"><span>Family</span><span>${fontFamily}</span></div>
                <div class="uii-detail-row"><span>Size</span><span>${cs.fontSize}</span></div>
                <div class="uii-detail-row"><span>Weight</span><span>${cs.fontWeight} ${cs.fontStyle === 'italic' ? '· italic' : ''}</span></div>
                <div class="uii-detail-row"><span>Line ht</span><span>${cs.lineHeight}</span></div>
                <div class="uii-detail-row"><span>Tracking</span><span>${cs.letterSpacing}</span></div>
            </div>
            <div class="uii-detail-section">
                <div class="uii-detail-label">Color</div>
                <div class="uii-detail-row"><span>Text</span><span><span class="uii-detail-swatch" style="background:${cs.color}"></span>${colorHex}</span></div>
                <div class="uii-detail-row"><span>Bg</span><span><span class="uii-detail-swatch" style="background:${cs.backgroundColor}"></span>${bgHex}</span></div>
            </div>
            <div class="uii-detail-section">
                <button class="uii-copy-btn" data-uii-copy="selector">Copy selector</button>
                <button class="uii-copy-btn" data-uii-copy="css">Copy CSS</button>
            </div>
        `;
        detail.dataset.selector = sel;
        detail.dataset.css = cssBlock;
        detail.classList.add('is-open');

        // Position the outline to track the element
        const outR = el.getBoundingClientRect();
        selOut.style.left   = outR.left + 'px';
        selOut.style.top    = outR.top + 'px';
        selOut.style.width  = outR.width + 'px';
        selOut.style.height = outR.height + 'px';
        if (!selOut.parentNode) document.body.appendChild(selOut);

        // Wire copy buttons
        detail.querySelectorAll('[data-uii-copy]').forEach(btn => {
            btn.addEventListener('click', () => {
                const kind = btn.dataset.uiiCopy;
                const text = kind === 'selector' ? detail.dataset.selector : detail.dataset.css;
                navigator.clipboard?.writeText(text).then(() => {
                    btn.classList.add('is-copied');
                    btn.textContent = 'Copied!';
                    setTimeout(() => {
                        btn.classList.remove('is-copied');
                        btn.textContent = kind === 'selector' ? 'Copy selector' : 'Copy CSS';
                    }, 1200);
                });
            });
        });
    }

    function clearSelection() {
        state.selected = null;
        detail.classList.remove('is-open');
        selOut.remove();
    }

    function selectElement(el) {
        if (!el || isInspectorEl(el)) return;
        state.selected = el;
        renderDetail(el);
        if (!detail.parentNode) document.body.appendChild(detail);
    }

    // ----- Layer toggles -------------------------------------------
    function setOpen(open) {
        state.open = open;
        bar.classList.toggle('is-open', open);
        launcher.classList.toggle('is-active', open);
        if (!open) {
            // Tear everything down
            setGrid(null);
            setCenterlines(false);
            setBoxes(false);
            setSpacing(false);
            setTap(false);
            setCursor(false);
            setInspect(false);
            clearSelection();
            help.classList.remove('is-visible');
        } else {
            help.classList.add('is-visible');
            setTimeout(() => help.classList.remove('is-visible'), 4000);
        }
    }

    function setGrid(size) {
        state.grid = size;
        const btn = bar.querySelector('[data-uii="grid"]');
        if (size) {
            gridEl.className = 'uii-grid size-' + size;
            if (!gridEl.parentNode) document.body.appendChild(gridEl);
            if (btn) { btn.classList.add('is-on'); btn.textContent = size + ' px'; }
        } else {
            gridEl.remove();
            if (btn) { btn.classList.remove('is-on'); btn.textContent = 'Off'; }
        }
    }
    function cycleGrid() {
        const order = [null, 8, 16, 24];
        const idx = order.indexOf(state.grid);
        setGrid(order[(idx + 1) % order.length]);
        if (state.grid) {
            const sel = bar.querySelector('[data-uii-grid-size]');
            if (sel) sel.value = String(state.grid);
        }
    }
    function setCenterlines(on) {
        state.centerlines = on;
        setBtn('centerlines', on);
        if (on) { if (!centerEl.parentNode) document.body.appendChild(centerEl); }
        else    { centerEl.remove(); }
    }

    function setBoxes(on) {
        state.boxes = on;
        document.body.classList.toggle('uii-boxes-on', on);
        setBtn('boxes', on);
    }

    function setSpacing(on) {
        state.spacing = on;
        setBtn('spacing', on);
        if (on) {
            if (!spaceL.parentNode) document.body.appendChild(spaceL);
            document.addEventListener('mousemove', onSpacingHover);
        } else {
            spaceL.remove();
            dimChip.remove();
            document.removeEventListener('mousemove', onSpacingHover);
        }
    }
    function onSpacingHover(e) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || isInspectorEl(el)) {
            spaceL.innerHTML = '';
            dimChip.remove();
            return;
        }
        drawSpacingFor(el, e);
    }
    function drawSpacingFor(el, mouseEv) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const pT = parseFloat(cs.paddingTop), pR = parseFloat(cs.paddingRight),
              pB = parseFloat(cs.paddingBottom), pL = parseFloat(cs.paddingLeft);
        const mT = parseFloat(cs.marginTop), mR = parseFloat(cs.marginRight),
              mB = parseFloat(cs.marginBottom), mL = parseFloat(cs.marginLeft);
        spaceL.innerHTML = `
            <div class="uii-spacing-rect uii-spacing-margin"
                 style="left:${r.left - mL}px; top:${r.top - mT}px;
                        width:${r.width + mL + mR}px; height:${r.height + mT + mB}px;"></div>
            <div class="uii-spacing-rect uii-spacing-content"
                 style="left:${r.left}px; top:${r.top}px;
                        width:${r.width}px; height:${r.height}px;"></div>
            <div class="uii-spacing-rect uii-spacing-padding"
                 style="left:${r.left + pL}px; top:${r.top + pT}px;
                        width:${Math.max(0, r.width - pL - pR)}px;
                        height:${Math.max(0, r.height - pT - pB)}px; mix-blend-mode: screen;"></div>
        `;
        dimChip.textContent = `${Math.round(r.width)} × ${Math.round(r.height)}  ·  pad ${pT} ${pR} ${pB} ${pL}`;
        if (!dimChip.parentNode) document.body.appendChild(dimChip);
        // Place chip near cursor but kept inside viewport
        const cx = (mouseEv ? mouseEv.clientX : r.left) + 14;
        const cy = (mouseEv ? mouseEv.clientY : r.top)  - 24;
        dimChip.style.left = Math.min(window.innerWidth - 200, cx) + 'px';
        dimChip.style.top  = Math.max(8, cy) + 'px';
    }

    function setTap(on) {
        state.tap = on;
        document.body.classList.toggle('uii-tap-on', on);
        setBtn('tap', on);
        if (on) checkTapTargets(); else clearTapMarks();
    }
    function clearTapMarks() {
        document.querySelectorAll('.uii-too-small').forEach(el => el.classList.remove('uii-too-small'));
    }
    function checkTapTargets() {
        const candidates = document.querySelectorAll(
            'button, a, [onclick], .hud-btn, .heroes, .tap-feedback, .tap-region, [role="button"]'
        );
        clearTapMarks();
        candidates.forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return;          // not visible
            if (el.closest('.uii-bar, .uii-launcher, .uii-detail')) return;
            if (r.width < 44 || r.height < 44) el.classList.add('uii-too-small');
        });
    }

    function setCursor(on) {
        state.cursor = on;
        setBtn('cursor', on);
        if (on) {
            if (!cursor.parentNode) document.body.appendChild(cursor);
            document.addEventListener('mousemove', onCursorMove);
        } else {
            cursor.remove();
            document.removeEventListener('mousemove', onCursorMove);
        }
    }
    function onCursorMove(e) {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top  = e.clientY + 'px';
        const xPct = ((e.clientX / window.innerWidth) * 100).toFixed(1);
        const yPct = ((e.clientY / window.innerHeight) * 100).toFixed(1);
        cursor.textContent = `${e.clientX} × ${e.clientY}  ·  ${xPct}% × ${yPct}%`;
    }

    function setInspect(on) {
        state.inspect = on;
        setBtn('inspect', on);
        if (on) {
            document.addEventListener('click', onInspectClick, true);
            document.body.style.cursor = 'crosshair';
        } else {
            document.removeEventListener('click', onInspectClick, true);
            document.body.style.cursor = '';
        }
    }
    function onInspectClick(e) {
        if (isInspectorEl(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        selectElement(e.target);
    }

    // ----- Toolbar wiring ------------------------------------------
    bar.addEventListener('click', (e) => {
        const t = e.target.closest('[data-uii]');
        const close = e.target.closest('.uii-close');
        if (close) { setOpen(false); return; }
        if (!t) return;
        const name = t.dataset.uii;
        if (name === 'grid')        cycleGrid();
        if (name === 'centerlines') setCenterlines(!state.centerlines);
        if (name === 'boxes')       setBoxes(!state.boxes);
        if (name === 'spacing')     setSpacing(!state.spacing);
        if (name === 'tap')         setTap(!state.tap);
        if (name === 'cursor')      setCursor(!state.cursor);
        if (name === 'inspect')     setInspect(!state.inspect);
    });
    bar.querySelector('[data-uii-grid-size]').addEventListener('change', (e) => {
        if (state.grid) setGrid(parseInt(e.target.value, 10));
    });
    launcher.addEventListener('click', () => setOpen(!state.open));

    // ----- Keyboard shortcuts -------------------------------------
    document.addEventListener('keydown', (e) => {
        if (e.target.matches('input, select, textarea')) return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        const k = e.key.toLowerCase();
        if (k === 'u')        { setOpen(!state.open); }
        if (!state.open && k !== 'u') return;
        if (k === 'g')        cycleGrid();
        if (k === 'b')        setBoxes(!state.boxes);
        if (k === 's')        setSpacing(!state.spacing);
        if (k === 't')        setTap(!state.tap);
        if (k === 'c')        setCursor(!state.cursor);
        if (k === 'i')        setInspect(!state.inspect);
        if (e.key === 'Escape') {
            if (state.selected || detail.classList.contains('is-open')) {
                clearSelection();
            } else if (state.inspect) {
                setInspect(false);
            } else {
                setOpen(false);
            }
        }
    });

    // Re-run tap-target check + reposition selection on layout shifts
    window.addEventListener('resize', () => {
        if (state.tap) checkTapTargets();
        if (state.selected) {
            const r = state.selected.getBoundingClientRect();
            selOut.style.left   = r.left + 'px';
            selOut.style.top    = r.top + 'px';
            selOut.style.width  = r.width + 'px';
            selOut.style.height = r.height + 'px';
        }
    });
    // Re-check tap targets when a menu opens/closes (DOM may have grown)
    const mo = new MutationObserver(() => {
        if (state.tap) checkTapTargets();
    });
    mo.observe(document.body, { childList: true, subtree: false, attributes: true, attributeFilter: ['class'] });

    // ----- Public API ----------------------------------------------
    window.Inspector = {
        toggle:           () => setOpen(!state.open),
        setGrid,
        toggleBoxes:      () => setBoxes(!state.boxes),
        toggleSpacing:    () => setSpacing(!state.spacing),
        toggleTapTargets: () => setTap(!state.tap),
        toggleCursor:     () => setCursor(!state.cursor),
        toggleInspect:    () => setInspect(!state.inspect),
        selectElement,
        _state:           () => ({ ...state, selected: state.selected ? generateSelector(state.selected) : null }),
    };
})();
