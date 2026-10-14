import shutil
from uuid import UUID
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .config import Settings
from .engine import EngineUnavailable, InvalidMedia, probe, resolve_media


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    app = FastAPI(title="CutCraft API", version="0.1.0")
    app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_origin],
                       allow_methods=["GET"], allow_headers=["Content-Type"])

    @app.get("/api/v1/health")
    def health():
        return {"status": "ok", "version": "0.1.0"}

    @app.get("/api/v1/capabilities")
    def capabilities():
        return {
            "media_probe": bool(shutil.which("ffprobe")),
            "ffmpeg_installed": bool(shutil.which("ffmpeg")),
            "auto_edit": False, "captions": False, "noise_reduction": False,
            "render": False,
            "reason": "AI workers and render queue are not implemented yet",
        }

    @app.get("/api/v1/media/{media_id}/metadata")
    def metadata(media_id: UUID):
        try:
            return probe(resolve_media(settings.media_root, media_id))
        except FileNotFoundError as exc:
            raise HTTPException(404, "Media not found") from exc
        except EngineUnavailable as exc:
            raise HTTPException(503, str(exc)) from exc
        except InvalidMedia as exc:
            raise HTTPException(422, str(exc)) from exc

    return app


app = create_app()
