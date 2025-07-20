# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser extension project built with WXT (Web eXTension) framework and React. It's a Chrome/Firefox extension that includes:

- A popup interface (React app)
- Background script for extension lifecycle
- Content script that runs on Google domains

## Development Commands

**Development:**

- `npm run dev` - Start development mode with hot reload (Chrome)
- `npm run dev:firefox` - Start development mode for Firefox

**Building:**

- `npm run build` - Build extension for Chrome
- `npm run build:firefox` - Build extension for Firefox
- `npm run zip` - Create distributable zip for Chrome
- `npm run zip:firefox` - Create distributable zip for Firefox

**Type Checking:**

- `npm run typecheck` - Run TypeScript type checking without emitting files

**Setup:**

- `bun install` - Install dependencies (MUST use bun, not npm)
- `npm run postinstall` - Prepare WXT development environment (runs automatically after install)

## Architecture

The project follows WXT's file-based routing system:

- **entrypoints/popup/** - Extension popup UI (React app with TypeScript)
- **entrypoints/background.ts** - Service worker/background script
- **entrypoints/content.ts** - Content script (currently targets Google domains)
- **public/** - Static assets including extension icons
- **wxt.config.ts** - WXT framework configuration

## Key Technologies

- **WXT Framework** - Modern web extension development framework
- **React 19** - UI framework for popup interface
- **TypeScript** - Type safety across all entry points
- **Zustand** - State management (v1.2.2+ unified architecture)
- **Bun** - Package manager (based on bun.lock presence)

## Development Notes

- Extension popup is located in `entrypoints/popup/App.tsx`
- Content script currently matches `*://*.google.com/*` domains
- WXT handles manifest generation and cross-browser compatibility
- TypeScript configuration extends WXT's base config with React JSX support

## State Management Architecture (v1.2.2+)

**Zustand-Centered Design:**
- All application state is managed in Zustand stores
- Components are purely presentational and focus on rendering
- Single source of truth for all data (settings, API data, UI states)
- Automatic persistence to Chrome Storage

**Key Principles:**
- Components subscribe to store state and never manage local state for data
- All async operations (API calls, storage) are handled in store actions
- Loading states, errors, and data are all centralized in stores
- Eliminates state synchronization issues between components

## Request Optimization (v1.2.2+)

**Intelligent Request Management:**
- Request deduplication using AbortController
- Request locking mechanism prevents concurrent duplicate calls
- Extended cache duration (5 minutes) to reduce API load
- Automatic cache invalidation and refresh capabilities

**Performance Features:**
- API request manager with built-in deduplication
- Selective useEffect dependencies to prevent unnecessary re-renders
- Optimized page transitions without forced refreshes
- Intelligent error handling and recovery

## UI Components (shadcn/ui)

When adding shadcn/ui components using `npx shadcn add [component-name]`, the generated component files need path corrections based on the project's alias configuration:

- Change any `../lib/utils` or similar relative imports to `@/lib/utils`
- Ensure component imports use `@/components/ui/[component-name]`
- All shadcn/ui components should follow the aliases defined in `components.json`:
  - `utils` → `@/lib/utils`
  - `components` → `components`
  - `ui` → `components/ui`

每个文件的代码行数不能超过 350 行

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
