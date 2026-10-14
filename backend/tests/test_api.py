import subprocess
from uuid import uuid4
from fastapi.testclient import TestClient
from app.config import Settings
from app.main import create_app


def test_health_and_capabilities(tmp_path):
    client = TestClient(create_app(Settings(media_root=tmp_path)))
    assert client.get("/api/v1/health").json()["status"] == "ok"
    assert client.get("/api/v1/capabilities").json()["captions"] is False


def test_missing_and_invalid_id(tmp_path):
    client = TestClient(create_app(Settings(media_root=tmp_path)))
    assert client.get(f"/api/v1/media/{uuid4()}/metadata").status_code == 404
    assert client.get("/api/v1/media/not-a-uuid/metadata").status_code == 422


def test_actual_ffprobe(tmp_path):
    media_id = uuid4()
    folder = tmp_path / str(media_id)
    folder.mkdir()
    subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i",
                    "sine=frequency=440:duration=1", str(folder / "source.wav")], check=True)
    client = TestClient(create_app(Settings(media_root=tmp_path)))
    response = client.get(f"/api/v1/media/{media_id}/metadata")
    assert response.status_code == 200
    assert abs(response.json()["duration"] - 1) < 0.05
    assert response.json()["streams"][0]["codec_type"] == "audio"


def test_symlink_rejected(tmp_path):
    media_id = uuid4()
    folder = tmp_path / str(media_id)
    folder.mkdir()
    (folder / "source.wav").symlink_to("/etc/passwd")
    client = TestClient(create_app(Settings(media_root=tmp_path)))
    assert client.get(f"/api/v1/media/{media_id}/metadata").status_code == 404


def test_corrupt_media(tmp_path):
    media_id = uuid4()
    folder = tmp_path / str(media_id)
    folder.mkdir()
    (folder / "source.wav").write_text("invalid audio")
    client = TestClient(create_app(Settings(media_root=tmp_path)))
    assert client.get(f"/api/v1/media/{media_id}/metadata").status_code == 422
