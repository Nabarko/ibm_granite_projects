"""
Granite Speech transcription service.

The MLX model is loaded once at startup via initialize() and reused across all requests.
Audio preprocessing converts any uploaded format to 16kHz mono WAV using librosa before
passing to the model — Granite Speech requires exactly this format.
"""

import logging
import os
import tempfile
from pathlib import Path

import librosa
import soundfile as sf
from mlx_audio.stt.generate import generate_transcription  # type: ignore[import-untyped]
from mlx_audio.stt.utils import load_model  # type: ignore[import-untyped]

from src.utils.config import settings

logger = logging.getLogger(__name__)

# Module-level singleton — loaded once, reused forever
_speech_model = None
_model_loaded: bool = False


def initialize() -> None:
    """
    Load the MLX Granite Speech model into module-level state.
    Called once at FastAPI startup via lifespan — blocks until model is ready.
    Raises RuntimeError on non-Apple-Silicon machines where mlx_audio is unavailable.
    """
    global _speech_model, _model_loaded

    if _model_loaded:
        logger.info("Speech model already loaded, skipping.")
        return

    logger.info(f"Loading speech model: {settings.speech_model_id}")
    try:
        _speech_model = load_model(settings.speech_model_id)
        _model_loaded = True
        logger.info("Speech model loaded successfully.")
    except ImportError as e:
        raise RuntimeError(
            "mlx_audio is not available. IBM Granite Speech requires Apple Silicon (M1/M2/M3)."
        ) from e
    except Exception as e:
        logger.error(f"Failed to load speech model: {e}")
        raise RuntimeError(f"Speech model initialization failed: {e}") from e


def preprocess_audio(audio_bytes: bytes, filename: str) -> str:
    """
    Convert uploaded audio bytes → 16kHz mono PCM WAV temp file path.

    Supports any format librosa can read: WAV, MP3, M4A, OGG, FLAC, WebM.
    MP3/M4A/WebM require ffmpeg to be installed (brew install ffmpeg).

    Returns the path to the temp WAV file. Caller must delete it after use.
    """
    suffix = Path(filename).suffix.lower() or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_in:
        tmp_in.write(audio_bytes)
        tmp_in_path = tmp_in.name

    try:
        audio_array, _ = librosa.load(
            tmp_in_path,
            sr=settings.target_sample_rate,
            mono=True,
        )
    finally:
        os.unlink(tmp_in_path)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_out:
        tmp_out_path = tmp_out.name

    sf.write(tmp_out_path, audio_array, settings.target_sample_rate, subtype="PCM_16")
    logger.debug(
        f"Preprocessed audio: {len(audio_array) / settings.target_sample_rate:.2f}s "
        f"at {settings.target_sample_rate}Hz mono"
    )
    return tmp_out_path


def transcribe(audio_bytes: bytes, filename: str) -> str:
    """
    Preprocess the uploaded audio and run Granite Speech transcription.
    Returns the transcription string.
    """
    if not _model_loaded or _speech_model is None:
        raise RuntimeError("Speech model is not initialized. Call initialize() first.")

    wav_path = preprocess_audio(audio_bytes, filename)
    try:
        result = generate_transcription(_speech_model, wav_path)
        transcription = result.text if hasattr(result, "text") else str(result)
        return transcription.strip()
    finally:
        os.unlink(wav_path)
