---
id: "1.6"
epic: 1
title: "Setup Test Infrastructure"
status: pending
priority: critical
estimation: small
depends_on: ["1.1"]
---

# Story 1.6: Setup Test Infrastructure

## User Story

As a **developer**,
I want **a complete test infrastructure with unit, integration, and E2E testing capabilities**,
So that **I can write automated tests for all features and ensure code quality**.

## Technical Context

**Test Stack:**
- **Unit/Integration (Frontend):** Vitest + @testing-library/svelte
- **E2E:** Playwright (with Tauri WebDriver support)
- **Unit (Backend):** Rust's built-in `#[cfg(test)]` with cargo test
- **Coverage:** Vitest coverage with v8 provider

**Why These Tools:**
- Vitest: Native ESM, fast, excellent SvelteKit integration
- Playwright: Best Tauri E2E support, cross-platform
- Testing Library: User-centric testing philosophy, avoids implementation details

## Acceptance Criteria

### AC1: Vitest Installed and Configured
**Given** the project has SvelteKit installed
**When** Vitest is configured
**Then** the following exists:
- `vitest.config.ts` with SvelteKit plugin
- `@testing-library/svelte` installed
- `@testing-library/jest-dom` for matchers
- Test files can import Svelte components

### AC2: Test Scripts in package.json
**Given** test tools are installed
**When** package.json is checked
**Then** these scripts exist:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### AC3: Playwright Configured for Tauri
**Given** Playwright is installed
**When** E2E tests run
**Then**:
- `playwright.config.ts` exists with Tauri webview configuration
- `e2e/` directory exists for E2E test files
- Tests can interact with Tauri window

### AC4: Test Directory Structure
**Given** test infrastructure is set up
**When** project structure is checked
**Then** these directories exist:
- `src/lib/__tests__/` - Component and store unit tests
- `src/lib/__tests__/utils/` - Test utilities and mocks
- `e2e/` - End-to-end test files
- `src-tauri/src/` - Rust tests colocated with modules

### AC5: Smoke Tests Pass
**Given** all test infrastructure is configured
**When** `npm run test` is executed
**Then** a sample smoke test passes:
- `src/lib/__tests__/smoke.test.ts` - Verifies test setup works

**When** `cargo test` is executed in `src-tauri/`
**Then** Rust test infrastructure works

### AC6: Coverage Reporting Works
**Given** Vitest coverage is configured
**When** `npm run test:coverage` is executed
**Then**:
- Coverage report generates without errors
- Report shows percentage for lines, branches, functions
- HTML report available in `coverage/` directory

## Test Definition

- [ ] `npm run test` executes without errors
- [ ] `npm run test:watch` starts in watch mode
- [ ] `npm run test:coverage` generates coverage report
- [ ] `npm run test:e2e` runs Playwright tests (empty suite OK)
- [ ] `cargo test` runs in src-tauri/ without errors
- [ ] Smoke test file exists and passes
- [ ] Coverage HTML report generates in coverage/

## Implementation Notes

1. Install dev dependencies:
   ```bash
   npm install -D vitest @vitest/coverage-v8 @testing-library/svelte @testing-library/jest-dom jsdom
   npm install -D @playwright/test
   npx playwright install
   ```

2. Create `vitest.config.ts`:
   ```typescript
   import { defineConfig } from 'vitest/config';
   import { sveltekit } from '@sveltejs/kit/vite';

   export default defineConfig({
     plugins: [sveltekit()],
     test: {
       include: ['src/**/*.{test,spec}.{js,ts}'],
       environment: 'jsdom',
       globals: true,
       setupFiles: ['src/lib/__tests__/setup.ts'],
       coverage: {
         provider: 'v8',
         reporter: ['text', 'html'],
         exclude: ['node_modules/', 'src/lib/__tests__/']
       }
     }
   });
   ```

3. Create `playwright.config.ts` for Tauri:
   ```typescript
   import { defineConfig } from '@playwright/test';

   export default defineConfig({
     testDir: './e2e',
     timeout: 30000,
     use: {
       baseURL: 'http://localhost:1420', // Tauri dev server
     },
     webServer: {
       command: 'npm run dev',
       url: 'http://localhost:1420',
       reuseExistingServer: !process.env.CI,
     },
   });
   ```

4. Create test setup file `src/lib/__tests__/setup.ts`:
   ```typescript
   import '@testing-library/jest-dom';
   ```

5. Create smoke test `src/lib/__tests__/smoke.test.ts`:
   ```typescript
   import { describe, it, expect } from 'vitest';

   describe('Test Infrastructure', () => {
     it('should run tests', () => {
       expect(true).toBe(true);
     });

     it('should handle async operations', async () => {
       const result = await Promise.resolve(42);
       expect(result).toBe(42);
     });
   });
   ```

6. For Rust tests, ensure `src-tauri/src/lib.rs` has test module:
   ```rust
   #[cfg(test)]
   mod tests {
       #[test]
       fn test_infrastructure_works() {
           assert_eq!(2 + 2, 4);
       }
   }
   ```

## Files to Create/Modify

- `package.json` - Add test scripts and dev dependencies
- `vitest.config.ts` - Vitest configuration
- `playwright.config.ts` - Playwright configuration
- `src/lib/__tests__/setup.ts` - Test setup with jest-dom
- `src/lib/__tests__/smoke.test.ts` - Smoke test
- `src/lib/__tests__/utils/test-utils.ts` - Shared test utilities
- `e2e/.gitkeep` - E2E directory placeholder
- `src-tauri/src/lib.rs` - Add test module

## Dependencies

- Story 1.1 must be complete (project scaffolded)

---

*This story establishes test infrastructure. All subsequent stories should include specific test tasks.*
