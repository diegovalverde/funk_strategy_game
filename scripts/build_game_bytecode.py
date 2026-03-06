#!/usr/bin/env python3

from pathlib import Path
import shutil
import subprocess
import sys


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    funk_repo = repo_root.parent / "funk"
    source_path = repo_root / "funk" / "game.f"
    public_dir = repo_root / "web" / "public"
    build_dir = repo_root / "build" / "funk"

    if not funk_repo.exists():
        print(f"missing Funk repo at {funk_repo}", file=sys.stderr)
        return 1

    public_dir.mkdir(parents=True, exist_ok=True)
    build_dir.mkdir(parents=True, exist_ok=True)

    compiler_python = shutil.which("python3.11") or sys.executable

    cmd = [
        compiler_python,
        str(funk_repo / "funky.py"),
        str(source_path),
        "--backend",
        "bytecode",
        "--build-dir",
        str(build_dir),
        "--include",
        str(source_path.parent),
        str(funk_repo / "stdlib"),
    ]
    subprocess.run(cmd, check=True, cwd=funk_repo)

    compiled = build_dir / "game.fkb"
    if not compiled.exists():
        print(f"expected bytecode artifact at {compiled}", file=sys.stderr)
        return 1

    shutil.copy2(compiled, public_dir / "game.fkb")
    print(f"wrote {public_dir / 'game.fkb'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
