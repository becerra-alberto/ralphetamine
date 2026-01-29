---
id: "1.1"
epic: 1
title: "Initialize Tauri + SvelteKit Project"
status: pending
priority: critical
estimation: small
---

# Story 1.1: Initialize Tauri + SvelteKit Project

## User Story

As a **developer**,
I want **a scaffolded Tauri 2.0 + SvelteKit 5 project with TypeScript and Tailwind CSS**,
So that **I have the foundational tech stack ready for feature development**.

## Technical Context

**Stack Requirements (from PRD Section 7):**
- Frontend: SvelteKit 5 + TypeScript
- Styling: Tailwind CSS with design system tokens
- Backend: Tauri 2.0 (Rust)
- Target: macOS primary (Windows/Linux future)

**Design System Tokens (from PRD Section 6):**
```css
/* Light Mode */
--bg-primary: #FFFFFF
--bg-secondary: #F8F9FA
--text-primary: #1A1A1A
--text-secondary: #6B7280
--accent: #4F46E5
--success: #10B981
--danger: #EF4444
--warning: #F59E0B
--neutral: #6B7280

/* Dark Mode */
--bg-primary: #0F0F0F
--bg-secondary: #1A1A1A
--text-primary: #F9FAFB
--text-secondary: #9CA3AF
```

## Acceptance Criteria

### AC1: Project Structure
**Given** a fresh project directory
**When** the project is initialized
**Then** the following structure exists:
- `src-tauri/` directory with Cargo.toml configured for Tauri 2.0
- `src/` directory with SvelteKit 5 app structure
- `src/routes/` directory for SvelteKit routing
- `src/lib/` directory for shared components
- `tailwind.config.js` with design system color tokens
- `package.json` with all required dependencies

### AC2: Dependencies Installed
**Given** the project is initialized
**When** dependencies are checked
**Then** package.json includes:
- `svelte` ^5.x
- `@sveltejs/kit` ^2.x
- `tailwindcss` ^3.x
- `typescript` ^5.x
- `@tauri-apps/api` ^2.x

### AC3: Dev Server Runs
**Given** the project is scaffolded
**When** `npm run tauri dev` is executed
**Then** the Tauri app window opens without errors
**And** the window title displays "Stackz"
**And** hot reload works for Svelte components

### AC4: TypeScript Configured
**Given** the project has TypeScript files
**When** `npm run check` is executed
**Then** Svelte type checking passes with no errors

### AC5: Tailwind Configured
**Given** Tailwind CSS is configured
**When** Tailwind classes are used in components
**Then** styles render correctly in the app

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/design-tokens.test.ts` - Verify all design system CSS variables are defined (--bg-primary, --accent, etc.)
- [ ] `src/lib/__tests__/design-tokens.test.ts` - Test light mode color values match PRD specification
- [ ] `src/lib/__tests__/design-tokens.test.ts` - Test dark mode color values match PRD specification

### Integration Tests
- [ ] `src-tauri/src/lib.rs` - `#[cfg(test)]` module verifying Tauri app builds without errors
- [ ] `src-tauri/src/lib.rs` - Test window configuration has title "Stackz"

### E2E Tests
- [ ] `e2e/app-init.spec.ts` - Test app window opens and displays content
- [ ] `e2e/app-init.spec.ts` - Test Tailwind classes render correctly (verify a styled element)
- [ ] `e2e/app-init.spec.ts` - Test design tokens are applied (check computed styles)

### Build Verification (CI)
- [ ] `npm run check` passes TypeScript validation
- [ ] `npm run lint` passes ESLint checks
- [ ] `npm run build` completes without errors

## Implementation Notes

1. Use `npm create tauri-app@latest` with SvelteKit template
2. Configure Tailwind with custom color tokens from PRD
3. Set window title to "Stackz" in `tauri.conf.json`
4. Enable TypeScript strict mode

## Files to Create/Modify

- `package.json` - dependencies
- `tailwind.config.js` - design tokens
- `src-tauri/tauri.conf.json` - window config
- `src/app.css` - global styles with CSS variables
- `tsconfig.json` - TypeScript config
