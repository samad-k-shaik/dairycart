"""Application settings, loaded from environment variables (Twelve-Factor: config in the environment).

Values come from, in order of priority:
1. real environment variables (Docker, Cloud Run, CI, your shell);
2. a local ``backend/.env`` file (git-ignored; copy it from ``.env.example``);
3. the defaults below (only for non-secret values).

``DATABASE_URL`` has no default on purpose: the app must not start without it.
"""

from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, SecretStr, ValidationError, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
AppEnv = Literal["local", "test", "production"]


class Settings(BaseSettings):
    """Typed, validated configuration. Field names map to UPPER_CASE env vars
    (``database_url`` ← ``DATABASE_URL``)."""

    model_config = SettingsConfigDict(
        env_file=".env",  # relative to where the app is started: run from backend/
        env_file_encoding="utf-8",
        extra="ignore",  # ignore unrelated variables in .env or the environment
    )

    # SecretStr: printing or logging the settings shows '**********', never the password.
    # Use settings.database_url.get_secret_value() only where the real URL is needed (M1-04).
    database_url: SecretStr

    # NoDecode: read the raw text so "a,b" works (pydantic-settings would expect JSON).
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default=["http://localhost:5173"]
    )

    log_level: LogLevel = "INFO"
    app_env: AppEnv = "local"

    @field_validator("database_url")
    @classmethod
    def must_be_postgresql(cls, value: SecretStr) -> SecretStr:
        # Message never includes the value (it contains the password).
        if not value.get_secret_value().startswith(
            ("postgresql://", "postgresql+psycopg://")
        ):
            raise ValueError(
                "must be a PostgreSQL URL starting with postgresql+psycopg://"
            )
        return value

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: object) -> object:
        # Accept "http://a,http://b" (easy to type) as well as a real list.
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("log_level", mode="before")
    @classmethod
    def upper_case_level(cls, value: object) -> object:
        # LOG_LEVEL=info → "INFO"
        return value.strip().upper() if isinstance(value, str) else value

    @field_validator("app_env", mode="before")
    @classmethod
    def lower_case_env(cls, value: object) -> object:
        # APP_ENV=Local → "local"
        return value.strip().lower() if isinstance(value, str) else value


class SettingsError(RuntimeError):
    """Configuration is missing or invalid. The message says which variable and how to fix it."""


def _readable(error: ValidationError) -> str:
    """Turns a pydantic ValidationError into short lines WITHOUT the input values (no secrets)."""
    lines = []
    for item in error.errors():
        variable = str(item["loc"][0]).upper() if item["loc"] else "SETTINGS"
        problem = "is not set" if item["type"] == "missing" else item["msg"]
        lines.append(f"  - {variable} {problem}")
    return "\n".join(lines)


@lru_cache
def get_settings() -> Settings:
    """Returns the settings, read once and then reused (cached).

    Fails fast with a readable SettingsError if configuration is missing or invalid,
    so the app never starts half-configured.
    """
    try:
        return Settings()  # no arguments: every value comes from the environment / .env
    except ValidationError as error:
        raise SettingsError(
            "Invalid or missing configuration:\n"
            f"{_readable(error)}\n"
            "Set the variable(s) in the environment, or copy backend/.env.example to backend/.env."
        ) from None  # `from None`: hide pydantic's detail, which can echo the secret value
