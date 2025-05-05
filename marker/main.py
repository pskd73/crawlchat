from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict
from fastapi import FastAPI, Header, HTTPException
from markitdown import MarkItDown
import uuid
import base64
import os
from typing import Annotated

class Settings(BaseSettings):
  api_key: str

  model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
app = FastAPI()


class MarkRequest(BaseModel):
  base64: str


@app.post("/mark")
async def mark(mark_request: MarkRequest, x_api_key: Annotated[str | None, Header()] = None):
  if x_api_key != settings.api_key:
    raise HTTPException(status_code=401, detail="Unauthorized")

  id = str(uuid.uuid4())
  path = f"/tmp/{id}.pdf"
  with open(path, "wb") as f:
    f.write(base64.b64decode(mark_request.base64))

  md = MarkItDown(enable_plugins=False)
  result = md.convert(path)
  os.remove(path)
  return {
    "id": id, 
    "markdown": result.markdown, 
    "title": result.title
  }
  
