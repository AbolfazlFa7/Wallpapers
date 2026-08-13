import os
import sys
import json
import hashlib
from pathlib import Path
import requests
from colorama import init, Fore, Style

init(autoreset=True)

class FreeImageHost:
    BASE_URL = "https://freeimage.host/api/1/upload"

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.session = requests.Session()

    def upload_from_file(self, file_path: str | Path) -> dict:
        file_path = Path(file_path)
        if not file_path.exists():
            return {"error": f"File {file_path} does not exist"}

        allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
        if file_path.suffix.lower() not in allowed_extensions:
            return {"error": f"Format {file_path.suffix} not supported."}

        try:
            with open(file_path, "rb") as f:
                files = {"source": (file_path.name, f, f"image/{file_path.suffix[1:].lower()}")}
                data = {"key": self.api_key, "action": "upload", "format": "json"}
                response = self.session.post(self.BASE_URL, files=files, data=data)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            return {"error": str(e)}
