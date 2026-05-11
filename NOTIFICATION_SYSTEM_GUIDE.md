# Mobile RPG Notification Badging System

**Target Genre:** Hero Collector RPGs (Clash Royale, Marvel Strike Force, Eternal Evolution, etc.)  
**Goal:** Guide player attention without causing notification fatigue

---

## 🎯 Quick Reference Card

| Badge | When to Use | Priority | Auto-Clear |
|-------|------------|----------|------------|
| **! Yellow** | <24hrs to expire | Highest | On expiry or action |
| **↑ Green** | Can upgrade NOW | High | When resources used |
| **# Purple** | Multiple items (2+) | Medium | After all claimed |
| **NEW Blue** | Never visited/unlocked | Medium | 24-48hrs or visit |
| **● Red** | General notification | Low | On action/claim |

---

## 📊 Badge Decision Tree

```
START: Should I show a badge?
│
├─→ Is it expiring in <24 hours?
│   └─→ YES: ! Exclamation (Yellow)
│   └─→ NO: Continue ↓
│
├─→ Can player upgrade/improve NOW with current resources?
│   └─→ YES: ↑ Green Arrow
│   └─→ NO: Continue ↓
│
├─→ Are there 2+ items waiting?
│   └─→ YES: # Number Badge (Purple)
│   └─→ NO: Continue ↓
│
├─→ Is this brand new content (unlocked <48h ago)?
│   └─→ YES: "NEW" Badge (Blue)
│   └─→ NO: Continue ↓
│
└─→ Default: ● Red Dot
```

---

## 🎮 Real Game Examples

### Clash Royale Pattern (Minimal, Respectful)
- ✅ Chest ready: Red dot appears
- ✅ Chest opened: Badge instantly disappears
- ✅ Full energy: NO badge (player chooses when to play)
- ✅ Upgradeable cards: Green arrow only

### Marvel Strike Force Pattern (Number Heavy)
- ✅ Mail: Number badge "12"
- ✅ Achievements: Number badge for claimable
- ✅ New character: "NEW" for 24 hours
- ❌ Sometimes shows badges for locked content (avoid this)

### Eternal Evolution Pattern (Upgrade Focus)
- ✅ Green arrows everywhere upgrades possible
- ✅ Clear hierarchy of what to do next
- ⚠️ Can be overwhelming with 10+ badges at once
- ✅ Smart grouping (one badge = multiple heroes ready)

### Whiteout Survival Pattern (Event Driven)
- ✅ Event timers with ! exclamation
- ✅ "NEW" on limited events
- ❌ Over-uses ! for non-expiring offers (creates fatigue)
- ✅ Good at clearing badges after action

---

## 🚫 Anti-Patterns to Avoid

### ❌ The Christmas Tree
**Problem:** 15+ badges all over the UI  
**Solution:** Max 5-7 total badges at once. Group similar items.

**Example:**
- BAD: Show 5 badges (one per upgradeable hero)
- GOOD: Show 1 badge on "Heroes" button with number "5"

### ❌ The Permanent Badge
**Problem:** Badge that never goes away  
**Solution:** Every badge must have a clear action or timeout

**Example:**
- BAD: "NEW" badge on feature that stays forever
- GOOD: "NEW" auto-clears after 48 hours

### ❌ The Boy Who Cried Wolf
**Problem:** ! exclamation on everything  
**Solution:** Reserve ! for genuine urgency (<24hrs)

**Example:**
- BAD: ! on permanent shop offers
- GOOD: ! only on event ending in 3 hours

### ❌ The Hidden Catch
**Problem:** Badge shows but action is impossible  
**Solution:** Only show badge when action is completable

**Example:**
- BAD: ↑ green arrow when missing 1 rare material
- GOOD: ↑ only when ALL requirements met

### ❌ The Ghost Notification
**Problem:** Badge leads to empty/cleared screen  
**Solution:** Remove badge instantly when action completes

**Example:**
- BAD: Click "Claim All" but badges persist
- GOOD: All badges disappear the moment rewards claimed

