# How to Package and Share

## For the sender (you)

### Option 1: Using File Explorer (Windows)

1. Navigate to: `C:\Users\LeonardPerez\AppData\Local\Temp\`
2. Right-click the `figma-prototype-bootstrap` folder
3. Select **Send to → Compressed (zipped) folder**
4. Rename to something like: `figma-prototype-bootstrap.zip`
5. Share the zip file with your colleague

### Option 2: Using Command Line

```bash
cd C:\Users\LeonardPerez\AppData\Local\Temp
tar -czf figma-prototype-bootstrap.zip figma-prototype-bootstrap/
```

## For the recipient (your colleague)

1. Extract the zip file to a project folder (e.g., `C:\Projects\my-figma-prototype\`)
2. Open `README.md` for quick overview
3. **Start here:** Open and follow `BOOTSTRAP.md` step-by-step
4. The guide will walk through:
   - Installing required tools (Node.js, Git, Claude Code)
   - Setting up the project
   - Using the 3 agents to convert Figma designs
   - Deploying to GitHub Pages

## What's in the package

```
figma-prototype-bootstrap/
├── BOOTSTRAP.md          ← Main guide for your colleague
├── README.md             ← Quick package overview
├── CLAUDE.md             ← Claude Code project instructions
├── package.json          ← Node.js dependencies
├── vite.config.ts        ← Build configuration
├── .gitignore            ← Git ignore rules
├── app/
│   ├── index.html        ← Starter HTML template
│   └── styles.css        ← Starter CSS with theme variables
├── images/               ← Folder for extracted assets
├── .claude/
│   ├── agents/           ← 3 pre-configured agents
│   │   ├── agent_generic.md
│   │   ├── agent_icon_maker.md
│   │   └── agent_ui_builder.md
│   └── skills/           ← 4 specialized skills
│       ├── publish/
│       ├── trace-map-regions/
│       ├── create-ui-from-image/
│       └── crop-icons/
└── .github/
    └── workflows/
        └── deploy.yml    ← GitHub Pages deployment
```

## Support

If your colleague has questions, they should:

1. Check `BOOTSTRAP.md` first
2. Ask Claude Code (it's designed to help beginners!)
3. Reach out to you for project-specific context
