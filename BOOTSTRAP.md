# Figma to HTML Prototype Bootstrap

**Quick start guide for converting your Figma designs to interactive HTML prototypes using Claude Code.**

---

## 🎯 What This Is

A pre-configured project for UX designers to:
- Convert Figma screenshots to HTML/React code
- Extract assets from Figma exports
- Build interactive prototypes
- Deploy to GitHub Pages (live URL)

**No coding required** - just screenshots and Claude Code!

---

## 📦 What You Need

1. **Claude Code** - Download from [claude.ai/code](https://claude.ai/code)
2. **Node.js 24+** - Download from [nodejs.org](https://nodejs.org/)
3. **GitHub account** - Sign up at [github.com](https://github.com/)
4. **Git** - Download from [git-scm.com](https://git-scm.com/)

---

## 🚀 Getting Started

### Step 1: Set Up Your Project

1. **Unzip this folder** to your computer (e.g., `Documents/my-prototype`)

2. **Open in Claude Code:**
   - Launch Claude Code
   - File → Open Folder
   - Select the unzipped folder

3. **Install dependencies:**
   ```bash
   npm install
   ```

### Step 2: Connect to GitHub

1. **Create a new repository** on GitHub:
   - Go to [github.com/new](https://github.com/new)
   - Name: `my-figma-prototype`
   - Make it **Public** (required for GitHub Pages)
   - **Don't** initialize with README

2. **Link your local project:**
   ```bash
   git init
   git add .
   git commit -m "Initial setup"
   git remote add origin https://github.com/YOUR-USERNAME/my-figma-prototype.git
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - Go to your repo → Settings → Pages
   - Source: **GitHub Actions**
   - Save

---

## 🎨 Converting Figma to HTML

### Option A: Full Screen Layouts

**Best for:** Complete page designs from Figma

1. **Export from Figma:**
   - Select your frame/artboard
   - Right-click → Export → PNG (2x recommended)
   - Save to your computer

2. **In Claude Code, ask:**
   ```
   Create an HTML page from this screenshot
   ```
   Then drag-and-drop your PNG file

3. **Claude will:**
   - Analyze the layout
   - Extract visible assets
   - Generate HTML/CSS code
   - Save to `app/` directory

### Option B: Individual Assets/Icons

**Best for:** Extracting buttons, icons, logos

1. **Export from Figma:**
   - Select your asset/icon
   - Export → PNG
   - Save to your computer

2. **In Claude Code, use:**
   ```
   /crop-icons
   ```
   Then provide the screenshot with icons

3. **Claude will:**
   - Crop each icon individually
   - Remove backgrounds
   - Save to `images/` with descriptive names

---

## 🗺️ Special: Interactive Maps

**If you have map designs with regions/territories:**

1. **Export map as PNG**

2. **Use the tool:**
   ```
   /trace-map-regions
   ```

3. **Follow the interactive seed placer:**
   - Click once in each region
   - Export seeds
   - Get clickable SVG paths

---

## 🌐 Deploy to Web (Get Live URL)

**Make your prototype accessible online:**

```
/publish
```

Claude will:
- Build your HTML/React app
- Commit changes to Git
- Push to GitHub
- Deploy via GitHub Actions
- Give you a live URL like: `https://YOUR-USERNAME.github.io/my-figma-prototype`

Share this URL with your team!

---

## 💡 Available Agents

**Claude Code has specialized "agents" for different tasks. Switch by asking:**

### Generic Agent (Default)
- General questions
- File management
- Code explanations

**Switch:** _"Switch to Generic Agent"_

### Icon Maker
- Extract icons from screenshots
- Clean backgrounds
- Batch asset processing

**Switch:** _"Switch to Icon Maker"_

### UI Builder
- Convert Figma screenshots to HTML
- Build responsive layouts
- Mobile-first design

**Switch:** _"Switch to UI Builder"_

---

## 📂 Project Structure

```
my-prototype/
├── app/                    # Your HTML/React pages go here
│   ├── index.html         # Main page
│   ├── styles.css         # Styles
│   └── ...
├── images/                # Extracted assets (icons, logos)
├── .claude/               # Claude Code configuration
│   ├── agents/           # Pre-configured agents
│   └── skills/           # Pre-configured tools
├── BOOTSTRAP.md          # This file
├── CLAUDE.md             # Project instructions for Claude
└── package.json          # Node.js config
```

---

## 🆘 Common Tasks

### "I want to add a new page"

Just ask Claude:
```
Create a new page called "about.html" with a hero section and contact form
```

### "I want to update an existing page"

Share the screenshot:
```
Update index.html to match this new design
```
(attach PNG)

### "I want to change colors/fonts"

```
Change the primary color to #FF6B6B and use Inter font family
```

### "I want to make it mobile-friendly"

```
Make this page responsive for mobile devices
```

### "Something broke, help!"

```
The page isn't displaying correctly, can you debug it?
```

---

## 🎓 Tips for Success

1. **Export at 2x resolution** from Figma for crisp assets
2. **Name your Figma layers clearly** - Claude picks up on names for IDs/classes
3. **One screen at a time** - Start with homepage, then add more pages
4. **Test after each change** - Open `app/index.html` in a browser
5. **Commit often** - Save your work with `git commit` after each major change
6. **Ask questions** - Claude understands natural language!

---

## 🔧 Advanced: React Components

**If you want reusable components:**

Ask Claude:
```
Convert this button design to a reusable React component
```

Claude will create `.tsx` files with TypeScript + React.

---

## 📞 Need Help?

1. **In Claude Code:** Just ask! "How do I...?" or "Can you help me...?"
2. **Claude remembers context** - It knows your project structure
3. **Check CLAUDE.md** - Project-specific instructions
4. **GitHub Issues** - Report bugs in this bootstrap at [your-repo-issues]

---

## ✅ Checklist: First Prototype

- [ ] Install Node.js, Git, Claude Code
- [ ] Unzip this folder
- [ ] Run `npm install`
- [ ] Connect to GitHub repo
- [ ] Enable GitHub Pages
- [ ] Export first screen from Figma as PNG
- [ ] Ask Claude to create HTML from screenshot
- [ ] Test in browser: open `app/index.html`
- [ ] Deploy with `/publish`
- [ ] Share live URL with team! 🎉

---

**Happy prototyping!** 🎨✨
