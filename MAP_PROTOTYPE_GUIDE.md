# Interactive Map Prototype - User Guide

## Overview

An interactive prototype for testing game mode navigation and popup interactions in the Empire game. This prototype recreates the map interaction flows from your Figma design.

---

## 🎮 Features

### Map Views

1. **World Map (Default)** - Overview of all game modes
   - Empire (Capital City)
   - Expedition
   - Ravagers Reef
   - PVE
   - Mines

2. **Detailed Views** - Zoom into specific game modes
   - Home Empire - Full territory map
   - Expedition - Island exploration
   - Ravagers Reef - PVP island
   - PVE - Live Ops battles
   - Mines - Resource locations

3. **Popup Overlays** - Game mode information
   - Empire popup (Capital City management)
   - Expedition popup (PVP leaderboard)
   - Ravagers Reef popup (PVP battles)
   - PVE popup (Mission progress)

---

## 🖱️ How to Use

### Opening the Prototype

1. **Option 1 - Direct Access:**
   ```
   Open: app/map-prototype.html
   ```

2. **Option 2 - From Main Index:**
   Navigate to index.html and click "Map Prototype"

### Navigation

#### On World Map:
- **Click on any game mode region** to zoom into that mode's detailed view
- Regions glow and scale up on hover
- Notification badges pulse on active features

#### On Detailed Views:
- **Click "Back to World Map" button** (top-left) to return
- **Click HUD buttons** (bottom) to trigger popups
- **Press ESC** to close any open popup

### Keyboard Shortcuts

Quick navigation between views:
- `0` - World Map
- `1` - Empire View
- `2` - Expedition View
- `3` - Ravagers Reef View
- `4` - PVE View
- `5` - Mines View
- `ESC` - Close popup overlay

---

## 🎨 Interactive Elements

### Clickable Regions (World Map)

| Region | Position | Opens View | Shows Popup |
|--------|----------|------------|-------------|
| Empire (Capital City) | Center-Left | Empire View | Capital management |
| Expedition | Top-Right | Expedition View | PVP leaderboard |
| Ravagers Reef | Top-Center | Ravagers View | PVP battles |
| PVE | Bottom-Left | PVE View | Mission progress |
| Mines | Bottom-Right | Mines View | (No popup) |

### HUD Buttons

**Top Bar:**
- Player avatar & level
- Resource counters (Gold, Steel, Brass, Coal)

**Bottom Bar:**
- Empire Summary
- Conquest Guide
- Heroes
- Buildings
- Store
- Offers
- Summon
- Mail (with notification badge)
- Settings

---

## 📁 Files Involved

```
app/
├── map-prototype.html          # Main prototype page
├── map-styles.css              # Map-specific styles
├── map-interactions.js         # JavaScript for interactions
├── popup-empire.html           # Empire popup
├── popup-pvp-expedition.html   # Expedition/Ravagers popup
├── popup-pve.html              # PVE popup
└── popup-styles.css            # Shared popup styles

assets/
├── backgrounds/
│   ├── World Map Zoom Out.png      # World map view
│   ├── World Map Zoom In.png       # Closer zoom
│   ├── Map Home Empire.png         # Empire territory
│   ├── Map Expedition.png          # Expedition island
│   ├── Map Ravagers Reef.png       # Ravagers island
│   └── Map Territory.png           # Mines/territory
├── buttons/
│   └── Map HUD Button *.png        # All HUD buttons
└── ui-elements/
    ├── Map Prop *.png              # Game mode icons
    ├── Map Label *.png             # Region labels
    └── Notification Badge.png      # Alert indicators
```

---

## 🎯 Interaction Flow

### Example: Accessing Empire Mode

1. Start on **World Map**
2. Click **Empire (Capital City)** region
3. View transitions to **Empire Territory Map**
4. Click **Empire Summary button** (first HUD button at bottom)
5. **Empire popup** appears with hero card & stats
6. Click **× Close button** or press **ESC** to dismiss
7. Click **Back to World Map** to return

### Example: Accessing Expedition

1. Start on **World Map**
2. Click **Expedition** region (top-right)
3. View transitions to **Expedition Island Map**
4. Click **Expedition Summary button** (HUD)
5. **PVP Leaderboard popup** appears
6. Review rankings and rewards
7. Close and navigate back

---

## ✨ Visual Effects

- **Hover States** - Regions glow and scale up
- **Click Feedback** - Brief scale-down on click
- **Smooth Transitions** - 0.5s fade between views
- **Notification Pulses** - Red badges animate continuously
- **Drop Shadows** - Game mode icons have purple glow
- **Backdrop Blur** - Popup overlays blur background

---

## 🔧 Customization

### Changing Map Backgrounds

Edit the `<img>` sources in `map-prototype.html`:

```html
<!-- Example: Change Empire background -->
<img src="../assets/backgrounds/YOUR_NEW_MAP.png" 
     alt="Empire Map" 
     class="map-background">
```

### Adding New Game Modes

1. **Add to HTML** - Create new `<div class="map-view">` section
2. **Add to CSS** - Style the new view if needed
3. **Update JavaScript** - Add entry to `gameModes` object:

```javascript
const gameModes = {
    yourMode: {
        view: 'your-mode-view',
        popup: 'popup-your-mode.html'
    }
};
```

### Adjusting Region Positions

Edit inline styles in `map-prototype.html`:

```html
<div class="map-region" 
     style="top: 45%; left: 25%; width: 15%; height: 20%;">
```

---

## 📱 Responsive Design

The prototype adapts to different screen sizes:

- **Desktop (1024px+)** - Full HUD with all buttons
- **Tablet (768px+)** - Condensed HUD layout
- **Mobile (480px+)** - Simplified navigation, hidden labels

---

## 🐛 Troubleshooting

### Issue: Regions not clickable
**Fix:** Check that map backgrounds loaded correctly

### Issue: Popup doesn't show
**Fix:** Verify popup HTML files exist in `/app` folder

### Issue: Back button doesn't work
**Fix:** Clear browser cache and reload

### Issue: Images missing
**Fix:** Check file paths in `/assets` folder structure

---

## 🚀 Future Enhancements

Potential additions for UX testing:

- [ ] Pinch-to-zoom gesture on mobile
- [ ] Pan/drag map navigation
- [ ] Animated transitions between views
- [ ] Sound effects for interactions
- [ ] Loading states for map changes
- [ ] Tutorial tooltips for first-time users
- [ ] Analytics tracking for click patterns

---

## 📊 Testing Checklist

Use this checklist when running UX tests:

- [ ] Can users find all 5 game modes on world map?
- [ ] Do users understand which regions are clickable?
- [ ] Is the back navigation intuitive?
- [ ] Are popup close buttons easy to find?
- [ ] Do notification badges draw attention effectively?
- [ ] Is the HUD layout clear at different screen sizes?
- [ ] Do transitions feel smooth and responsive?
- [ ] Can users navigate without reading instructions?

---

## 💡 Design Notes

**Based on Figma Design:** 
- Node ID: `2850:33775`
- Section: "UX Game modes Access Points + Pop Ups"
- Date: May 8, 2026

**Key Design Decisions:**
- Purple (#dd5be5) used for primary highlights
- Green (#37ff5e) used for secondary accents
- Notification badges in red (#ff3366) for urgency
- Barlow Condensed font for all text (Google Fonts)
- 9-slice border frame for popups (authentic Figma asset)

---

**Questions or Issues?**  
Open the browser console (F12) to see interaction logs and debug information.
