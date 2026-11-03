# AGENTS.md

Instructions for AI coding agents (and humans) working in this front-end codebase. It consolidates our naming and structure conventions with the shared micro-frontend stack and quality tooling.

**Source of truth:** if this file disagrees with the actual config in the repo (`eslint.config.*`, `prettier.config.js`, `tsconfig*.json`, `package.json`), the config wins. Follow the config and point out the mismatch instead of silently choosing one.

---

## 1. Project context

- This is a micro-frontend system. Multiple teams build and deploy apps independently, and the apps are composed at runtime via Module Federation.
- All teams use one common stack (section 2). Do **not** introduce a different library for a concern the stack already covers (state, styling, bundling, API transport, testing, linting) without explicit approval.
- Priorities behind every choice: performance, maintainability, ecosystem maturity, and consistency across teams.

## 2. Tech stack

| Concern         | Choice                                           | Notes                                                                                                   |
| --------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Language        | TypeScript, **strict mode**                      | Never loosen strictness to make code compile.                                                           |
| UI framework    | React 18+                                        | Concurrent rendering; works well with Module Federation.                                                |
| Bundler         | Rspack                                           | Webpack-compatible, faster builds, first-class Module Federation support.                               |
| Micro-frontends | Webpack Module Federation (via Rspack)           | Independent deploys, composed at runtime.                                                               |
| State           | Zustand                                          | Stores can be vanilla JS or bound to React. No Redux.                                                   |
| Styling         | TailwindCSS                                      | CSS Modules are allowed only for local overrides.                                                       |
| API             | gRPC-Web via APISIX                              | Typed contracts from `.proto` files. Do not add new REST endpoints.                                     |
| Realtime        | gRPC server streaming via APISIX, plus WebSocket | WebSocket is for lightweight events (notifications, presence) or where gRPC-Web is not fully supported. |
| Testing         | Jest + React Testing Library                     | Jest for unit tests, RTL for component integration tests.                                               |
| Lint / format   | ESLint (flat config) + Prettier                  | Prettier issues surface as ESLint warnings.                                                             |
| Docs            | TSDoc comments, rendered by TypeDoc              | Docs live in the code; no separate wiki.                                                                |

## 3. Naming conventions

| Item                   | Convention                 | Example                    |
| ---------------------- | -------------------------- | -------------------------- |
| Folder                 | kebab-case                 | `sidebar-maps/`            |
| Default file           | camelCase                  | `formatDate.ts`            |
| Component / class file | PascalCase                 | `SidebarMaps.tsx`          |
| Component types        | `PascalCase.types.ts`      | `SidebarMaps.types.ts`     |
| Component constants    | `PascalCase.constants.ts`  | `SidebarMaps.constants.ts` |
| Component utils        | `PascalCase.utils.ts`      | `SidebarMaps.utils.ts`     |
| Component hooks        | `useCamelCase.ts`          | `useSideBar.ts`            |
| Global types           | `camelCase.types.ts`       | `track.types.ts`           |
| Global constants       | `camelCase.constants.ts`   | `mapConfig.constants.ts`   |
| Store (vanilla)        | `domain.store.ts`          | `track.store.ts`           |
| Store (React adapter)  | `useDomainStore.ts`        | `useTrackStore.ts`         |
| Event bus (optional)   | `domain.bus.ts`            | `track.bus.ts`             |
| Tests                  | `*.test.ts` / `*.test.tsx` | `SidebarMaps.test.tsx`     |

Inside files:

- TypeScript interfaces and types use **PascalCase**.
- Constant values use **SCREAMING_SNAKE_CASE**, for example `DEFAULT_ZOOM_LEVEL` and `MAX_TRACKS`.
- Constants files are named in camelCase (or PascalCase for component-level) and end in `.constants.ts`.

## 4. Folder structure and colocation

Keep everything a component needs next to it:

```
components/
  sidebar-maps/
    SidebarMaps.tsx            # public API of the component
    SidebarMaps.test.tsx
    SidebarMaps.types.ts
    SidebarMaps.constants.ts
    SidebarMaps.utils.ts
utils/
  formatDate.ts
  formatDate.test.ts
```

Rules:

- **Tests are always colocated** next to the file they cover (`X.tsx` → `X.test.tsx`, `formatDate.ts` → `formatDate.test.ts`). Do not create `__tests__/` directories. When you move or rename a file, move or rename its test with it.
- Component-specific types, constants, hooks and utils live in the component's folder as derivative files (`.types`, `.constants`, `.hooks`, `.utils`).
- Global (cross-component) code lives in top-level directories: `common/`, `hooks/`, `utils/`, `types/`, `store/`.

## 5. Encapsulation

- The **public API of a component is its root file** (for example `SidebarMaps.tsx`).
- Never import another component's internal derivatives (`.types`, `.constants`, `.hooks`, `.utils`) directly.
- If a module is needed by more than one component, **promote it** to a top-level directory (`common/`, `hooks/`, `utils/`, `types/`, `store/`) and import it from there.

