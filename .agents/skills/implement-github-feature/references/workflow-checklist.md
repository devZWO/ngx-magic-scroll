# Workflow Checklist

Step-by-step checklist for implementing GitHub feature tickets in `ngx-magic-scroll`.

---

## Phase 1: Ingestion & Conflict Analysis

- [ ] **Issue ID Extracted**: Identify the target `#id` from user instructions or URL.
- [ ] **Issue Description Fetched**: Run `curl -s "https://api.github.com/repos/devZWO/ngx-magic-scroll/issues/<ID>"` to retrieve title, body, and labels.
- [ ] **Proposal Isolation Verified**: Confirmed that no files in the local `proposal/` directory are inspected or used as specifications.
- [ ] **Feature Scope Confirmed**: Verified that the issue describes a product feature/behavior and is NOT a CI/DevOps or infrastructure ticket.
- [ ] **Conflict Analysis**:
  - [ ] Checked compatibility with Signal-based state architecture.
  - [ ] Checked compatibility with router fragment navigation and scroll restoration queues.
  - [ ] Checked compatibility with user-interaction cancellation mechanics.
  - [ ] Checked active-anchor containment and scroll-spy boundary logic.
  - [ ] Verified that public API in `projects/ngx-magic-scroll/src/public-api.ts` remains backwards compatible or changes are intended.

---

## Phase 2: Interactive Demo Application

- [ ] **Options & Data Registered**: Updated `projects/demo/src/app/data/scroll-options.ts` and `param-help.data.ts` if new settings/parameters were added.
- [ ] **Interactive Controls Added**: Added UI controls (toggles, sliders, select dropdowns) in the demo options sidebar.
- [ ] **Visual Feedback**: Demonstrated behavior dynamically (e.g. via section cards, active-zone overlays, or dedicated examples in `examples.ts`).
- [ ] **Angular 22 Compliance**: Used standalone components, signals, class/style bindings, and native control flow (`@if`, `@for`).
- [ ] **Accessibility (A11y)**: Verified WCAG AA contrast, keyboard navigability, and appropriate ARIA attributes.

---

## Phase 3: Test-Driven Development (TDD) & 100% Coverage

- [ ] **Unit Tests Written First**: Created or updated `*.spec.ts` files in Vitest before/during implementation.
- [ ] **Edge Cases Covered**: Tested rapid scrolling, missing DOM elements, undefined dimensions, and dynamic layout shifts.
- [ ] **SSR Safe**: Ensured zero un-guarded `window` or `document` access (using `typeof window === 'undefined'` or `document.defaultView`).
- [ ] **Strict Typing**: No `any` or `as any` casts; all mocks and test doubles are strongly typed.
- [ ] **Coverage Verified**: Executed `pnpm run test:ci` and confirmed 100% statement, branch, function, and line coverage.

---

## Phase 4: Inline Comments & Mermaid Documentation

- [ ] **Inline Algorithm Comments**: Documented complex math, coordinate transformations, boundary comparisons, and debounced/queued restoration logic inline.
- [ ] **Mermaid Visualizations**: Created or updated Mermaid diagrams (`flowchart TD`, `sequenceDiagram`, `graph`) in `docs/src/content/docs/` to illustrate flow mechanics.
- [ ] **Documentation Pages**: Updated guides, API tables, and README files.

---

## Phase 5: Verification Pipeline & Quality Gates

- [ ] **Linting Passed**: `pnpm run lint` completes with zero errors or warnings.
- [ ] **Format Checked**: `pnpm run format:check` passes cleanly.
- [ ] **CI Tests Passed**: `pnpm run test:ci` passes with 100% coverage.
- [ ] **Recipes Verified**: `pnpm run recipes:check` validates library recipes and typings.
- [ ] **Complete Build Succeeded**: `pnpm run build` compiles `ngx-magic-scroll`, `demo`, and `docs` without errors.
- [ ] **Conventional Commit Formatted**: Prepared clear, imperative commit message following Conventional Commits (e.g. `feat: preserve reading position on layout shift (#12)`).
