from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.api import auth, catalog, knowledge, projects, workspaces
from app.api.dependencies import DB
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Re:Search API",
        version="0.1.0",
        description="Research workspaces, projects, shared knowledge and collaboration.",
    )
    app.add_middleware(
        CORSMiddleware, allow_origins=settings.allowed_origins, allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "X-Requested-With"],
    )

    @app.middleware("http")
    async def protect_requests(request: Request, call_next):
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            origin = request.headers.get("origin")
            if origin and origin not in settings.allowed_origins:
                return JSONResponse({"detail": "Недопустимый источник запроса"}, status_code=403)
            # Non-simple header prevents cross-site HTML forms from mutating cookie sessions.
            # Cross-origin scripts must pass the strict CORS allowlist above.
            if request.headers.get("x-requested-with") != "ReSearch":
                return JSONResponse({"detail": "Требуется заголовок X-Requested-With: ReSearch"}, status_code=403)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(IntegrityError)
    async def conflict_handler(_request: Request, _error: IntegrityError):
        return JSONResponse({"detail": "Запись уже существует или связана с другими данными"}, status_code=409)

    @app.get("/api/health", tags=["Health"])
    def health(db: DB):
        db.execute(text("SELECT 1"))
        return {"status": "ok", "service": "research-api"}

    @app.get("/api/v1/config", tags=["Configuration"])
    def config():
        return {"demo_enabled": settings.demo_enabled, "version": "0.1.0"}

    for router in [auth.router, projects.router, knowledge.router, workspaces.router, catalog.router]:
        app.include_router(router, prefix="/api/v1")
    return app


app = create_app()
