"""Unit tests for app.core.config (M1-02).

`_env_file=None` makes Settings ignore any developer's real backend/.env, so each test
only sees the values it sets. `monkeypatch` changes environment variables for one test
and restores them afterwards.
"""

from collections.abc import Iterator
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.core.config import Settings, SettingsError, get_settings

LOCAL_URL = (
    "postgresql+psycopg://milk_user:super_secret_pw@localhost:5432/milk_delivery"
)
SETTINGS_VARS = ["DATABASE_URL", "CORS_ORIGINS", "LOG_LEVEL", "APP_ENV"]


@pytest.fixture
def clean_env(monkeypatch: pytest.MonkeyPatch) -> Iterator[pytest.MonkeyPatch]:
    """Removes every settings variable and clears the get_settings() cache around the test."""
    for name in SETTINGS_VARS:
        monkeypatch.delenv(name, raising=False)
    get_settings.cache_clear()
    yield monkeypatch
    get_settings.cache_clear()


def test_reads_values_from_environment_variables(clean_env: pytest.MonkeyPatch) -> None:
    clean_env.setenv("DATABASE_URL", LOCAL_URL)
    clean_env.setenv("CORS_ORIGINS", "http://localhost:5173")
    clean_env.setenv("LOG_LEVEL", "DEBUG")
    clean_env.setenv("APP_ENV", "production")

    settings = Settings(_env_file=None)

    assert settings.database_url.get_secret_value() == LOCAL_URL
    assert settings.cors_origins == ["http://localhost:5173"]
    assert settings.log_level == "DEBUG"
    assert settings.app_env == "production"


def test_missing_database_url_raises_validation_error(
    clean_env: pytest.MonkeyPatch,
) -> None:
    with pytest.raises(ValidationError) as caught:
        Settings(_env_file=None)

    assert caught.value.errors()[0]["loc"] == ("database_url",)
    assert caught.value.errors()[0]["type"] == "missing"


def test_get_settings_fails_fast_with_a_readable_message(
    clean_env: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    clean_env.chdir(tmp_path)  # a folder without a .env file
    with pytest.raises(SettingsError) as caught:
        get_settings()

    message = str(caught.value)
    assert "DATABASE_URL is not set" in message
    assert ".env.example" in message


def test_defaults_for_optional_values(clean_env: pytest.MonkeyPatch) -> None:
    clean_env.setenv("DATABASE_URL", LOCAL_URL)

    settings = Settings(_env_file=None)

    assert settings.cors_origins == ["http://localhost:5173"]
    assert settings.log_level == "INFO"
    assert settings.app_env == "local"


def test_reads_from_a_dotenv_file_and_real_env_vars_win(
    clean_env: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text(
        f"DATABASE_URL={LOCAL_URL}\nLOG_LEVEL=WARNING\n", encoding="utf-8"
    )
    clean_env.setenv("LOG_LEVEL", "ERROR")  # a real environment variable

    settings = Settings(_env_file=env_file)

    assert settings.database_url.get_secret_value() == LOCAL_URL  # from .env
    assert settings.log_level == "ERROR"  # the environment variable wins over .env


def test_cors_origins_accepts_comma_separated_list(
    clean_env: pytest.MonkeyPatch,
) -> None:
    clean_env.setenv("DATABASE_URL", LOCAL_URL)
    clean_env.setenv(
        "CORS_ORIGINS", "http://localhost:5173, https://milk.example.com ,"
    )

    settings = Settings(_env_file=None)

    assert settings.cors_origins == [
        "http://localhost:5173",
        "https://milk.example.com",
    ]


def test_case_is_normalised(clean_env: pytest.MonkeyPatch) -> None:
    clean_env.setenv("DATABASE_URL", LOCAL_URL)
    clean_env.setenv("LOG_LEVEL", "info")
    clean_env.setenv("APP_ENV", "Local")

    settings = Settings(_env_file=None)

    assert (settings.log_level, settings.app_env) == ("INFO", "local")


def test_password_is_never_printed(clean_env: pytest.MonkeyPatch) -> None:
    clean_env.setenv("DATABASE_URL", LOCAL_URL)

    settings = Settings(_env_file=None)

    for text in (repr(settings), str(settings), str(settings.model_dump())):
        assert "super_secret_pw" not in text


def test_invalid_values_are_rejected_without_leaking_the_url(
    clean_env: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    clean_env.chdir(tmp_path)
    clean_env.setenv("DATABASE_URL", "mysql://root:super_secret_pw@db/milk")
    clean_env.setenv("LOG_LEVEL", "LOUD")

    with pytest.raises(SettingsError) as caught:
        get_settings()

    message = str(caught.value)
    assert "DATABASE_URL" in message and "PostgreSQL" in message
    assert "LOG_LEVEL" in message
    assert "super_secret_pw" not in message
    # pydantic's own error (which can echo the input value) is hidden.
    assert caught.value.__cause__ is None


def test_get_settings_is_cached(clean_env: pytest.MonkeyPatch, tmp_path: Path) -> None:
    clean_env.chdir(tmp_path)
    clean_env.setenv("DATABASE_URL", LOCAL_URL)

    assert get_settings() is get_settings()  # same object: read once, then reused
