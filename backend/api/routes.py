from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.extractor import extract_schema
from core.graph import build_graph, find_shortest_path, describe_path
from insights.engine import generate_insights

router = APIRouter()

_graph_cache: dict = {}


class ConnectRequest(BaseModel):
    connection_string: str


class PathRequest(BaseModel):
    source_id: str
    target_id: str


@router.post("/connect")
def connect(req: ConnectRequest):
    try:
        raw = extract_schema(req.connection_string)
        graph = build_graph(raw)
        _graph_cache["graph"] = graph
        return {
            "graph": graph,
            "insights": generate_insights(graph),
            "table_count": len(graph["nodes"]),
            "edge_count": len(graph["edges"]),
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/path")
def path(req: PathRequest):
    graph = _graph_cache.get("graph")
    if not graph:
        raise HTTPException(status_code=400, detail="No schema loaded. Connect first.")
    result = find_shortest_path(graph, req.source_id, req.target_id)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"No path found between {req.source_id} and {req.target_id}.",
        )
    return {
        "path": result,
        "description": describe_path(result),
        "hop_count": len(result) - 1,
    }


@router.get("/health")
def health():
    return {"status": "ok"}
