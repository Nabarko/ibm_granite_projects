import logging
import time

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from src.utils.config import settings
from src.schemas.models import AnalyzeResponse, ErrorResponse
from src.service import model_connector, analysis_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["speech-analysis"])


@router.get("/health", summary="Health check")
async def health() -> dict:
    return {"status": "ok", "version": settings.app_version}


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid audio file"},
        422: {"model": ErrorResponse, "description": "Empty transcription result"},
        500: {"model": ErrorResponse, "description": "Model inference error"},
        503: {"model": ErrorResponse, "description": "Models not yet loaded"},
    },
    summary="Analyze audio file",
    description=(
        "Upload an audio file (WAV, MP3, M4A, OGG, FLAC, WebM). "
        "Returns transcription, summary, sentiment percentages, keywords, and processing time."
    ),
)
async def analyze_audio(
    audio_file: UploadFile = File(..., description="Audio file to analyze"),
) -> AnalyzeResponse:
    start_time = time.perf_counter()

    # Validate file size
    audio_bytes = await audio_file.read()
    if len(audio_bytes) > settings.max_audio_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {settings.max_audio_size_bytes // (1024 * 1024)} MB.",
        )
    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    # Permissive MIME check — librosa handles actual format detection
    allowed_content_types = {
        "audio/wav", "audio/wave", "audio/x-wav",
        "audio/mpeg", "audio/mp3",
        "audio/mp4", "audio/x-m4a", "audio/aac",
        "audio/ogg", "audio/flac", "audio/x-flac",
        "audio/webm",
        "application/octet-stream",  # Some browsers send this for WAV files
    }
    if audio_file.content_type and audio_file.content_type not in allowed_content_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {audio_file.content_type}",
        )

    filename = audio_file.filename or "upload.wav"

    try:
        # Step 1: Transcribe via Granite Speech (MLX)
        logger.info(f"Transcribing: {filename} ({len(audio_bytes)} bytes)")
        transcription = model_connector.transcribe(audio_bytes, filename)

        if not transcription:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Transcription returned empty result. Audio may be silent or inaudible.",
            )

        # Step 2: NLP analysis (sentiment + keywords + summary)
        logger.info("Running NLP analysis...")
        analysis = analysis_service.analyze(transcription)

        processing_time = round(time.perf_counter() - start_time, 3)
        logger.info(f"Analysis complete in {processing_time}s")

        return AnalyzeResponse(
            transcription=transcription,
            summary=analysis["summary"],
            sentiment=analysis["sentiment"],
            keywords=analysis["keywords"],
            processing_time=processing_time,
        )

    except RuntimeError as e:
        logger.error(f"Runtime error: {e}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Unexpected error analyzing {filename}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error during analysis: {str(e)}",
        )
