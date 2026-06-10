from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_key: str

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv(".env.local")
        load_dotenv()
        url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
        key = (
            os.getenv("SUPABASE_PUBLISHABLE_KEY")
            or os.getenv("SUPABASE_ANON_KEY")
            or os.getenv("VITE_SUPABASE_ANON_KEY")
        )
        if not url or not key:
            raise RuntimeError(
                "Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY "
                "(or the equivalent VITE_SUPABASE_* variables)."
            )
        return cls(supabase_url=url.rstrip("/"), supabase_key=key)
