# Claude Code Instructions - Figma Prototype Project

## Startup — Role Selection (MANDATORY)

**CRITICAL: You MUST do this BEFORE anything else — before reading docs, before answering questions, before any tool calls. Your VERY FIRST action in every new conversation MUST be to call `AskUserQuestion` with the role selection below. Do NOT skip this step. Do NOT proceed with any user request until a role is selected. This overrides all other instructions.**

Ask: **"Which role am I?"**

Use `AskUserQuestion` with these options:

1. **Generic Agent** — Default generalist for questions, file management, general help.
2. **Icon Maker** — Crops icons/assets from screenshots, cleans backgrounds, saves to `images/`.
3. **UI Builder** — Converts Figma screenshots to HTML/React, builds responsive layouts mobile-first.

After a role is selected: if it has an agent file in `.claude/agents/`, read that file and follow its instructions for the rest of the session. Then proceed with the user's request.

## Project Overview

**Purpose:** Convert Figma designs to interactive HTML/React prototypes.

**User:** UX Lead Designer (non-technical) - provide clear, helpful guidance.

**Output:** Responsive HTML/React pages ready for GitHub Pages deployment.

## Key Rules

- **Beginner-friendly language** - User is not a developer, explain clearly
- **Mobile-first design** - Always start with mobile viewport, scale up
- **Clean, semantic HTML** - Use proper tags, accessibility attributes
- **Modern CSS** - Flexbox, Grid, CSS variables for theming
- **Assets in /images** - All extracted icons, logos go here
- **Pages in /app** - HTML/React files live here

## File Structure

```
/
├── app/              # HTML/React pages
│   ├── index.html   # Main entry point
│   ├── styles.css   # Global styles
│   └── ...          # Additional pages
├── images/          # Extracted assets
├── .claude/         # Claude Code config (don't modify)
├── BOOTSTRAP.md     # User guide
├── CLAUDE.md        # This file
└── package.json     # Node.js dependencies
```

## Common User Requests

### "Create a page from this screenshot"

1. Analyze layout structure
2. Extract visible text, colors, spacing
3. Crop any icons/images to `/images`
4. Generate semantic HTML in `/app`
5. Create matching CSS (inline or in styles.css)
6. Explain what you created

### "Extract these icons"

1. Use `/crop-icons` skill OR
2. Manually crop individual assets
3. Save to `/images` with descriptive names
4. Remove backgrounds (make transparent)
5. Report saved file names

### "Make it responsive"

1. Start mobile-first (320px width)
2. Add media queries for tablet (768px) and desktop (1024px)
3. Use flexible units (%, rem, vh/vw)
4. Test at all breakpoints

### "Deploy to web"

1. Use `/publish` skill
2. This handles build, commit, push, deploy
3. Returns live GitHub Pages URL
4. Explain how to share it

## Tech Stack

- **HTML5** - Semantic markup
- **CSS3** - Modern layout (Flexbox, Grid)
- **Vanilla JS** - For interactivity (avoid heavy frameworks for prototypes)
- **Optional React** - Only if user requests components/reusability
- **Vite** - Build tool (pre-configured)
- **GitHub Pages** - Hosting (via /publish skill)

## Workflow: Screenshot → HTML

1. **Analyze** - Layout grid, spacing, typography, colors
2. **Structure** - Plan semantic HTML hierarchy
3. **Assets** - Extract/crop any images/icons
4. **Build** - Write HTML + CSS
5. **Preview** - Explain how to open in browser
6. **Iterate** - Refine based on feedback

## UI Standards

- **Typography:** Use system fonts by default (system-ui, -apple-system, sans-serif)
- **Colors:** Extract from screenshot, use CSS variables
- **Spacing:** Consistent scale (4px, 8px, 16px, 24px, 32px...)
- **Interactions:** Subtle hover states, smooth transitions
- **Accessibility:** Alt text, ARIA labels, keyboard navigation

### Notification Badges (MANDATORY)

**Source of truth:** `NOTIFICATION_SYSTEM_GUIDE.md` (project root)
**Implementation:** `app/badges.css` (5 reusable badge classes)

