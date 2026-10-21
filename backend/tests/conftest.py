import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.core.database import get_db, make_engine
from app.main import create_app


@pytest.fixture
def app(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'test.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setenv("DEMO_ENABLED", "true")
    monkeypatch.setenv("ENVIRONMENT", "development")
    get_settings.cache_clear()
    command.upgrade(Config("alembic.ini"), "head")
    engine = make_engine(url)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    application = create_app()

    def override():
        with factory() as db:
            yield db
    application.dependency_overrides[get_db] = override
    application.state.db_factory = factory
    yield application
    engine.dispose()
    get_settings.cache_clear()


@pytest.fixture
def client(app):
    with TestClient(app, headers={"X-Requested-With": "ReSearch"}) as client:
        yield client


def register(client, email="owner@example.org", audience="researcher"):
    response = client.post("/api/v1/auth/register", json={
        "name": "Test Researcher", "email": email,
        "password": "correct horse battery staple", "audience": audience,
    })
    assert response.status_code == 201, response.text
    body = response.json()
    return body["user"], f'/api/v1/workspaces/{body["workspaces"][0]["id"]}'
