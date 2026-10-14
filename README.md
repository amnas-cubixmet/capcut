# CutCraft Studio

Original frontend foundation for a CapCut-inspired browser video editor. This stage does not implement video editing, AI processing or export.

## Local development

Use Node.js 22.12+ and npm. From the repository root:

```sh
cd frontend
npm ci
cp .env.example .env
npm run dev
```

Run `npm run lint`, `npm test`, and `npm run build` to validate. `npm run preview` serves the production bundle locally. Configure your production host to rewrite unknown routes to `index.html` for BrowserRouter.

## Foundation

React 19, strict TypeScript, Vite 7, Tailwind CSS 4, React Router 7, Zustand 5 and Lucide icons. Accessible dialog, tooltip and slider primitives use Radix UI. Dark theme tokens live in `src/styles.css`. Reduced-motion preferences persist locally; do not store credentials in this store. Vite variables are public browser configuration: never put secrets in `.env` or `VITE_*` variables.

Architecture: `components/ui` contains shared primitives; `pages`, `features`, `hooks`, `stores`, `types`, `services` and `utilities` reserve boundaries for upcoming stages. Each feature owns its UI and logic. Keep API calls in services and domain types independent of components.

CI runs installation, lint, interaction tests and production compilation on pushes and pull requests. Direct dependencies are pinned and `package-lock.json` locks transitive versions. CI uses `npm ci` for reproducible installation.

## Scope and next stages

The home route is a foundation landing screen, not a dashboard or editor. Preferences and the information dialog work. Dashboard project CRUD, IndexedDB media, timeline editing, effects, backend AI and rendering remain future stages. No backend is required to run this foundation.