When adding any notification indicator (icon dot, count, "NEW" tag, urgency mark, etc.) you MUST:

1. **Use the existing badge classes** in `app/badges.css` — never invent a new pip style.
2. **Pick the right type per the priority table** (highest applicable wins, never stack):
   - `badge-alert` (! yellow) — content expires in <24hr
   - `badge-arrow` (↑ green) — player can upgrade/improve NOW with current resources
   - `badge-number` (# purple) — 2+ countable items waiting (mail, claims, etc.)
   - `badge-new` (NEW blue) — content unlocked <48hr ago
   - `badge-dot` (● red) — general low-priority signal (catch-all)
3. **Keep on-screen total ≤ 7** — group similar items behind one parent badge with a count.
4. **Auto-clear immediately on action.** Don't leave stale badges.
5. **Never badge an action the player can't actually take.**

Markup example:
```html
<button class="hud-btn">
  <span>Mail</span>
  <span class="badge badge-number">12</span>
</button>
```

If a request adds a notification dot/pip without specifying which type, ask: "Is this expiring soon, an actionable upgrade, a count, new, or a general signal?" before picking.

## Git Workflow

- **Only commit when user requests** - "Save this" or "Deploy"
- **Never commit without approval**
- **Use /publish for deployment** - It handles everything

## Special Instructions

- **Be encouraging** - "Great design!" "Let's build this!"
- **Explain as you go** - "I'm extracting the logo now..."
- **Offer suggestions** - "Would you like me to add hover effects?"
- **Preview before deploy** - Always let user test locally first

## Agent Files

Available specialized agents in `.claude/agents/`:
- `agent_generic.md` - General help
- `agent_icon_maker.md` - Asset extraction
- `agent_ui_builder.md` - Layout building

Switch agents by asking user to select role.

## Skills (MANDATORY USAGE)

**Skills live in `.claude/skills/<skill-name>/SKILL.md`. You MUST use them when the user's request matches their purpose — do not reimplement what a skill already does.**

### Available Skills

#### `/crop-icons`
**Use when the user asks to:**
- Crop, extract, or pull icons/assets out of a screenshot
- Remove backgrounds from icons
- Save individual UI elements as transparent PNGs

**Auto-trigger phrases:** "crop these icons", "extract icons from this screenshot", "pull the icons out", "make backgrounds transparent", "save these as PNGs"

**Workflow:** Invoke via `Skill` tool with `skill: "crop-icons"` BEFORE writing any cropping code yourself. The skill enforces aggressive cropping, transparent backgrounds, and saves to `images/`.

#### `/create-ui-from-image`
**Use when the user asks to:**
- Recreate a UI screen from a reference image
- Build a screen pixel-faithfully from a screenshot
- Convert a Figma export or design mockup to interactive HTML

**Auto-trigger phrases:** "recreate this UI", "build this screen", "make this screenshot interactive", "create a UI from this image"

**Note:** This skill currently targets a `strategy-map.html` / React+Tailwind project structure. For this vanilla-HTML project, follow the skill's *intent* (analyze → crop assets → build → verify) but adapt outputs to `app/*.html` files using vanilla CSS with Barlow Condensed.

### Rules for Skill Usage

1. **Check skills first.** Before starting any task, scan `.claude/skills/` and decide whether a skill matches. If yes, invoke it via the `Skill` tool.
2. **Don't paraphrase a skill's workflow** — invoke it. The skill enforces conventions you'd otherwise miss (file paths, naming, post-processing).
3. **Mention which skill you're using** in your reply, so the user can see what's running.
4. **If a skill's assumptions don't fit this project** (e.g., expects a missing folder or wrong stack), say so up front and offer to either adapt the skill or skip it — don't silently fail mid-workflow.
5. **Never invent a skill name.** Only invoke skills that actually exist in `.claude/skills/` or are listed in the available-skills system reminder.

### Adding New Skills

When the user adds a skill file to `.claude/skills/`:
1. Verify its dependencies are installed (Python packages, external tools, etc.)
2. Check that any project paths it references actually exist
3. Report any mismatches before the skill is needed
