from fastapi.testclient import TestClient

from tests.conftest import register


def test_authentication_password_sessions_and_logout(client):
    response = client.post("/api/v1/auth/register", json={
        "name": "Alex", "email": "alex@example.org", "password": "  a strong password  ",
        "audience": "journalist",
    })
    assert response.status_code == 201
    assert "HttpOnly" in response.headers["set-cookie"]
    assert "password" not in response.json()["user"]
    assert response.json()["user"]["audience"] == "journalist"
    cookie = client.cookies.get("research_session")
    assert client.get("/api/v1/auth/me").status_code == 200
    assert client.post("/api/v1/auth/logout").status_code == 204
    client.cookies.set("research_session", cookie)
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.post("/api/v1/auth/login", json={
        "identifier": "alex@example.org", "password": "wrong",
    }).status_code == 401
    assert client.post("/api/v1/auth/login", json={
        "identifier": "alex@example.org", "password": "  a strong password  ",
    }).status_code == 200


def test_csrf_and_origin_protection(app):
    with TestClient(app) as client:
        assert client.post("/api/v1/auth/demo", json={}).status_code == 403
        assert client.post("/api/v1/auth/demo", json={}, headers={
            "X-Requested-With": "ReSearch", "Origin": "https://attacker.invalid",
        }).status_code == 403
        assert client.post("/api/v1/auth/demo", json={}, headers={
            "X-Requested-With": "ReSearch", "Origin": "http://localhost:5173",
        }).status_code == 200


def test_project_task_progress_and_membership_validation(client):
    user, base = register(client)
    project = client.post(f"{base}/projects", json={
        "title": "City biodiversity", "field": "Ecology", "tags": ["Open data"],
    }).json()
    task_response = client.post(f"{base}/tasks", json={
        "title": "Collect observations", "project_id": project["id"], "assignee_id": user["id"],
    })
    assert task_response.status_code == 201
    task = task_response.json()
    assert client.patch(f'{base}/tasks/{task["id"]}', json={"status": "done"}).status_code == 200
    assert client.get(f'{base}/projects/{project["id"]}').json()["progress"] == 100
    assert client.get(f"{base}/overview").json()["completed_tasks"] == 1
    assert client.post(f"{base}/tasks", json={
        "title": "Invalid assignee", "assignee_id": "other-user",
    }).status_code == 422
    assert client.patch(f'{base}/tasks/{task["id"]}', json={"status": "arbitrary"}).status_code == 422


def test_tenant_isolation_for_reads_and_writes(app, client):
    _, base = register(client)
    project = client.post(f"{base}/projects", json={"title": "Private project"}).json()
    discussion = client.post(f"{base}/discussions", json={"title": "Private findings", "body": "Team only"}).json()
    resource = client.post(f"{base}/resources", json={"title": "Private dataset", "kind": "dataset"}).json()
    with TestClient(app, headers={"X-Requested-With": "ReSearch"}) as other:
        _, other_base = register(other, "outsider@example.org")
        for path in ["/overview", "/projects", "/resources", "/members", "/activity", "/search?q=Private"]:
            assert other.get(base + path).status_code == 404
        assert other.get(f'{other_base}/projects/{project["id"]}').status_code == 404
        assert other.post(f"{other_base}/tasks", json={
            "title": "Cross-tenant task", "project_id": project["id"],
        }).status_code == 404
        assert other.post(f'{other_base}/discussions/{discussion["id"]}/comments', json={"body": "Attack"}).status_code == 404
        assert other.put(f'{other_base}/resources/{resource["id"]}/bookmark').status_code == 404
        assert other.put(f'{other_base}/discussions/{discussion["id"]}/vote').status_code == 404
        assert other.get(other_base + "/search?q=Private").json() == []


def test_comments_votes_and_bookmarks_are_persistent_and_idempotent(client):
    _, base = register(client)
    discussion = client.post(f"{base}/discussions", json={
        "title": "Can we reproduce this?", "body": "Please share the protocol", "kind": "question",
    }).json()
    path = f'{base}/discussions/{discussion["id"]}'
    response = client.post(path + "/comments", json={"body": "Here are the methods."})
    assert response.status_code == 201
    assert response.json()["comments"][0]["body"] == "Here are the methods."
    for _ in range(2):
        assert client.put(path + "/vote").json()["votes"] == 1
    assert client.delete(path + "/vote").status_code == 204
    assert client.get(path).json()["votes"] == 0
    resource = client.post(f"{base}/resources", json={
        "title": "A source", "url": "https://doi.org/10.1038/sdata.2016.18",
    }).json()
    for _ in range(2):
        assert client.put(f'{base}/resources/{resource["id"]}/bookmark').json()["bookmarked"]
    assert client.delete(f'{base}/resources/{resource["id"]}/bookmark').status_code == 204
    assert not client.get(base + "/resources").json()[0]["bookmarked"]
    assert client.post(base + "/resources", json={"title": "Bad URL", "url": "javascript:alert(1)"}).status_code == 422