---

## ⏱️ Timing Guidelines

### When Badges Appear
| Trigger | Timing | Example |
|---------|--------|---------|
| **Instant** | <1 second | Chest timer completes |
| **Session Start** | On app open | Check for new mail |
| **Real-Time** | Push notification | PvP attack |
| **Background** | Every 5 min | Energy cap check |
| **Daily Reset** | 4am UTC | Shop refresh |

### When Badges Disappear
| Trigger | Timing | Example |
|---------|--------|---------|
| **Action Complete** | Instant | Player claims reward |
| **Auto-Clear Short** | 24 hours | "NEW" on daily shop |
| **Auto-Clear Long** | 48 hours | "NEW" on permanent feature |
| **Manual Dismiss** | Player tap | Long-press to clear "NEW" |
| **Resource Spent** | Instant | Green ↑ when gold used |

---

## 📱 Context-Specific Rules

### Main Hub
```
┌─────────────┐
│   HEROES    │ → ↑ Green if ANY hero can upgrade
│   [↑]       │    # Number for count if 2+
└─────────────┘

┌─────────────┐
│   QUESTS    │ → # Number for claimable rewards
│   [3]       │    (empty if all claimed)
└─────────────┘

┌─────────────┐
│   EVENTS    │ → ! if event ends <24h
│   [!]       │    "NEW" for first 48h of event
└─────────────┘    ● Red dot if event active (no urgency)

┌─────────────┐
│    MAIL     │ → # Number for unread (max "99+")
│   [12]      │    No badge if inbox empty
└─────────────┘
```

### Heroes Screen
```
Hero Portrait States:
┌────┐
│ 🦸 │ → ↑ Green: Can level/rank up NOW
└────┘

┌────┐
│ 🦸 │ → "NEW": Acquired <24h ago
└────┘

┌────┐
│ 🦸 │ → No badge: Normal state (most heroes)
└────┘

Filter Tabs:
[All (5)]  [Tank (2)]  [DPS (3)]
  ↑ Show count of upgradeable in category
```

### Energy System
```
Energy States:

🔋 0/100    → No badge (player choice when to play)
🔋 50/100   → No badge (still regenerating)
🔋 100/100  → No badge (full is normal)
🔋 100/100  → ! AFTER 30min capped (waste warning)
    (30min)
```

### Shop/Store
```
Daily Deals    → "NEW" first 2 hours after refresh
Flash Sale     → ! if <4 hours remaining
Event Shop     → "NEW" on event launch (48h)
Regular Shop   → No badge (opt-in browsing)
```

---

## 🎨 Visual Design Specs

### Badge Sizes
```
● Red Dot:       12px diameter
↑ Green Arrow:   24px diameter circle
"NEW" Label:     Auto-width, 20px height
# Number:        24px min-width, auto-expand
! Exclamation:   24px diameter
```

### Badge Position
```
Standard: Top-right corner
Offset: -4px to -8px (overlap button edge)
Z-index: Always above parent button

Example:
┌──────────┐
│          │●  ← Badge overlaps corner
│  Button  │
└──────────┘
```

### Colors (Accessibility)
```
Red Dot:      #EF4444 (Red 500)
Green Arrow:  #10B981 (Green 500)
Blue NEW:     #3B82F6 (Blue 500)
Purple Count: #8B5CF6 (Purple 500)
Yellow !:     #F59E0B (Amber 500)

All badges:
- White border (2-3px) for contrast
- Drop shadow for depth
- Min 3:1 contrast ratio (WCAG AA)
```

### Animations
```
Red Dot:      Gentle pulse (2s loop)
Green Arrow:  Subtle bounce (1s loop)
NEW Badge:    Gentle shine/fade (2s loop)
Number:       None (static)
Exclamation:  Urgent pulse + slight rotate (1.5s loop)

Reduced Motion: All animations disabled
```

---

## 🧪 Testing Checklist

