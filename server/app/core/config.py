# import os
# from dotenv import load_dotenv

# load_dotenv()

# OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_EXPIRE_DAYS: int = 7

    model_config = SettingsConfigDict(extra="allow", env_file=".env")

    # class Config:
    #     env_file = ".env"


settings = Settings()