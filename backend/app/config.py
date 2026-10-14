from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    media_root: Path = Path("storage/media")
    frontend_origin: str = "http://localhost:5173"
    model_config = SettingsConfigDict(env_prefix="CUTCRAFT_")
