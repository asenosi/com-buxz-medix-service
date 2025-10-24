# Repository Guidelines

## Project Structure & Module Organization
- `src/` — TypeScript React app (Vite). Key areas:
  - `src/pages/` (route-level views, e.g., `Dashboard.tsx`, `Auth.tsx`).
  - `src/components/` (feature components) and `src/components/ui/` (shadcn/ui primitives).
  - `src/hooks/` (reusable hooks, e.g., `use-mobile.tsx`, `use-toast.ts`).
  - `src/integrations/supabase/` (client and generated types).
- `public/` — static assets.
- `supabase/` — database config and SQL migrations.
- Root config: `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `eslint.config.js`.

## Build, Test, and Development Commands
- `npm run dev` — start Vite dev server.
- `npm run build` — production build to `dist/`.
- `npm run build:dev` — development-mode build (useful for debugging prod issues).
- `npm run preview` — serve the built app locally.
- `npm run lint` — run ESLint across the repo.

## Coding Style & Naming Conventions
- Language: TypeScript + React; prefer function components and hooks.
- Indentation: 2 spaces; keep imports sorted logically (external → internal).
- Filenames: pages and feature components in PascalCase (`DoseCard.tsx`); UI primitives and hooks in kebab-case (`radio-group.tsx`, `use-mobile.tsx`).
- Styling: Tailwind CSS; co-locate minimal CSS in `src/index.css` or component-level when necessary.
- Linting: `eslint.config.js` (JS/TS recommended, React Hooks rules, refresh guard). Address warnings; CI should pass lint before merge.

## ESLint Rules
- Base config: `@eslint/js` recommended + `typescript-eslint` recommended for `**/*.{ts,tsx}`.
- Environment: Browser, ES2020 modules.
- Plugins: `react-hooks` (recommended rules) and `react-refresh`.
- Notable rules and expectations:
  - React Hooks: obey exhaustive-deps. Prefer `useCallback`/`useMemo` to stabilize deps over disabling the rule.
  - Fast Refresh: `react-refresh/only-export-components` is `warn` with `allowConstantExport: true`.
    - Files in `src/components/**` should only export components. Move helpers/constants to separate files if needed.
  - TypeScript hygiene:
    - Avoid `any` (`no-explicit-any`). Use specific types or `unknown` with narrowing.
    - Avoid empty interfaces that mirror supertypes (`no-empty-object-type`). Use a `type` alias instead.
    - Forbid `require()` in TS (`no-require-imports`). Use ESM `import`.
    - Do not use triple-slash refs for Vitest in tests; import from `vitest`.
  - Unused vars: `@typescript-eslint/no-unused-vars` is disabled in this repo to reduce noise, but prefer removing unused code.
- Commands:
  - Lint locally: `npm run lint`
  - CI treats ESLint errors as blocking; warnings are allowed but should be addressed when reasonable.

## Testing Guidelines
- No test runner is configured yet. If adding tests, use Vitest + React Testing Library.
- Suggested patterns: `*.test.ts` or `*.test.tsx` beside source files; aim for key logic and hooks first.
- Until tests land, verify changes via `npm run dev` and `npm run lint`.

## Commit & Pull Request Guidelines
- Commits: imperative, concise subject. Prefer Conventional Commits (e.g., `feat:`, `fix:`) and reference issues.
- PRs: include what/why, screenshots or clips for UI, notes on data/migrations, and manual QA steps. Ensure build and lint succeed.

## Security & Configuration Tips
- Do not commit secrets. Client env vars must be prefixed with `VITE_` (e.g., `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in `.env.local`.
- Database changes live in `supabase/migrations/`; coordinate migration order and rollbacks with the team.

