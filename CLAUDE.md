# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kinescope is a motion analysis application built with Svelte and TypeScript. It provides interactive visualization of pose data synchronized with video playback, featuring scatter plots, timelines, and joint tracking capabilities.

## Development Commands

```bash
# Start development server
npm run dev

# Type checking and validation
npm run check
npm run check:watch

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to GitHub Pages
npm run deploy

# Run end-to-end tests
npx playwright test

# Run unit tests
npm run test
```

## Architecture Overview

### Core Application Structure
- **App.svelte**: Main application component that orchestrates all other components and manages global state
- **PoseData class**: Central data model for managing joint tracking data with methods for 1D/2D visualization and speed calculations
- **Component Architecture**: Modular Svelte components with prop-based communication and shared state management

### Key Components
- **MenuBar**: Joint selection and filtering interface
- **VideoPlayer**: Synchronized video playback with pose data
- **ScatterPlot**: 2D visualization using Chart.js with dynamic coloring based on time synchronization
- **Timeline**: Interactive timeline for navigating through pose data frames
- **ConsoleComponent**: Video playback controls and file loading interface

### Data Flow Pattern
The application follows a centralized state pattern where:
1. `App.svelte` maintains the primary `PoseData` instance and synchronization state
2. Components receive data through props and communicate changes via callback functions
3. Time synchronization (`syncedTime`) is shared across video, timeline, and visualization components
4. Joint masking allows selective display of tracking data

### TypeScript Integration
- Global type definitions in `src/types.d.ts` for `FrameData`, `JointData`, `JointMask`, and `PoseData` interfaces
- Chart.js type extensions for custom tooltip behavior
- Asset module declarations for SVG, JPG, and PNG imports

### Visualization Framework
- Chart.js with annotation plugin for interactive scatter plots
- Dynamic color mapping based on temporal proximity to current playback time
- Real-time data filtering and masking capabilities

### Build Configuration
- Vite-based build system with SvelteKit integration
- GitHub Pages deployment with base path configuration (`/kinescope-svelte/`)
- Vitest for unit testing with browser environment support
- Playwright for end-to-end testing

## Testing Setup
- E2E tests in `e2e/` directory using Playwright
- Unit tests for Svelte components using Vitest with browser environment
- Component tests use `.svelte.test.ts` naming convention
- Test configuration supports both client-side (browser) and server-side (node) environments