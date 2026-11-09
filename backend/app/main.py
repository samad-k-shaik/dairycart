"""Application entry point.

Uvicorn (the ASGI server) imports this module and runs the ``app`` object:

    uvicorn app.main:app --reload --port 8000

Later M1 issues add settings, logging, error handlers and routers here.
No routers, database code or business logic belong in this file yet.
"""

from fastapi import FastAPI

# The FastAPI application. Title and version appear in the interactive docs at /docs.
app = FastAPI(title="Milk Delivery POC API", version="0.1.0")


@app.get("/", tags=["meta"])
def read_root() -> dict[str, str]:
    """Temporary root route to show the API is running.

    Real endpoints live under /api/v1 and arrive in later issues (health in M1-09).
    """
    return {"name": "Milk Delivery POC API"}
