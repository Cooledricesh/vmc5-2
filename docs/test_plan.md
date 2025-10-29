### **[SYSTEM] AI Coding Agent Task Directive: MVP Test Environment Implementation**

**1. ROLE & GOAL:**
*   **You are:** An expert Full-Stack Engineer specializing in Next.js and modern testing frameworks.
*   **Your Mission:** Implement a robust and efficient testing environment for a Next.js MVP project. The implementation must strictly adhere to the principles of "fast development speed" and "minimal infrastructure complexity."

**2. CORE CONTEXT:**
*   **Project:** Next.js 14+ with App Router.
*   **Package Manager:** `pnpm`.
*   **Chosen Tech Stack (Non-negotiable):**
    *   **Unit/Component Testing:** `Vitest` + `React Testing Library (RTL)`.
    *   **End-to-End (E2E) Testing:** `Playwright`.
*   **Constraint:** Do NOT suggest or implement alternative libraries (e.g., Jest, Cypress). Focus exclusively on the chosen stack.

**3. ACTIONABLE STEPS: UNIT TEST (VITEST)**

*   **Step 3.1: Dependency Installation**
    *   Execute the following command to install all required development dependencies for unit testing:
        ```bash
        pnpm add -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @vitejs/plugin-react
        ```

*   **Step 3.2: Configuration**
    *   Create `vitest.config.ts` in the project root with the following content. This configuration sets up a JSDOM environment and path aliases.
        ```typescript
        import { defineConfig } from 'vitest/config';
        import react from '@vitejs/plugin-react';
        import path from 'path';

        export default defineConfig({
          plugins: [react()],
          test: {
            globals: true,
            environment: 'jsdom',
            setupFiles: './vitest.setup.ts',
            alias: {
              '@': path.resolve(__dirname, './src'),
            },
          },
        });
        ```
    *   Create `vitest.setup.ts` in the project root to extend Jest's DOM matchers.
        ```typescript
        import '@testing-library/jest-dom';
        ```

*   **Step 3.3: Script Integration**
    *   Add the following scripts to `package.json`:
        ```json
        "scripts": {
          "test:unit": "vitest run",
          "test:unit:watch": "vitest",
          "test:unit:ui": "vitest --ui"
        }
        ```

*   **Step 3.4: Example Implementation**
    *   Create a test file for a simple UI component (e.g., `src/components/ui/button.test.tsx`).
    *   Implement at least three test cases:
        1.  Renders correctly with given children.
        2.  Fires `onClick` event when clicked. Use `vi.fn()` for mocking.
        3.  Is disabled when the `disabled` prop is true.

**4. ACTIONABLE STEPS: E2E TEST (PLAYWRIGHT)**

*   **Step 4.1: Dependency Installation & Setup**
    *   Execute these commands sequentially to install Playwright and its browser dependencies:
        ```bash
        pnpm add -D @playwright/test
        npx playwright install --with-deps
        ```

*   **Step 4.2: Configuration**
    *   Create `playwright.config.ts` in the project root. The configuration MUST include an optimized `webServer` block that reuses the existing dev server and has an increased timeout.
        ```typescript
        import { defineConfig, devices } from '@playwright/test';

        export default defineConfig({
          testDir: './tests-e2e',
          fullyParallel: true,
          reporter: 'html',
          use: {
            baseURL: 'http://localhost:3000',
            trace: 'on-first-retry',
          },
          projects: [
            {
              name: 'chromium',
              use: { ...devices['Desktop Chrome'] },
            },
          ],
          webServer: {
            command: 'pnpm dev',
            url: 'http://localhost:3000',
            reuseExistingServer: !process.env.CI,
            timeout: 120 * 1000, // Explicitly set timeout to 120s
          },
        });
        ```

*   **Step 4.3: Script Integration**
    *   Add the following scripts to `package.json`:
        ```json
        "scripts": {
          "test:e2e": "playwright test",
          "test:e2e:ui": "playwright test --ui",
          "test:e2e:codegen": "playwright codegen"
        }
        ```

*   **Step 4.4: Example Implementation**
    *   Create a test file `tests-e2e/smoke.spec.ts`.
    *   Implement a "Smoke Test" for the homepage (`/`) that verifies:
        1.  The main heading (`h1`) is visible.
        2.  A key Call-to-Action button/link exists and navigates to the sign-up page (`/sign-up`).

**5. ADVANCED IMPLEMENTATION GUIDELINES (MANDATORY):**

*   **API Mocking:** For any E2E test that depends on external data (e.g., fetching analysis history from `/api/analyses`), you MUST implement API mocking using `page.route()`. This is critical to ensure test stability and speed. Create a mock handler that intercepts the request and returns a predefined JSON payload using `route.fulfill()`.

*   **Authentication Strategy:** Implement a robust authentication strategy for E2E tests to avoid UI-based login on every test run.
    *   **Method:** Use `globalSetup` to perform a single programmatic login.
    *   **State Persistence:** After login, save the browser context's state (cookies, local storage) to a file (e.g., `storageState.json`) using `page.context().storageState()`.
    *   **Configuration:** Configure `playwright.config.ts` to `use` this `storageState.json` file for all tests, ensuring they start in an authenticated state.

**6. FINAL DELIVERABLE:**
*   A single Pull Request containing all files and configurations mentioned above.
*   The PR must pass all newly created unit and E2E tests in a CI environment.
*   The code must be clean, well-commented where necessary, and ready for team review.