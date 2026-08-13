# Wallpaper Uploader Project

Python-based wallpaper/image uploader and tracker for FreeImageHost API supporting JPG, PNG, BMP, GIF, and WEBP.

## Dev Environment
- Python 3.11+ managed with `uv`.
- Virtual environment in `.venv/`.

## Usage
- Run uploader: `uv run main.py <path-to-folder-or-file>`
- Find missing files in DB compared to a folder (with `-w` flag): `uv run main.py <path-to-folder> -w`
- Update short list: `uv run main.py`

## Conventions
- Modular structure under `src/` (`client.py`, `hash_util.py`, `storage.py`, `freeimage_host/`).
- Persistent storage in `data/uploaded_full.json` and `data/uploaded_short.json`.
- Automatic retry queue for failed uploads, with duplicate prevention based on SHA-256 hash.
- Automatic sync of `uploaded_short.json` whenever `uploaded_full.json` updates.
