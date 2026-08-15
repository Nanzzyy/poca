from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings

_WEAK_JWT_SECRETS = {"", "dev-secret-change-in-prod", "change-this-to-a-random-secret", "secret", "changeme"}


class Settings(BaseSettings):
    # App
    app_name: str = "Poca - AI Tourism Companion"
    debug: bool = False
    api_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:3010,http://localhost:3007,http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004,http://localhost:3005,http://localhost:3006"

    # Database
    database_url: str = "postgresql+asyncpg://tourism:tourism@localhost:5432/tourism"
    database_url_sync: str = "postgresql://tourism:tourism@localhost:5432/tourism"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Auth — JWT_SECRET is required; a weak/predictable value will refuse to start.
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24  # deprecated — access token uses jwt_access_expiry_minutes now
    jwt_refresh_secret: str = ""
    jwt_access_expiry_minutes: int = 15
    jwt_refresh_expiry_days: int = 7
    cookie_secure: bool = False
    cookie_domain: str = ""

    @field_validator("jwt_secret")
    @classmethod
    def _validate_jwt_secret(cls, v: str) -> str:
        if v in _WEAK_JWT_SECRETS:
            raise ValueError("JWT_SECRET must be set to a strong random value")
        if len(v) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters long")
        return v

    @field_validator("jwt_refresh_secret")
    @classmethod
    def _validate_jwt_refresh_secret(cls, v: str) -> str:
        # Refresh secret defaults to the access secret when unset (single-secret mode).
        return v or ""

    @model_validator(mode="after")
    def _resolve_refresh_secret(self) -> "Settings":
        if not self.jwt_refresh_secret:
            self.jwt_refresh_secret = self.jwt_secret
        return self

    @field_validator("cors_origins")
    @classmethod
    def _validate_cors_origins(cls, v: str) -> str:
        origins = [o.strip() for o in v.split(",") if o.strip()]
        if any(o == "*" for o in origins):
            raise ValueError("CORS_ORIGINS must list specific origins, not '*'")
        return v

    # AI Provider (LiteLLM)
    ai_provider: str = "gemini"
    ai_model: str = "gemini/gemini-2.0-flash"
    ai_api_key: str = ""

    # Google Places
    google_places_api_key: str = ""

    model_config = {"env_file": ".env", "case_sensitive": False}


settings = Settings()
