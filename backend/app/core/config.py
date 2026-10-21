from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./.data/research.db"
    allowed_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    cookie_secure: bool = False
    demo_enabled: bool = True
    environment: str = "development"
    session_days: int = 7

    @model_validator(mode="after")
    def production_defaults(self):
        if self.environment == "production":
            if not self.cookie_secure or self.demo_enabled:
                raise ValueError("Production requires COOKIE_SECURE=true and DEMO_ENABLED=false")
            if not self.allowed_origins or any(
                not origin.startswith("https://") for origin in self.allowed_origins
            ):
                raise ValueError("Production requires explicit HTTPS ALLOWED_ORIGINS")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
