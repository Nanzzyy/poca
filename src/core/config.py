from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    app_name: str = "Poca - AI Tourism Companion"
    debug: bool = True
    api_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:3007,http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004,http://localhost:3005,http://localhost:3006"

    # Database
    database_url: str = "postgresql+asyncpg://tourism:tourism@localhost:5432/tourism"
    database_url_sync: str = "postgresql://tourism:tourism@localhost:5432/tourism"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Auth
    jwt_secret: str = "dev-secret-change-in-prod"
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24

    # AI Provider (LiteLLM)
    ai_provider: str = "gemini"
    ai_model: str = "gemini/gemini-2.0-flash"
    ai_api_key: str = ""

    # Google OAuth
    google_client_id: str = ""

    # Google Places
    google_places_api_key: str = ""

    model_config = {"env_file": ".env", "case_sensitive": False}


settings = Settings()
