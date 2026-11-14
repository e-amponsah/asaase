"""Download GCOV files with a NASA Earthdata login.

Credentials come from ~/.netrc (or _netrc on Windows) or EARTHDATA_USERNAME / EARTHDATA_PASSWORD.
Never commit them.
"""

from __future__ import annotations

from pathlib import Path

import earthaccess

from .config import RAW_DIR
from .search import Scene


def download(scenes: list[Scene], story_id: str) -> list[Path]:
    out_dir = RAW_DIR / story_id
    out_dir.mkdir(parents=True, exist_ok=True)
    todo = [s for s in scenes if not (out_dir / s.file_name).exists()]
    if todo:
        earthaccess.login(strategy="environment" if _env_creds() else "netrc")
        earthaccess.download([s.url for s in todo], local_path=str(out_dir))
    return [out_dir / s.file_name for s in scenes]


def open_remote(scenes: list[Scene]) -> list:
    """File-like objects that read only the bytes we touch (no full download)."""
    earthaccess.login(strategy="environment" if _env_creds() else "netrc")
    return earthaccess.open([s.url for s in scenes])


def _env_creds() -> bool:
    import os

    return bool(os.environ.get("EARTHDATA_USERNAME") and os.environ.get("EARTHDATA_PASSWORD"))
