from __future__ import annotations

import argparse
import json
from pathlib import Path

from .config import Settings
from .export import build_export, upload_export
from .supabase import SupabaseReader


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="cei-data")
    commands = parser.add_subparsers(dest="command", required=True)

    commands.add_parser("describe", help="Print the current database summary")

    export = commands.add_parser("export-hf", help="Build a Hugging Face-ready dataset directory")
    export.add_argument("--output", type=Path, default=Path("exports/huggingface/cei-governance-atlas"))
    export.add_argument("--parquet", action="store_true")

    upload = commands.add_parser("upload-hf", help="Upload an existing export directory")
    upload.add_argument("repo_id", help="Hugging Face dataset repository, for example org/dataset")
    upload.add_argument("--input", type=Path, default=Path("exports/huggingface/cei-governance-atlas"))
    upload.add_argument("--private", action="store_true")
    return parser


def main() -> None:
    args = _parser().parse_args()
    if args.command == "describe":
        with SupabaseReader(Settings.from_env()) as reader:
            print(json.dumps(reader.rpc("dashboard_summary"), indent=2))
    elif args.command == "export-hf":
        with SupabaseReader(Settings.from_env()) as reader:
            metadata = build_export(reader, args.output, parquet=args.parquet)
        print(json.dumps(metadata, indent=2))
    elif args.command == "upload-hf":
        upload_export(args.input, args.repo_id, private=args.private)
