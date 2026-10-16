# Quality Standards

Reference standards for Angular 22, TypeScript, testing, accessibility, and documentation in `ngx-magic-scroll`.

---

## 1. TypeScript Standards

- **Strict Type Checking**: Strict null checks, no implicit any, exact optional property types where applicable.
- **No `any` Casts**: Never use `any` or `as any`. Use `unknown` when type is uncertain and narrow using type guards.
- **Inference**: Prefer type inference when variable types are obvious from assignment.

---

## 2. Angular 22 Best Practices

- **Standalone Default**:
  - All components, directives, and pipes are standalone by default in Angular v22+.
  - **Do NOT** explicitly specify `standalone: true` inside decorators.
- **Signals for State**:
  - Use `signal()` for writable state.
  - Use `computed()` for derived values.
  - Use `effect()` for reactive side-effects.
  - Never use `.mutate()`; use `.update()` or `.set()`.
  - Use `input()` and `output()` signal functions instead of legacy decorators.
- **Component Host Properties**:
  - Do NOT use `@HostBinding` or `@HostListener`. Put host attributes, classes, and listeners in the `host` property of `@Component` or `@Directive`.
- **Change Detection**:
  - Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorators (OnPush is default).
- **Template Directives & Control Flow**:
  - Use native control flow (`@if`, `@for`, `@switch`).
  - Do NOT use `ngClass` or `ngStyle`; use native `[class]` and `[style]` bindings.
  - Keep templates simple; avoid embedding complex business logic.
- **Services & Dependency Injection**:
  - Use `inject()` instead of constructor parameter injection.
  - Use `@Service()` or root injectors appropriately.

---

## 3. Server-Side Rendering (SSR) Resilience

- The library and demo must execute safely in non-browser Node.js/SSR environments.
- Protect all direct browser API interactions:
  ```typescript
  if (typeof window === 'undefined') {
    return;
  }
  const view = document.defaultView;
  ```
- Use injected `DOCUMENT` token and verify `defaultView` / `window` availability before accessing DOM dimensions or scroll coordinates.

---

## 4. Accessibility (WCAG AA & AXE)

- Maintain full WCAG AA compliance across all demo components.
- Ensure proper focus management during keyboard navigation.
- Maintain adequate color contrast ratios for overlays and text.
- Use explicit ARIA roles, labels, and states where visual feedback is presented.

---

## 5. Vitest & 100% Test Coverage

- **100% Code Coverage**: Unit test suites must achieve 100% statements, branches, functions, and lines.
- **Isolated & Deterministic**: Mock timers with `vi.useFakeTimers()` when testing debounces, delays, or animation frames.
- **Deprecations**: Do NOT use deprecated test utilities like `NoopAnimationsModule`.
- **Fully Typed Mocks**: Construct complete mock fixtures typed as the exact interface rather than partial castings.

---

## 6. Conventional Commits

Commit messages must adhere strictly to the Conventional Commits specification:

- `feat:` for new capabilities or parameters
- `fix:` for bug fixes
- `docs:` for documentation updates
- `refactor:` for code changes without feature/fix modifications
- `test:` for test additions or updates
- `chore:` for build, dependency, and configuration changes
