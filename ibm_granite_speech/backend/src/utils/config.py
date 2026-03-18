from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # Application
    app_title: str = "IBM Granite Speech API"
    app_version: str = "1.0.0"
    debug: bool = Field(default=False, env="DEBUG")

    # CORS — allow Next.js dev server and production origins
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        env="CORS_ORIGINS",
    )

    # Transcription model (Apple Silicon MLX)
    speech_model_id: str = Field(
        default="mlx-community/granite-4.0-1b-speech-8bit",
        env="SPEECH_MODEL_ID",
    )

    # Audio preprocessing
    target_sample_rate: int = 16000   # Granite Speech requires 16kHz mono

    # Analysis limits
    max_keywords: int = 7

    # Upload size limit: 50 MB
    max_audio_size_bytes: int = 50 * 1024 * 1024

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Module-level singleton — import this everywhere
settings = Settings()
