import sys
import argparse
from pathlib import Path
from colorama import init, Fore

sys.path.append(str(Path(__file__).parent.parent.absolute()))

from src.hash_util import compute_sha256
from src.storage import load_full_db, save_full_db, append_to_full_db, update_short_db
from src.freeimage_host.client import FreeImageHostClient

init(autoreset=True)

API_KEY = "6d207e02198a847aa98d0a2a901485a5"

def transform_response(resp: dict, sha256_hash: str) -> dict:
    img = resp.get("image", {})
    def clean_url(u):
        if not u: return None
        return u[6:-1] if isinstance(u, str) and u.startswith("@url:`") else u

    return {
        "sha256": sha256_hash,
        "image": {
            "extension": img.get("extension"),
            "width": img.get("width"),
            "height": img.get("height"),
            "size": img.get("size"),
            "time": 0,
            "expiration": 0,
            "is_animated": 0,
            "id_encoded": img.get("id_encoded"),
            "extension_name": img.get("extension"),
            "size_formatted": img.get("size_formatted"),
            "filename": img.get("filename"),
            "url": clean_url(img.get("url")),
            "url_short": "freeimage.host",
            "url_seo": clean_url(img.get("url")),
            "url_viewer": clean_url(img.get("url_viewer")),
            "url_viewer_preview": clean_url(img.get("url_viewer")),
            "url_viewer_thumb": clean_url(img.get("url_viewer")),
            "image": {
                "filename": img.get("filename"),
                "name": img.get("name"),
                "mime": img.get("mime"),
                "extension": img.get("extension"),
                "url": clean_url(img.get("display_url") or img.get("url")),
                "size": img.get("size")
            },
            "thumb": {
                "filename": img.get("thumb", {}).get("filename"),
                "name": img.get("thumb", {}).get("name"),
                "mime": img.get("thumb", {}).get("mime"),
                "extension": img.get("thumb", {}).get("extension"),
                "url": clean_url(img.get("thumb", {}).get("url"))
            },
            "medium": {
                "filename": img.get("medium", {}).get("filename"),
                "name": img.get("medium", {}).get("name"),
                "mime": img.get("medium", {}).get("mime"),
                "extension": img.get("medium", {}).get("extension"),
                "url": clean_url(img.get("medium", {}).get("url"))
            },
            "display_url": clean_url(img.get("display_url")),
            "display_width": img.get("width"),
            "display_height": img.get("height"),
            "how_long_ago": img.get("how_long_ago"),
            "date_fixed_peer": img.get("date")
        }
    }

def prompt_device_type() -> str:
    print(Fore.CYAN + "What kind of image content does this path contain for the following device types?")
    print(f"  {Fore.YELLOW}1.{Fore.RESET} PC")
    print(f"  {Fore.YELLOW}2.{Fore.RESET} Phone")
    choice = input(Fore.GREEN + "Enter choice (1 or 2): " + Fore.RESET).strip()
    if choice == "1":
        return "pc"
    elif choice == "2":
        return "phone"
    else:
        print(Fore.RED + "Error: Invalid choice entered. Exiting program.")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("path", nargs="?")
    parser.add_argument("-w", action="store_true", help="Show files in DB not present in input folder")
    args = parser.parse_args()

    if not args.path:
        print(Fore.CYAN + "Choose device database to update short list:")
        device_type = prompt_device_type()
        update_short_db(device_type)
        print(Fore.GREEN + f"Successfully updated short list for {device_type.upper()}.")
        return

    uploader = FreeImageHostClient(API_KEY)
    target = Path(args.path).resolve()
    
    device_type = prompt_device_type()

    if args.w:
        if not target.is_dir():
            print(Fore.RED + f"Error: Path '{args.path}' is not a valid directory.")
            return
        files_in_folder = {compute_sha256(p) for p in target.rglob("*") if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}}
        full_db = load_full_db(device_type)
        missing_files = [i for i in full_db if i.get("sha256") not in files_in_folder]
        
        if missing_files:
            print(Fore.CYAN + f"Files in DB ({device_type.upper()}) not present in folder '{target.name}':")
            for m in missing_files:
                filename = m.get('image', {}).get('filename', 'unknown')
                sha = m.get('sha256', 'unknown')
                print(f"  {Fore.YELLOW}- {filename} {Fore.RESET}-> {Fore.GREEN}`{sha}`")
            
            choice = input(Fore.YELLOW + "Do you wanna sync db with this folder? (y/n): " + Fore.RESET).strip().lower()
            if choice == 'y':
                updated_db = [i for i in full_db if i.get("sha256") in files_in_folder]
                save_full_db(device_type, updated_db)
                update_short_db(device_type)
                print(Fore.GREEN + "Database successfully synced with the folder.")
            else:
                print(Fore.CYAN + "Operation cancelled. Database not changed.")
        else:
            print(Fore.LIGHTGREEN_EX + f"All files in the database are present in the folder '{target.name}'! Everything is up to date.")
        return

    if target.is_file():
        files = [target]
        base_dir = target.parent
    elif target.is_dir():
        # sorted recursively
        files = sorted([p for p in target.rglob("*") if p.is_file()])
        base_dir = target
    else:
        print(Fore.RED + f"Path {target} does not exist.")
        return

    full_db = load_full_db(device_type)
    existing_hashes = {i.get("sha256") for i in full_db}

    queue = []
    for f in files:
        if f.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}:
            h = compute_sha256(f)
            rel_path = f.relative_to(base_dir) if target.is_dir() else f.name
            if h in existing_hashes:
                print(Fore.YELLOW + f"Skipping duplicate (already in db): {rel_path}")
            else:
                queue.append((f, h))

    while queue:
        f, h = queue.pop(0)
        rel_path = f.relative_to(base_dir) if target.is_dir() else f.name
        try:
            res = uploader.upload_file(f)
            if res.get("status_code") == 200:
                append_to_full_db(device_type, transform_response(res, h))
                print(Fore.GREEN + f"Success: {rel_path}")
            else:
                print(Fore.RED + f"Failed: {rel_path} - Retrying...")
                queue.append((f, h))
        except Exception as e:
            print(Fore.RED + f"Error: {rel_path} ({e}) - Retrying...")
            queue.append((f, h))

if __name__ == "__main__":
    main()
