# CutCraft Studio

An original, CapCut-inspired local-first browser video editor. The feature branch now includes a basic editor and timeline; professional compositing, AI processing and MP4 rendering are still under development.

## Current editor (feature branch)

Open `/projects`, create a project, then select **Open editor**. The `/editor/:projectId` route includes:

- Import of local browser-supported video, audio, and image files into IndexedDB; media remains on this computer, in this browser profile.
- Separate visual, audio, and text timeline lanes; add, select, trim, split video/audio, duplicate and delete clips; reorder visual clips.
- HTML video/image preview with text overlays and basic audio-track monitoring, play/pause, timeline seek, zoom, keyboard shortcuts, and basic undo/redo.
- Autosaved project edit decisions in localStorage and a JSON edit-decision download. **The JSON does not include media files and is not a portable full-project backup.**

This editor is an early functional slice, **not a CapCut feature-complete clone**. Multi-source visual compositing, advanced keyframes, transitions/effects, waveform editing, proxy handling, AI tools, robust browser compatibility, optimized large-project performance, and real MP4 export remain future work. The frontend does not upload media to the API. Clearing browser storage removes local projects/media; back up original files separately.

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

The home route is a landing screen; project CRUD and the basic editor are available on the feature branch. Advanced effects, backend AI and rendering remain future stages. No backend is required to run the frontend.

## Backend foundation

The repository is no longer empty. The feature branch contains the frontend foundation and a local FastAPI API. AI processing and the professional timeline remain future implementation stages.

```sh
cd backend
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

Install FFmpeg (including ffprobe) on your machine. Open http://localhost:8000/docs for API documentation. Environment configuration uses CUTCRAFT_ prefixed process variables; .env.example is a reference, not automatically loaded. Run `ruff check app tests` and `python -m pytest -q` in backend. Tests use FFmpeg to generate a real audio fixture.

`GET /api/v1/health` checks API availability. `GET /api/v1/capabilities` reports installed tools and unavailable AI/render features. `GET /api/v1/media/{uuid}/metadata` probes a trusted local file at `storage/media/{uuid}/source.ext` relative to the backend working directory, or CUTCRAFT_MEDIA_ROOT. No uploads are accepted. Frontend Settings can query backend status with VITE_API_BASE_URL.

Alternatively `docker compose up --build` runs the API on localhost with a read-only media mount at repository-root storage/media. This is a local development service: authentication, tenant isolation, PostgreSQL, S3 uploads, rate limiting, hostile-media sandboxing, Redis/Celery queues and MP4 rendering must be implemented before public hosting. Docker configuration has not been runtime-validated unless explicitly reported.

## Windows local-first workflow

No login, PostgreSQL or cloud storage is required for the current frontend. Open /projects to create, search, rename, duplicate and delete local project metadata, then open a project in the editor. localStorage holds project metadata and clip decisions; IndexedDB stores imported media. Clearing browser site data deletes these records; different browsers and ports have separate storage. Duplicating a project currently duplicates the dashboard metadata, not its edit timeline.

Windows PowerShell:

```powershell
git clone https://github.com/amnas-cubixmet/capcut.git
cd capcut
git switch feat/frontend-editor
cd frontend
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open http://127.0.0.1:5173/projects. Keep the same browser and address to reopen saved projects. First installation needs internet; the current local project dashboard runs without the backend. Future video storage will use IndexedDB with explicit file backups. Windows execution has not been tested in this Linux environment.
