# backend/app/core/exceptions.py

from fastapi import Request
from fastapi.responses import JSONResponse


class SynthFlowException(Exception):
    """Base exception for all SynthFlow errors."""

    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class NotFoundException(SynthFlowException):
    def __init__(self, resource: str, resource_id: str):
        super().__init__(
            message=f"{resource} with id '{resource_id}' not found",
            status_code=404,
        )


class ForbiddenException(SynthFlowException):
    def __init__(self, message: str = "You do not have access to this resource"):
        super().__init__(message=message, status_code=403)


class BadRequestException(SynthFlowException):
    def __init__(self, message: str = "Invalid request"):
        super().__init__(message=message, status_code=400)


class UsageLimitExceededException(SynthFlowException):
    def __init__(self, resource: str, limit: int):
        super().__init__(
            message=f"Usage limit exceeded: {resource} (limit: {limit})",
            status_code=403,
        )


async def synthflow_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    sf_exc = (
        exc if isinstance(exc, SynthFlowException) else SynthFlowException(str(exc))
    )
    return JSONResponse(
        status_code=sf_exc.status_code,
        content={
            "error": {
                "message": sf_exc.message,
                "status_code": sf_exc.status_code,
            }
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "message": "An unexpected error occurred",
                "status_code": 500,
            }
        },
    )
