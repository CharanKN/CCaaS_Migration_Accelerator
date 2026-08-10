"""Application error types and handlers.

Errors returned to the browser are intentionally generic so that upstream
secrets or provider internals are never leaked to the client.
"""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .logging import get_logger

log = get_logger("errors")


class AppError(Exception):
    """Base class for expected, client-safe application errors."""

    status_code = 500
    message = "Internal server error"

    def __init__(self, message: str | None = None, status_code: int | None = None):
        if message is not None:
            self.message = message
        if status_code is not None:
            self.status_code = status_code
        super().__init__(self.message)


class NotFoundError(AppError):
    status_code = 404
    message = "Resource not found"


class FeatureDisabledError(AppError):
    """Raised when a feature is called but its required secret is not configured."""

    status_code = 503
    message = "Feature is not configured on the server"


class UpstreamError(AppError):
    """Raised when an upstream provider (OpenRouter, GitHub, CCaaS) fails."""

    status_code = 502
    message = "Upstream provider error"


class UnauthorizedError(AppError):
    """Raised when a request has no/invalid/expired credentials."""

    status_code = 401
    message = "Authentication required"


class ForbiddenError(AppError):
    """Raised when an authenticated user isn't permitted to do this."""

    status_code = 403
    message = "Not permitted"


class ConflictError(AppError):
    """Raised when a request conflicts with existing state (e.g. duplicate
    registration)."""

    status_code = 409
    message = "Conflicts with existing state"


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        if exc.status_code >= 500:
            log.error("AppError on %s: %s", request.url.path, exc.message)
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.message, "status": exc.status_code},
        )

    @app.exception_handler(Exception)
    async def _handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
        # Log full detail server-side; return a generic message to the client.
        log.exception("Unhandled error on %s", request.url.path)
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error", "status": 500},
        )
