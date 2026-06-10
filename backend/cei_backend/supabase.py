from __future__ import annotations

from collections.abc import Iterator
from typing import Any

import httpx

from .config import Settings


class SupabaseReader:
    """Small read-only PostgREST client for deterministic processing jobs."""

    def __init__(self, settings: Settings, page_size: int = 1000) -> None:
        self.page_size = page_size
        self.client = httpx.Client(
            base_url=f"{settings.supabase_url}/rest/v1",
            headers={
                "apikey": settings.supabase_key,
                "Authorization": f"Bearer {settings.supabase_key}",
            },
            timeout=60,
        )

    def close(self) -> None:
        self.client.close()

    def __enter__(self) -> "SupabaseReader":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    def pages(
        self,
        resource: str,
        *,
        select: str = "*",
        params: dict[str, str] | None = None,
    ) -> Iterator[list[dict[str, Any]]]:
        query = {"select": select, **(params or {})}
        for offset in range(0, 10_000_000, self.page_size):
            response = self.client.get(
                f"/{resource}",
                params=query,
                headers={"Range": f"{offset}-{offset + self.page_size - 1}"},
            )
            response.raise_for_status()
            rows = response.json()
            if not rows:
                return
            yield rows
            if len(rows) < self.page_size:
                return

    def all(
        self,
        resource: str,
        *,
        select: str = "*",
        params: dict[str, str] | None = None,
    ) -> list[dict[str, Any]]:
        return [row for page in self.pages(resource, select=select, params=params) for row in page]

    def one(
        self,
        resource: str,
        *,
        select: str = "*",
        params: dict[str, str] | None = None,
    ) -> dict[str, Any] | None:
        rows = self.all(resource, select=select, params={**(params or {}), "limit": "1"})
        return rows[0] if rows else None

    def rpc(self, function: str) -> dict[str, Any]:
        response = self.client.post(f"/rpc/{function}", json={})
        response.raise_for_status()
        return response.json()
