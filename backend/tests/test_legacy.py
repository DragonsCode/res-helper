import base64
import hashlib
import sqlite3
from pathlib import Path

from sqlalchemy import func, select

from app.core.security import verify_password
from app.models import Comment, Discussion, User
from app.services.legacy import import_legacy


def test_legacy_import_preserves_source_and_is_idempotent(app):
    source = Path(__file__).resolve().parents[2] / "legacy/django/db.sqlite3"
    before = hashlib.sha256(source.read_bytes()).digest()
    with sqlite3.connect(f"{source.as_uri()}?mode=ro", uri=True) as old:
        users = old.execute("SELECT count(*) FROM auth_user").fetchone()[0]
        posts = old.execute("SELECT count(*) FROM helper_post").fetchone()[0]
        comments = old.execute("SELECT count(*) FROM helper_postcomments").fetchone()[0]
    with app.state.db_factory() as db:
        first = import_legacy(db, source)
        second = import_legacy(db, source)
        assert not first["already_imported"]
        assert second["already_imported"]
        assert first["workspace_id"] == second["workspace_id"]
        assert db.scalar(select(func.count()).select_from(User)) == users
        assert db.scalar(select(func.count()).select_from(Discussion)) == posts
        assert db.scalar(select(func.count()).select_from(Comment)) >= comments
    assert hashlib.sha256(source.read_bytes()).digest() == before


def test_django_password_compatibility():
    expected = base64.b64encode(hashlib.pbkdf2_hmac(
        "sha256", b"legacy password", b"legacy-salt", 600000,
    )).decode()
    encoded = f"pbkdf2_sha256$600000$legacy-salt${expected}"
    assert verify_password("legacy password", encoded)
    assert not verify_password("wrong password", encoded)
