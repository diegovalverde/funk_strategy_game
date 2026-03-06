#!/usr/bin/env python3

from pathlib import Path
import shutil
import subprocess
import sys


def try_local_build(repo_root: Path) -> bool:
    web_dir = repo_root / "web"
    funk_repo = repo_root.parent / "funk"
    cmd = [
        "wasm-pack",
        "build",
        str(funk_repo / "crates" / "funk_wasm"),
        "--target",
        "web",
        "--out-dir",
        str(web_dir / "src" / "pkg"),
    ]
    try:
        subprocess.run(cmd, check=True, cwd=web_dir)
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False


def copy_prebuilt_pkg(repo_root: Path) -> bool:
    source = repo_root.parent / "funk" / "web" / "src" / "pkg"
    target = repo_root / "web" / "src" / "pkg"
    required = ["funk_wasm.js", "funk_wasm_bg.wasm", "package.json"]

    if not source.exists():
        return False
    if any(not (source / name).exists() for name in required):
        return False

    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(source, target)
    return True


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    if try_local_build(repo_root):
        print("built local funk_wasm package")
        return 0
    if copy_prebuilt_pkg(repo_root):
        print("copied prebuilt funk_wasm package from sibling Funk repo")
        return 0

    print(
        "unable to prepare web/src/pkg: local wasm build failed and no prebuilt pkg was found",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
