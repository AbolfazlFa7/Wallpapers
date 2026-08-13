from pathlib import Path
import json

STORAGE_ROOT = Path(__file__).parent.parent.parent / "data"

def get_storage_paths(device_type: str):
    device_dir = STORAGE_ROOT / device_type
    return {
        "dir": device_dir,
        "full": device_dir / "uploaded_full.json",
        "short": device_dir / "uploaded_short.json"
    }

def ensure_storage(device_type: str):
    paths = get_storage_paths(device_type)
    paths["dir"].mkdir(exist_ok=True, parents=True)
    if not paths["full"].exists():
        paths["full"].write_text("[]")
    if not paths["short"].exists():
        paths["short"].write_text(json.dumps({"count": 0, "total_size": "0 B", "total_size_bytes": 0, "items": []}, indent=4))

def load_full_db(device_type: str) -> list:
    ensure_storage(device_type)
    try:
        return json.loads(get_storage_paths(device_type)["full"].read_text())
    except Exception:
        return []

def save_full_db(device_type: str, data: list):
    ensure_storage(device_type)
    get_storage_paths(device_type)["full"].write_text(json.dumps(data, indent=4))

def append_to_full_db(device_type: str, item: dict):
    db = load_full_db(device_type)
    db.append(item)
    save_full_db(device_type, db)
    update_short_db(device_type)

def update_short_db(device_type: str):
    ensure_storage(device_type)
    full_data = load_full_db(device_type)
    items = []
    total_size = 0
    for item in full_data:
        img_obj = item.get("image", {})
        display_img = img_obj.get("image", {})
        size_bytes = img_obj.get("size", 0) or 0
        total_size += size_bytes
        items.append({
            "md_url": img_obj.get("display_url") or display_img.get("url"),
            "original_url": img_obj.get("url") or display_img.get("url"),
            "size": img_obj.get("size_formatted"),
            "size_bytes": size_bytes
        })
    
    def format_size(b):
        for unit in ['B', 'KB', 'MB', 'GB']:
            if b < 1024.0:
                return f"{b:.2f} {unit}" if unit != 'B' else f"{int(b)} B"
            b /= 1024.0
        return f"{b:.2f} TB"

    short_payload = {
        "count": len(items),
        "total_size": format_size(total_size),
        "total_size_bytes": total_size,
        "items": items
    }
    get_storage_paths(device_type)["short"].write_text(json.dumps(short_payload, indent=4))
