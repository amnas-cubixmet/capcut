import json
import shutil
import subprocess
from pathlib import Path
from uuid import UUID


class EngineUnavailable(Exception):
    pass


class InvalidMedia(Exception):
    pass


def resolve_media(root: Path, media_id: UUID) -> Path:
    # IDs, never user-supplied filesystem paths or URLs, cross the API boundary.
    directory = root.resolve() / str(media_id)
    candidates = list(directory.glob("source.*")) if directory.is_dir() else []
    candidates = [p for p in candidates if p.is_file() and not p.is_symlink()]
    if len(candidates) != 1 or not candidates[0].resolve().is_relative_to(root.resolve()):
        raise FileNotFoundError("Media not found")
    return candidates[0]


def run_engine(binary: str, arguments: list[str]) -> str:
    if not shutil.which(binary):
        raise EngineUnavailable(f"{binary} is not installed")
    try:
        result = subprocess.run(
            [binary, *arguments], capture_output=True, text=True, timeout=30, check=True
        )
    except subprocess.TimeoutExpired as exc:
        raise InvalidMedia("Media inspection exceeded the 30 second limit") from exc
    except subprocess.CalledProcessError as exc:
        raise InvalidMedia("Unsupported or corrupt media") from exc
    return result.stdout


def probe(path: Path) -> dict:
    output = run_engine("ffprobe", [
        "-v", "error", "-protocol_whitelist", "file,pipe", "-show_format",
        "-show_streams", "-of", "json", str(path)
    ])
    try:
        data = json.loads(output)
        return {
            "duration": float(data.get("format", {}).get("duration", 0)),
            "streams": [
                {key: stream[key] for key in (
                    "index", "codec_type", "codec_name", "width", "height", "sample_rate"
                ) if key in stream}
                for stream in data.get("streams", [])
            ],
        }
    except (ValueError, TypeError) as exc:
        raise InvalidMedia("Invalid probe response") from exc
