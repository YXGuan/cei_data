from __future__ import annotations

from fastapi import FastAPI, HTTPException

from . import __version__
from .config import Settings
from .supabase import SupabaseReader

app = FastAPI(title="CEI Governance Data API", version=__version__)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": __version__}


@app.get("/v1/data/summary")
def data_summary() -> dict:
    with SupabaseReader(Settings.from_env()) as reader:
        return reader.rpc("dashboard_summary")


@app.get("/v1/statements/{statement_key}")
def statement(statement_key: str) -> dict:
    with SupabaseReader(Settings.from_env()) as reader:
        row = reader.one("statement_explorer", params={"statement_key": f"eq.{statement_key}"})
    if row is None:
        raise HTTPException(status_code=404, detail="Statement not found")
    return row