### Functional Tests
- [ ] Badge appears when trigger condition met
- [ ] Badge disappears immediately after action
- [ ] Auto-clear timers work (24h, 48h)
- [ ] Only one badge type per button
- [ ] Highest priority badge shown when multiple apply
- [ ] Badge state syncs across app (no ghost badges)
- [ ] Push notification matches in-app badge

### UX Tests
- [ ] Total badges on screen <7 at any time
- [ ] No badges during tutorial/onboarding
- [ ] All badges lead to completable actions
- [ ] No permanent/unclearable badges
- [ ] Badge count matches actual items
- [ ] Color-blind mode distinguishable
- [ ] Screen reader announces badge meaning

### Performance Tests
- [ ] Badge check runs <16ms (60fps)
- [ ] No lag when checking 100+ items
- [ ] Background checks don't drain battery
- [ ] Badge state persists across app restarts

---

## 📈 Success Metrics

### Good Badge System
- **Badge Click-Through Rate:** 60-80%
  - Players click badges because they're relevant
- **Badge Dismissal Rate:** <20%
  - Few manual dismissals = badges are wanted
- **Session Start Badges:** 2-4 average
  - Enough to guide, not overwhelm
- **Player Retention:** No drop from badge fatigue

### Warning Signs
- **Badge Click Rate <40%:** Over-notification
- **Badge Dismissal >30%:** Irrelevant badges
- **>7 Badges per session:** Christmas tree effect
- **Permanent Badges:** System broken

---

## 💡 Pro Tips from Top Games

### Clash Royale's Philosophy
> "If everything is urgent, nothing is urgent."

- Minimal badges (usually 0-2 on screen)
- Clear immediately after action
- No badges on gameplay (only meta)
- Player choice emphasized

### Marvel Strike Force's Approach
> "Show quantity, not just existence."

- Number badges for everything countable
- Clear hierarchy of importance
- "NEW" used sparingly (48h max)
- Grouped notifications reduce clutter

### Eternal Evolution's Pattern
> "Green arrows guide the power curve."

- ↑ arrows only when materials available
- Smart grouping (one badge = multiple heroes)
- Clear progression path
- Sometimes over-enthusiastic (10+ badges)

---

## 🔄 Badge Lifecycle Example

**Scenario:** New hero "Shadow Knight" is acquired

```
Hour 0:  Player pulls Shadow Knight from gacha
         → "NEW" badge appears on Heroes screen
         → "NEW" badge on Shadow Knight portrait

Hour 1:  Player views Shadow Knight
         → "NEW" on portrait clears
         → "NEW" on Heroes screen persists (other new heroes)

Hour 12: Player levels up Shadow Knight to max (level 30)
         → ↑ Green arrow appears (can rank up)
         → "NEW" badge still showing

Hour 24: Auto-clear timer triggers
         → "NEW" badge disappears
         → ↑ Green arrow remains (can still rank up)

Hour 25: Player ranks up Shadow Knight
         → ↑ Green arrow disappears instantly
         → No badges (normal state)
```

---

## 🌍 Localization Notes

### Badge Text
- "NEW" should localize (新 in Chinese, NOVO in Portuguese)
- Numbers use locale format (1,234 vs 1.234)
- Date/time formats for expiry (12h vs 24h clock)

### Cultural Considerations
- Red in Asia = luck/celebration (not just warning)
- Green universally positive
- Yellow/amber needs context clues
- Test with color-blind and accessibility modes

---

## 📚 Further Reading

**Game UX Studies:**
- "The Psychology of Notifications in Mobile Games" (GDC 2023)
- "Reducing Player Fatigue in F2P Games" (Gamasutra)
- "Clash Royale: A Masterclass in Respectful Retention" (Pocket Gamer)

**Platform Guidelines:**
- iOS Human Interface Guidelines: Badges
- Android Material Design: Notifications
- WCAG 2.1: Use of Color (Accessibility)

---

**Last Updated:** Based on 2024-2025 game analysis  
**Next Review:** When new patterns emerge in top-grossing games
