from pathlib import Path

from cei_backend.export import _write_jsonl


def test_write_jsonl_preserves_unicode(tmp_path: Path) -> None:
    output = tmp_path / "records.jsonl"
    assert _write_jsonl(output, [{"title": "Résolution", "year": None}]) == 1
    assert output.read_text(encoding="utf-8") == '{"title":"Résolution","year":null}\n'
