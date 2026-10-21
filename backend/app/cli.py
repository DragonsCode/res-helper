import argparse
import json
from pathlib import Path

from app.core.database import SessionLocal
from app.services.legacy import import_legacy


def main():
    parser = argparse.ArgumentParser(description="Re:Search maintenance commands")
    commands = parser.add_subparsers(dest="command", required=True)
    legacy = commands.add_parser("import-legacy", help="Import an unchanged Django SQLite snapshot")
    legacy.add_argument("--source", type=Path, required=True)
    args = parser.parse_args()
    with SessionLocal() as db:
        print(json.dumps(import_legacy(db, args.source), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
