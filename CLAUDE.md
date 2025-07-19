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
- `npm run compile` - Run TypeScript type checking without emitting files

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
- **Bun** - Package manager (based on bun.lock presence)

## Development Notes

- Extension popup is located in `entrypoints/popup/App.tsx`
- Content script currently matches `*://*.google.com/*` domains
- WXT handles manifest generation and cross-browser compatibility
- TypeScript configuration extends WXT's base config with React JSX support

## UI Components (shadcn/ui)

When adding shadcn/ui components using `npx shadcn add [component-name]`, the generated component files need path corrections based on the project's alias configuration:
- Change any `../lib/utils` or similar relative imports to `@/lib/utils`
- Ensure component imports use `@/components/ui/[component-name]`
- All shadcn/ui components should follow the aliases defined in `components.json`:
  - `utils` → `@/lib/utils`
  - `components` → `components`
  - `ui` → `components/ui`