## 6. Design patterns

- **React Hook pattern:** hooks are the main way to encapsulate logic. Side effects, state management and derived values go in custom hooks.
- **Container / Presentational with hooks:**
  - Presentational components only render UI. They are stateless and easy to test.
  - Container (logic) components fetch data, connect to stores and use hooks.
  - Hooks hold logic shared between containers or across components.
- Goal: reusable UI and testable logic. Do not mix data fetching or store access into presentational components.

## 7. State management (Zustand)

Keep the three layers separate:

1. `domain.store.ts`: vanilla/core store, usable without React.
2. `useDomainStore.ts`: the React adapter. Components use this one.
3. `domain.bus.ts`: optional event bus for cross-module events.

Keep stores minimal and boilerplate-free.

## 8. API and realtime

- Use gRPC-Web through the APISIX gateway. Contracts are defined in `.proto` files so frontend and backend stay in sync and strictly typed.
- Use gRPC server streaming (through APISIX) for realtime data flows.
- Use WebSocket only for lightweight real-time events or where gRPC-Web is not fully supported.
- Do not hand-write types that duplicate generated proto types.

## 9. Formatting (Prettier)

Never hand-format or argue about style. Run Prettier and accept its output. The configured settings:

- Semicolons: on
- Indentation: **tabs** (tab width 2)
- Quotes: **double** (also in JSX); `quoteProps: "as-needed"`
- Trailing commas: **none**
- Print width: **80**
- Arrow function parentheses: **always**, e.g. `(x) => x`
- Bracket spacing: on; JSX bracket on its own line (`bracketSameLine: false`)
- Line endings: **LF**
- Imports are sorted automatically by `@trivago/prettier-plugin-sort-imports`, with a blank line between groups and sorted specifiers.

Import order (top to bottom):

1. `react`
2. `next`
3. Third-party modules
4. `@store/*`
5. `@hooks/*`
6. `@common/*`
7. `@assets/*`
8. `@component/*`
9. `@constants/*`
10. `@utils/*`
11. `@types/*`
12. Relative paths (`./`, `../`)

## 10. Linting (ESLint, flat config)

Config extends `typescript-eslint` `recommended` and `recommendedTypeChecked`, plus the JSDoc plugin and Prettier. Code must pass with no errors and no new warnings.

TypeScript rules:

- `no-floating-promises`: **error**. Always `await`, return, or explicitly handle promises.
- `no-explicit-any`: warn. Avoid `any`; use `unknown` or precise types.
- `no-unused-vars`: warn. Remove unused variables and imports.
- `ban-ts-comment`: warn. Avoid `@ts-ignore` and similar suppressions.
- `no-inferrable-types`: off.
- `max-lines`: warn above **500 lines** per file (blank lines and comments are not counted). Split large files instead of growing them.

JSDoc rules (all at warning level) require valid tag names, values and alignment, correct param names, and a description for every param, property and return value. `require-jsdoc` applies to function declarations, methods, and arrow functions assigned to variables.

## 11. Documentation (TSDoc / TypeDoc)

- Every function, method and variable-assigned arrow function gets a doc comment with: a summary, `@param name - description` for each parameter, and `@returns` with a description where the function returns a value (plus `@yields` for generators).
- Write comments in TSDoc-compatible syntax; TypeDoc generates the documentation from them.
- Keep comments accurate when code changes. Outdated docs are worse than none.

## 12. Testing

- Jest for unit tests, React Testing Library for component tests.
- Every new component, hook, util and store gets a colocated test.
- Test behavior through the component's public API (its root file), not its internal derivatives.

## 13. Micro-frontend rules

- Build each app so it can be developed and deployed independently, and loaded via Module Federation.
- Keep shared code in the top-level shared directories; do not reach into another micro-frontend's internals.
- Keep the stack identical across micro-frontends (section 2).

## 14. Definition of done

Before declaring a task complete, run the relevant scripts from `package.json` (do not invent script names) and confirm:

- [ ] Type-check passes under strict mode.
- [ ] ESLint reports no errors and no new warnings.
- [ ] Prettier formatting is applied (imports sorted).
- [ ] New or changed behavior has a colocated test, and tests pass.
- [ ] New functions have TSDoc comments.
- [ ] File names and folders follow section 3, and cross-component imports follow section 5.
- [ ] No file exceeds 500 lines.

## 15. Points to confirm with the team

- **Hook file naming:** the naming table uses `useCamelCase.ts`, but `.hooks` is also listed as a colocated derivative. Default to `useXxx.ts` and follow the surrounding code if it differs.
- **`next` in import order:** the import order lists a `^next` group even though the stack is React + Rspack. Keep it as configured unless the config says otherwise.
