import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.utils.config import settings
from src.service import model_connector, analysis_service
from src.api.routes import router

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Load all models before the server accepts requests.
    Using lifespan (not @app.on_event) per FastAPI recommendation.
    """
    logger.info("=== IBM Granite Speech API starting up ===")
    logger.info("Initializing speech transcription model (MLX)...")
    model_connector.initialize()

    logger.info("Initializing NLP analysis models (CPU)...")
    analysis_service.initialize()

    logger.info("=== All models ready. Accepting requests. ===")
    yield
    logger.info("=== Shutting down. ===")


app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(router)
