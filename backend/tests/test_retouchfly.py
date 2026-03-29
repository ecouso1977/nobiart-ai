"""
RetouchFly API Backend Tests - Auth, Stats, Templates, Scheduler, Projects
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s

@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    resp = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@retouchfly.com", "password": "RetouchFly2024!"})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return s

# --- Auth Tests ---

class TestAuth:
    """Auth endpoint tests"""

    def test_root(self, session):
        r = session.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        data = r.json()
        assert "RetouchFly" in data["message"]
        print("✓ Root endpoint OK")

    def test_register_new_user(self, session):
        # Cleanup first if already exists
        r = session.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User",
            "email": "test@retouchfly.com",
            "password": "Test1234!"
        })
        # Allow 400 if already registered
        assert r.status_code in [200, 400], f"Unexpected: {r.status_code} {r.text}"
        print(f"✓ Register: {r.status_code}")

    def test_login_admin(self, session):
        r = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@retouchfly.com",
            "password": "RetouchFly2024!"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == "admin@retouchfly.com"
        assert data["role"] == "admin"
        print("✓ Admin login OK")

    def test_login_invalid(self, session):
        r = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@retouchfly.com",
            "password": "wrongpass"
        })
        assert r.status_code == 401
        print("✓ Invalid login rejected")

    def test_me_endpoint(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        data = r.json()
        assert "email" in data
        assert "password_hash" not in data
        print(f"✓ /me returns user: {data['email']}")

    def test_me_unauthenticated(self, session):
        r = session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401
        print("✓ /me rejects unauthenticated")


class TestTemplates:
    """Template endpoint tests"""

    def test_get_all_templates(self, session):
        r = session.get(f"{BASE_URL}/api/templates")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert "id" in data[0]
        assert "name" in data[0]
        assert "platform" in data[0]
        print(f"✓ Templates: {len(data)} returned")

    def test_get_templates_by_platform(self, session):
        r = session.get(f"{BASE_URL}/api/templates?platform=instagram_post")
        assert r.status_code == 200
        data = r.json()
        assert all(t["platform"] == "instagram_post" for t in data)
        print(f"✓ Platform filter: {len(data)} instagram_post templates")


class TestStats:
    """Stats endpoint tests"""

    def test_get_stats(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/stats")
        assert r.status_code == 200
        data = r.json()
        assert "projects" in data
        assert "scheduled_posts" in data
        assert "templates" in data
        assert "filters" in data
        assert data["filters"] == 20
        assert data["templates"] == 16
        print(f"✓ Stats: {data}")

    def test_stats_unauthenticated(self, session):
        r = session.get(f"{BASE_URL}/api/stats")
        assert r.status_code == 401
        print("✓ Stats requires auth")


class TestScheduler:
    """Schedule post tests"""

    def test_create_scheduled_post(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/schedule/posts", json={
            "content": "TEST_ Hello from RetouchFly! #ai #photo",
            "platforms": ["instagram", "twitter"],
            "scheduled_at": "2026-03-01T10:00:00Z",
            "recurrence": None
        })
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "scheduled"
        assert data["content"].startswith("TEST_")
        TestScheduler.post_id = data["id"]
        print(f"✓ Post created: {data['id']}")

    def test_get_scheduled_posts(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/schedule/posts")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} posts")

    def test_delete_scheduled_post(self, admin_session):
        if not hasattr(TestScheduler, 'post_id'):
            pytest.skip("No post_id from create test")
        r = admin_session.delete(f"{BASE_URL}/api/schedule/posts/{TestScheduler.post_id}")
        assert r.status_code == 200
        print(f"✓ Post deleted")


class TestProjects:
    """Project CRUD tests"""

    def test_create_project(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/projects", json={
            "title": "TEST_ My Test Project",
            "type": "image"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["title"] == "TEST_ My Test Project"
        assert "id" in data
        TestProjects.project_id = data["id"]
        print(f"✓ Project created: {data['id']}")

    def test_get_projects(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/projects")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} projects")

    def test_delete_project(self, admin_session):
        if not hasattr(TestProjects, 'project_id'):
            pytest.skip("No project_id")
        r = admin_session.delete(f"{BASE_URL}/api/projects/{TestProjects.project_id}")
        assert r.status_code == 200
        print(f"✓ Project deleted")
