# Correct Project Structure for Kinescope Svelte TypeScript

## Directory Structure

```bash
kinescope-svelte/                    # Root project directory
├── index.html                       # ✅ Goes in ROOT (not in public/)
├── package.json                     # Project dependencies
├── vite.config.ts                   # Vite configuration
├── tsconfig.json                    # TypeScript configuration
├── tsconfig.node.json               # Node.js TypeScript configuration
├── README.md                        # Project documentation
├── .gitignore                       # Git ignore file (auto-generated)
├── svelte.config.js                 # Svelte configuration (auto-generated)
│
├── src/                             # 📂 All source code goes here
│   ├── main.ts                      # Application entry point
│   ├── app.css                      # Global styles
│   ├── types.d.ts                   # Global type declarations
│   ├── App.svelte                   # Main application component
│   ├── MenuBar.svelte               # Joint selection dropdown
│   ├── VideoPlayer.svelte           # Video display component
│   ├── ScatterPlot.svelte           # 2D scatter plot visualization
│   ├── Timeline.svelte              # Interactive timeline
│   └── ConsoleComponent.svelte      # Video playback controls
│
└── static/                          # 📂 Static assets (NOT public/)
    ├── ks.svg                       # Kinescope logo
    ├── yoga.jpg                     # Sample image (optional)
    └── favicon.ico                  # Favicon (auto-generated)
```

## Directory Structure Notes

### Correct Locations

- **`index.html`** → Root directory (same level as package.json)
- **All `.svelte` components** → `src/` directory
- **Static assets** → `static/` directory (Svelte uses `static/`, not `public/`)
- **TypeScript entry** → `src/main.ts`

### 1. Root Directory Files

```bash
kinescope-svelte/
├── index.html              # Base HTML template
├── package.json            # Dependencies with TypeScript
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── tsconfig.node.json      # Node TypeScript config
└── README.md               # Documentation
```

### 2. Source Files (`src/` directory)

```bash
src/
├── main.ts                 # Entry point (TypeScript)
├── app.css                 # Global styles
├── types.d.ts              # Type declarations
├── App.svelte              # Main component
├── MenuBar.svelte          # Menu component
├── VideoPlayer.svelte      # Video component
├── ScatterPlot.svelte      # Chart component
├── Timeline.svelte         # Timeline component
└── ConsoleComponent.svelte # Controls component
```

### 3. Static Assets (`static/` directory)

```bash
static/
├── ks.svg                  # Your logo (you provide this)
├── yoga.jpg                # Sample image (optional)
└── favicon.ico             # Auto-generated
```

## Setup Commands

```bash
# 1. Create Svelte project with TypeScript
npm create svelte@latest kinescope-svelte
cd kinescope-svelte

# During setup, choose:
# - Skeleton project
# - Yes, using TypeScript syntax
# - Add ESLint? (Yes - recommended)
# - Add Prettier? (Yes - recommended)
# - Add Playwright? (Optional)

# 2. Install dependencies
npm install

# 3. Install additional chart dependencies
npm install chart.js chartjs-plugin-annotation

# 4. Install TypeScript development dependencies
npm install --save-dev @tsconfig/svelte svelte-check typescript

# 5. Install GitHub Pages deployment
npm install --save-dev gh-pages
```

## Development Workflow

```bash
# Start development server
npm run dev

# TypeScript checking
npm run check

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

Note: **Svelte uses `static/` for assets, not `public/`**, and **`index.html` goes in the root directory**!
