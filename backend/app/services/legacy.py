"""Read-only, transactional import of a Django database snapshot."""
import hashlib
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Comment, Discussion, LegacyMapping, Membership, User, Vote, Workspace


def import_legacy(db: Session, source: Path) -> dict:
    source = source.resolve(strict=True)
    fingerprint = hashlib.sha256(source.read_bytes()).hexdigest()
    prefix = f"django:{fingerprint}"
    workspace_key = f"{prefix}:workspace"
    existing = db.get(LegacyMapping, workspace_key)
    if existing:
        return {"already_imported": True, "workspace_id": existing.target_id}

    connection = sqlite3.connect(f"{source.as_uri()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    try:
        legacy_users = connection.execute("SELECT * FROM auth_user ORDER BY id").fetchall()
        if not legacy_users:
            raise ValueError("The source snapshot has no users; there is no workspace owner.")
        if not any(row["is_active"] for row in legacy_users):
            raise ValueError("The source snapshot has no active users; no owner can sign in.")
        workspace = Workspace(
            name="Re:Search · архив хакатона",
            description="Материалы команды, перенесённые из Django. Оригинальный снимок сохранён в legacy/django.",
        )
        db.add(workspace)
        db.flush()
        user_map, discussion_map = {}, {}
        owner = next((row for row in legacy_users if row["is_active"] and row["is_superuser"]),
                     next(row for row in legacy_users if row["is_active"]))
        for row in legacy_users:
            email = (row["email"] or f'legacy-{row["id"]}@archive.invalid').strip().lower()
            if db.scalar(select(User).where(User.email == email)):
                raise ValueError("A source email already exists in the destination; refusing to merge identities.")
            user = User(
                email=email,
                name=f'{row["first_name"]} {row["last_name"]}'.strip() or row["username"],
                legacy_username=row["username"],
                password_hash=row["password"], is_active=bool(row["is_active"]),
                created_at=parse_datetime(row["date_joined"]),
            )
            db.add(user)
            db.flush()
            user_map[row["id"]] = user.id
            db.add(Membership(
                workspace_id=workspace.id, user_id=user.id,
                role="owner" if row["id"] == owner["id"] else "member",
            ))
        counts = {"users": len(user_map), "discussions": 0, "comments": 0, "edit_requests": 0, "positive_votes": 0}
        for row in connection.execute("SELECT * FROM helper_post ORDER BY id"):
            discussion = Discussion(
                workspace_id=workspace.id, author_id=user_map[row["author_id"]],
                title=row["title"], body=row["content"], kind="discussion",
                tags=[row["sphere"]] if row["sphere"] else [],
                created_at=parse_datetime(row["date_posted"]),
            )
            db.add(discussion)
            db.flush()
            discussion_map[row["id"]] = discussion.id
            counts["discussions"] += 1
        for row in connection.execute("SELECT * FROM helper_postcomments ORDER BY id"):
            db.add(Comment(
                discussion_id=discussion_map[row["post_id"]], author_id=user_map[row["author_id"]],
                body=row["content"], created_at=parse_datetime(row["date_posted"]),
            ))
            counts["comments"] += 1
        for row in connection.execute("SELECT * FROM helper_requestpostedit ORDER BY id"):
            status = "принято" if row["accepted"] else "не принято"
            db.add(Comment(
                discussion_id=discussion_map[row["post_id"]], author_id=user_map[row["author_id"]],
                body=f'Предложение правки из архива ({status}):\n\n{row["content"]}',
            ))
            counts["edit_requests"] += 1
        for row in connection.execute("SELECT * FROM helper_liked WHERE rating = 1"):
            key = (user_map[row["author_id"]], discussion_map[row["post_id"]])
            if not db.get(Vote, key):
                db.add(Vote(user_id=key[0], discussion_id=key[1]))
                db.flush()
                counts["positive_votes"] += 1
        db.add(LegacyMapping(source_key=workspace_key, target_id=workspace.id))
        db.commit()
        return {"already_imported": False, "workspace_id": workspace.id, **counts}
    except Exception:
        db.rollback()
        raise
    finally:
        connection.close()


def parse_datetime(value: str) -> datetime:
    result = datetime.fromisoformat(value)
    return result if result.tzinfo else result.replace(tzinfo=UTC)
