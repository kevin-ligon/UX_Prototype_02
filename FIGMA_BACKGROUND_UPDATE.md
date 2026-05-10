# Figma Background Frame Integration

## ✅ Update Complete

The authentic **Figma popup background frame** has been successfully integrated into all popup components.

---

## 🎨 What Changed

### Before:
- Simple CSS gradient background
- Basic border styling

### After:
- **Authentic Figma 9-slice border frame**
- Purple gradient frame tiles from Figma design
- Pixel-perfect match to the original design

---

## 📦 New Assets Added

**Location:** `/images/backgrounds/`

**Border Frame Tiles (9-slice system):**
1. `popup-frame-top-left.png` - Top-left corner (170×249px)
2. `popup-frame-top.png` - Top edge (repeating)
3. `popup-frame-top-right.png` - Top-right corner (170×249px)
4. `popup-frame-left.png` - Left edge (repeating)
5. `popup-frame-center.png` - Center fill
6. `popup-frame-right.png` - Right edge (repeating)
7. `popup-frame-bottom-left.png` - Bottom-left corner (170×72px)
8. `popup-frame-bottom.png` - Bottom edge (repeating)
9. `popup-frame-bottom-right.png` - Bottom-right corner (170×72px)

**Additional:**
- `popup-shadow-tile.png` - Corner shadow decoration
- `popup-background-reference.png` - Visual reference screenshot

---

## 🔧 Technical Implementation

### CSS Approach: 9-Slice Border Frame

The popup background now uses a **9-slice scaling system** via CSS `::before` pseudo-element:

```css
.popup-background::before {
    /* 8 border tiles positioned as multiple backgrounds */
    background-image:
        url('popup-frame-top-left.png'),
        url('popup-frame-top.png'),
        url('popup-frame-top-right.png'),
        /* ... 5 more tiles */;

    background-position: /* corners + edges */;
    background-repeat: /* no-repeat for corners, repeat for edges */;
    background-size: /* exact dimensions */;
}
```

**Benefits:**
- ✅ Responsive - Scales to any popup size
- ✅ Pixel-perfect - Matches Figma exactly
- ✅ No JavaScript required
- ✅ Works on all browsers

---

## 🌐 Files Updated

### CSS:
- `app/popup-styles.css` - Main stylesheet with 9-slice frame

### All Popups Automatically Updated:
- ✅ `app/popup-pvp-expedition.html`
- ✅ `app/popup-empire.html`
- ✅ `app/popup-pve.html`
- ✅ `index.html` (preview page)

---

## 🎯 Result

All popups now feature the **authentic purple gradient border frame** from your Figma design, providing a consistent, polished look that matches your design system perfectly.

**No code changes required** - just refresh your browser to see the updated backgrounds!

---

**Source:** Figma Component `2891:36704` - "Popup Background - Dark"  
**Integrated:** May 8, 2026