def test_invites_are_email_bound_single_use_and_viewers_cannot_write(app, client):
    _, base = register(client)
    response = client.post(base + "/invitations", json={"email": "viewer@example.org", "role": "viewer"})
    assert response.status_code == 201
    token = response.json()["token"]
    with TestClient(app, headers={"X-Requested-With": "ReSearch"}) as wrong:
        register(wrong, "wrong@example.org")
        assert wrong.post("/api/v1/invitations/accept", json={"token": token}).status_code == 403
    with TestClient(app, headers={"X-Requested-With": "ReSearch"}) as viewer:
        register(viewer, "viewer@example.org")
        assert viewer.post("/api/v1/invitations/accept", json={"token": token}).status_code == 200
        assert viewer.post("/api/v1/invitations/accept", json={"token": token}).status_code == 404
        assert viewer.get(base + "/projects").status_code == 200
        assert viewer.post(base + "/projects", json={"title": "Forbidden"}).status_code == 403
        assert viewer.post(base + "/discussions", json={"title": "Forbidden", "body": "No"}).status_code == 403
        assert viewer.patch(base, json={"name": "Renamed"}).status_code == 403
        assert viewer.post(base + "/invitations", json={"email": "x@example.org"}).status_code == 403


def test_three_audiences_and_learning_route_to_project(client):
    user, base = register(client, audience="student")
    catalog = client.get("/api/v1/catalog").json()
    assert {item["level"] for item in catalog} == {"explore", "learn", "research"}
    item_id = "first-hypothesis"
    article = client.get(f"/api/v1/catalog/{item_id}").json()
    assert article["sources"]
    assert client.put(f"/api/v1/catalog/{item_id}/read").status_code == 204
    assert item_id in client.get("/api/v1/reading-progress").json()
    for _ in range(2):
        assert client.post(f"{base}/catalog/{item_id}/save").status_code == 200
    assert len(client.get(base + "/resources").json()) == 1
    project = client.post(f"{base}/catalog/{item_id}/project").json()
    assert project["task_count"] == len(article["steps"]) > 0
    assert client.patch("/api/v1/auth/me", json={
        "name": user["name"], "audience": "teacher",
    }).json()["audience"] == "teacher"
    assert client.get(base + "/projects").json()[0]["id"] == project["id"]


def test_demo_sessions_are_isolated(app, client):
    first = client.post("/api/v1/auth/demo", json={"audience": "enthusiast"}).json()
    base = f'/api/v1/workspaces/{first["workspaces"][0]["id"]}'
    assert len(client.get(base + "/projects").json()) == 3
    assert client.get(base + "/overview").json()["resources"] == 6
    assert client.post(base + "/invitations", json={"email": "friend@example.org"}).status_code == 422
    with TestClient(app, headers={"X-Requested-With": "ReSearch"}) as other:
        second = other.post("/api/v1/auth/demo", json={}).json()
        assert second["user"]["id"] != first["user"]["id"]
        assert second["workspaces"][0]["id"] != first["workspaces"][0]["id"]
        assert other.get(base + "/projects").status_code == 404


def test_search_cyrillic_and_literal_wildcards(client):
    _, base = register(client)
    client.post(base + "/projects", json={"title": "Нейронаука и мышление"})
    assert len(client.get(base + "/search?q=НЕЙРО").json()) == 1
    assert client.get(base + "/search?q=%25").json() == []


def test_pricing_interest_records_intent_without_payment(client):
    register(client)
    for _ in range(2):
        response = client.post("/api/v1/plan-interest", json={"plan": "education"})
        assert response.status_code == 201
        assert "Оплата не подключена" in response.json()["message"]


def test_protocol_persistence_validation_and_project_edit_preserves_document(client):
    _, base = register(client)
    project = client.post(base + "/projects", json={"title": "Replicable observation"}).json()
    path = f'{base}/projects/{project["id"]}'
    assert project["question"] == ""
    protocol = {
        "question": "Does the sampling hour change the species count?",
        "method": "Use the same route and fixed observation duration.",
        "limitations": "One site; no causal inference.",
        "conclusion": "No observations collected yet.",
    }
    assert client.patch(path + "/protocol", json=protocol).status_code == 200
    stored = client.get(path).json()
    assert all(stored[key] == value for key, value in protocol.items())
    assert client.put(path, json={"title": "Renamed study"}).status_code == 200
    assert client.get(path).json()["method"] == protocol["method"]
    assert client.patch(path + "/protocol", json={"method": "x" * 10001}).status_code == 422
    assert client.get(path).json()["method"] == protocol["method"]
    assert any(a["action"] == "обновляет паспорт исследования" for a in client.get(base + "/activity").json())


def test_protocol_permissions_and_tenant_boundaries(app, client):
    _, base = register(client)
    project = client.post(base + "/projects", json={"title": "Owner's document"}).json()
    path = f'{base}/projects/{project["id"]}/protocol'
    for role in ("member", "viewer"):
        email = f"protocol-{role}@example.org"
        token = client.post(base + "/invitations", json={"email": email, "role": role}).json()["token"]
        with TestClient(app, headers={"X-Requested-With": "ReSearch"}) as other:
            _, other_base = register(other, email)
            assert other.patch(path, json={"method": "external"}).status_code == 404
            assert other.post("/api/v1/invitations/accept", json={"token": token}).status_code == 200
            assert other.patch(path, json={"method": "unauthorized"}).status_code == 403
            assert other.patch(f'{other_base}/projects/{project["id"]}/protocol', json={}).status_code == 404
    assert client.get(f'{base}/projects/{project["id"]}').json()["method"] == ""
