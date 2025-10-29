### **[SYSTEM] AI Coding Agent Master Directive: Augment MVP Test Coverage**

**1. Primary Objective & Context**

*   **Mission:** Systematically increase test coverage for the Next.js project from its current sub-1% state to a meaningful level, ensuring the stability of critical user-facing features.
*   **Core Principles:** Prioritize business logic over simple components. Focus on creating robust, maintainable tests.
*   **Tech Stack:** Next.js (App Router), TypeScript, `pnpm`, `Vitest` + `React Testing Library`, `Hono`.
*   **Workflow:** This task is divided into parallel steps for multiple agents. A final step will integrate all work.

**2. Step 1: Analysis, Setup, and Prioritization (Master Agent)**

1.  **Initial Assessment:** Execute `pnpm test --coverage`. Analyze the output and report the current overall test coverage percentage.
2.  **Establish Priorities:** Based on the project structure (`src/`), create a prioritized list of files/directories for test creation. The priority order is **non-negotiable**:
    *   **Priority 1 (Critical):** Core backend services and routes. These handle business-critical logic like payments and data analysis.
        *   `src/features/subscription/backend/service.ts`
        *   `src/features/subscription/backend/route.ts`
        *   `src/features/new-analysis/backend/service.ts`
        *   `src/features/new-analysis/backend/route.ts`
    *   **Priority 2 (High):** Reusable business logic, utilities, and complex hooks.
        *   All files within `src/lib/utils/`
        *   All custom hooks within `src/hooks/`
    *   **Priority 3 (Medium):** Feature components with significant state, user interaction, and data dependency.
        *   `src/features/dashboard/components/`
        *   `src/features/analysis-detail/components/`
        *   `src/features/subscription/components/`
    *   **Priority 4 (Low):** Simple, presentational UI components (e.g., from `src/components/ui/`). These are lower priority as they are based on the reliable Shadcn UI library.
3.  **Setup Environment:**
    *   Verify `vitest.setup.ts` exists. If not, create it with the content: `import '@testing-library/jest-dom';`.
    *   Create a `src/__mocks__/` directory. This will be used for global mocks if needed.

**3. Step 2: Backend Logic & API Route Testing (Agent 1)**

*   **Task:** Write unit and integration tests for all Hono API routes defined in the `src/features/**/backend/` directories.

*   **Rules & Strategy:**
    1.  For each `route.ts`, create a corresponding `route.test.ts`.
    2.  **Crucially, do NOT mock the Supabase client directly.** Instead, **mock the service layer functions** imported from `service.ts`. This isolates the routing logic for testing. Use `vi.spyOn`.
        ```typescript
        // Example for: src/features/dashboard/backend/route.test.ts
        import { Hono } from 'hono';
        import { registerDashboardRoutes } from '../route';
        import * as service from '../service'; // Import the actual service

        // Mock the service functions, not the database client
        vi.spyOn(service, 'getDashboardSummary').mockResolvedValue({
          ok: true,
          status: 200,
          data: { /* mock user summary data */ }
        });

        // Test implementation follows...
        ```
    3.  Mock Clerk authentication by mocking the `auth()` helper.
        ```typescript
        // Mock the server-side auth helper
        vi.mock('@clerk/nextjs/server', () => ({
          auth: vi.fn().mockResolvedValue({ userId: 'test_user_12345' }),
        }));
        ```
    4.  For each route, test for:
        *   **Success Case:** A valid request returns a `2xx` status and the expected data structure.
        *   **Auth Failure:** A request without a valid user (`auth()` mock returns `{ userId: null }`) returns a `401 Unauthorized` error.
        *   **Service Logic Failure:** The mocked service function returns an error (`ok: false`), and the route correctly transforms it into a `4xx` or `5xx` HTTP response.

*   **Deliverable:** After generating all test files, run the tests. Report the test coverage for the `src/features/**/backend/` directories.

**4. Step 3: React Component Testing (Agent 2)**

*   **Task:** Write unit tests for React components, prioritizing those with complex logic and user interaction as defined in Step 1.

*   **Rules & Strategy:**
    1.  For each `ComponentName.tsx`, create a `ComponentName.test.tsx` file.
    2.  **Provider Wrapping:** Components that rely on React Context (e.g., `useDashboardContext`) **MUST** be wrapped in their corresponding Provider component for the test to run successfully.
        ```typescript
        // Example for a component using DashboardContext
        import { render, screen } from '@testing-library/react';
        import { DashboardProvider } from '@/features/dashboard/context/DashboardContext';
        import { DashboardSummarySection } from './DashboardSummarySection';

        const renderWithProvider = () => {
          return render(
            <DashboardProvider>
              <DashboardSummarySection />
            </DashboardProvider>
          );
        };

        it('should render user data correctly', () => {
          // Mock necessary hooks or API calls used by the provider
          renderWithProvider();
          // Assertions...
        });
        ```
    3.  Test cases must cover:
        *   Initial rendering based on props.
        *   User interactions (e.g., `fireEvent.click`, `fireEvent.change`).
        *   Conditional rendering (e.g., what is shown when data is loading vs. loaded vs. error).
        *   Prop validation and handling.

*   **Deliverable:** After generating test files, run them and report the test coverage for the `src/features/**/components/` and `src/components/` directories.

**5. Step 4: Utility & Hook Testing (Agent 3)**

*   **Task:** Write unit tests for all utility functions in `src/lib/utils/` and custom hooks in `src/hooks/`. This is a high-priority, high-ROI task.

*   **Rules & Strategy:**
    1.  For each `utils.ts` or `hook.ts`, create a corresponding `.test.ts` file.
    2.  For each exported function, create tests covering:
        *   **Happy Path:** Correct output for valid, standard inputs.
        *   **Edge Cases:** Behavior with `null`, `undefined`, empty strings/arrays, or zero.
        *   **Invalid Inputs:** Ensure the function handles unexpected data types gracefully (e.g., throws an error or returns a default value).
    3.  Focus on these files first: `date.ts`, any validation logic, and formatting functions.

*   **Deliverable:** Run the tests and report the final coverage for `src/lib/utils/` and `src/hooks/`.

**6. Step 5: Integration, CI Configuration, and Final Report (Master Agent)**

1.  **Integrate & Verify:** Pull all changes from the other agents. Run the entire test suite to ensure all tests pass together.
2.  **Calculate Final Coverage:** Execute `pnpm test:coverage` and analyze the final report.
3.  **Update `package.json`:** Add the following scripts for streamlined testing workflows:
    ```json
    "scripts": {
      "test:watch": "vitest",
      "test:coverage": "vitest run --coverage",
      "test:ui": "vitest --ui"
    }
    ```
4.  **Create CI Workflow:** Generate the file `.github/workflows/ci.yml`. The workflow must:
    *   Trigger on every push to a pull request.
    *   Install dependencies using `pnpm`.
    *   Run the linting command (`pnpm lint`).
    *   Run the entire test suite (`pnpm test:coverage`).
    *   **Crucially, configure the job to FAIL if any test fails.** (Do not enforce a hard 70% coverage gate yet).
5.  **Final Report:** Generate a final summary in markdown format:
    *   **Initial Coverage:** [Report from Step 1]
    *   **Final Coverage:** [Report from this step]
    *   **Total Test Files Created:** [Count of all `*.test.ts(x)` files created]
    *   **Next Steps:** Suggest the next priority for testing (e.g., "Implement Playwright E2E tests for the main user flows" or "Increase coverage for subscription cancellation logic").