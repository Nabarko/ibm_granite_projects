"""
NLP Analysis Service: sentiment analysis, keyword extraction, summarization.

Uses lightweight statistical packages — no model downloads, no GPU required:
  - VADER      (vaderSentiment)  → rule-based sentiment scorer, returns pos/neg/neu %
  - YAKE       (yake)            → statistical keyword extractor, no embeddings needed
  - sumy + LSA (sumy)            → extractive summarization via Latent Semantic Analysis
"""

import logging

import nltk
import yake
from sumy.nlp.tokenizers import Tokenizer as SumyTokenizer
from sumy.parsers.plaintext import PlaintextParser
from sumy.summarizers.lsa import LsaSummarizer
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from src.utils.config import settings

logger = logging.getLogger(__name__)

_initialized: bool = False
_sentiment_analyzer: SentimentIntensityAnalyzer | None = None
_keyword_extractor: yake.KeywordExtractor | None = None
_summarizer: LsaSummarizer | None = None


def initialize() -> None:
    """
    Instantiate all three lightweight analysers once at FastAPI startup.
    Also downloads the NLTK punkt tokenizer data that sumy relies on.
    No model weights are downloaded — all three libraries are purely statistical.
    """
    global _initialized, _sentiment_analyzer, _keyword_extractor, _summarizer

    if _initialized:
        return

    logger.info("Initializing VADER sentiment analyser...")
    _sentiment_analyzer = SentimentIntensityAnalyzer()

    logger.info("Initializing YAKE keyword extractor...")
    _keyword_extractor = yake.KeywordExtractor(
        lan="en",
        n=2,            # extract up to 2-word phrases
        dedupLim=0.7,   # deduplicate similar phrases
        top=settings.max_keywords,
        features=None,
    )

    logger.info("Initializing sumy LSA summarizer...")
    # sumy's Tokenizer uses NLTK punkt — download quietly if not cached
    nltk.download("punkt", quiet=True)
    nltk.download("punkt_tab", quiet=True)
    _summarizer = LsaSummarizer()

    _initialized = True
    logger.info("All NLP analysers ready (VADER + YAKE + sumy).")


def get_sentiment(text: str) -> dict[str, float]:
    """
    VADER polarity scoring — returns pos / neg / neu as percentages (0–100).

    VADER scores sum to 1.0 across pos + neg + neu (the compound score is
    excluded here; we expose the three-class breakdown the UI expects).
    """
    if _sentiment_analyzer is None:
        raise RuntimeError("Analysis service not initialized.")

    scores = _sentiment_analyzer.polarity_scores(text)
    return {
        "positive": round(scores["pos"] * 100, 1),
        "negative": round(scores["neg"] * 100, 1),
        "neutral":  round(scores["neu"] * 100, 1),
    }


def get_keywords(text: str) -> list[str]:
    """
    YAKE keyword extraction — pure n-gram statistics, no embeddings.
    Returns a flat list of keyword strings sorted by relevance (best first).
    YAKE scores are inverse: lower score = more relevant.
    """
    if _keyword_extractor is None:
        raise RuntimeError("Analysis service not initialized.")

    raw = _keyword_extractor.extract_keywords(text)
    return [kw for kw, _score in raw]


def get_summary(text: str) -> str:
    """
    sumy LSA extractive summarization — picks the most informative sentences
    from the transcription without generating new text.
    For very short inputs (< 30 words) returns the text as-is.
    """
    if _summarizer is None:
        raise RuntimeError("Analysis service not initialized.")

    words = text.split()
    if len(words) < 30:
        return text

    parser = PlaintextParser.from_string(text, SumyTokenizer("english"))
    # Pick up to 3 sentences; fewer if the document is short
    sentence_count = min(3, max(1, len(parser.document.sentences) // 3))
    summary_sentences = _summarizer(parser.document, sentence_count)
    return " ".join(str(s) for s in summary_sentences) or text


def analyze(transcription: str) -> dict:
    """
    Run all three analyses on the transcription text.
    Returns a combined dict that maps directly to the AnalyzeResponse schema.
    """
    return {
        "sentiment": get_sentiment(transcription),
        "keywords":  get_keywords(transcription),
        "summary":   get_summary(transcription),
    }
