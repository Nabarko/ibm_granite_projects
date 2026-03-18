from pydantic import BaseModel, Field


class SentimentResult(BaseModel):
    positive: float = Field(..., ge=0.0, le=100.0, description="% positive sentiment")
    negative: float = Field(..., ge=0.0, le=100.0, description="% negative sentiment")
    neutral: float = Field(..., ge=0.0, le=100.0, description="% neutral sentiment")


class AnalyzeResponse(BaseModel):
    transcription: str = Field(..., description="Raw transcription from Granite Speech")
    summary: str = Field(..., description="Abstractive summary of the transcription")
    sentiment: SentimentResult
    keywords: list[str] = Field(..., description="Top keywords influencing the sentiment")
    processing_time: float = Field(..., description="Total processing time in seconds")


class ErrorResponse(BaseModel):
    detail: str
    error_type: str | None = None
