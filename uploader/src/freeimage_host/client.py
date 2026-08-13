import requests
from pathlib import Path

class FreeImageHostClient:
    BASE_URL = "https://freeimage.host/api/1/upload"

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.session = requests.Session()

    def upload_file(self, file_path: str | Path) -> dict:
        file_path = Path(file_path)
        if not file_path.exists():
            return {"error": f"File {file_path} does not exist"}

        try:
            with open(file_path, "rb") as f:
                files = {"source": (file_path.name, f, f"image/{file_path.suffix[1:].lower()}")}
                data = {"key": self.api_key, "action": "upload", "format": "json"}
                response = self.session.post(self.BASE_URL, files=files, data=data, timeout=30)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            return {"error": str(e)}

    def upload_url(self, image_url: str) -> dict:
        try:
            data = {"key": self.api_key, "action": "upload", "format": "json", "source": image_url}
            response = self.session.post(self.BASE_URL, data=data, timeout=30)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": str(e)}
