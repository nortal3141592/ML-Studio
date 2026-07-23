from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8'
    )

    secret_key: SecretStr
    algorithm: str = 'HS256'
    access_token_expire_minutes: int = 180

    max_upload_size_bytes: int = 5 * 1024 * 1024

    train_split: int = 70
    cv_split: int = 15
    test_split: int = 15

    random_state: int = 42

    classification_unique_threshold: int = 20


settings = Settings() # pyright: ignore