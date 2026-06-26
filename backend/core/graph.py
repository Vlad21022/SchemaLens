import math
import random
from collections import deque
from typing import Any


# ── Role classification ───────────────────────────────────────────────────────

def _assign_roles(nodes: list[dict], edges: list[dict]) -> None:
    n = len(nodes)
    if n == 0:
        return

    conn_vals = sorted(nd["connectivity"] for nd in nodes)
    p75_idx = max(0, int(n * 0.75) - 1)
    p75 = conn_vals[p75_idx] if conn_vals else 0

    for nd in nodes:
        c = nd["connectivity"]
        if c == 0:
            nd["role"] = "isolated"
        elif c == 1:
            nd["role"] = "leaf"
        elif c >= max(3, p75) and c >= 3:
            nd["role"] = "hub"
        else:
            nd["role"] = "bridge"


# ── Deterministic summaries ───────────────────────────────────────────────────

def _compute_summary(node: dict, in_deg: int, out_deg: int, total_edges: int) -> str:
    role = node["role"]
    conn = node["connectivity"]
    col_count = node["column_count"]

    if role == "isolated":
        return (
            "No relationships defined. Likely a lookup table, "
            "event log, or missing constraints."
        )

    if role == "hub":
        pct = round(conn / total_edges * 100) if total_edges > 0 else 0
        return (
            f"Central entity participating in {pct}% of all schema relationships. "
            "Changes here have a wide blast radius."
        )

    if role == "bridge":
        return (
            f"Junction with {in_deg} incoming and {out_deg} outgoing relationships — "
            "bridges different parts of the schema."
        )

    # leaf
    if in_deg == 0 and out_deg > 0:
        return (
            f"Depends on {out_deg} {'table' if out_deg == 1 else 'tables'} "
            "but nothing depends on it — likely transactional or derived."
        )
    if in_deg > 0 and out_deg == 0:
        return (
            f"{in_deg} {'table depends' if in_deg == 1 else 'tables depend'} on "
            "this entity. No outgoing FKs — likely a reference or dimension table."
        )
    if col_count > 15:
        return (
            f"{col_count} columns suggests mixed concerns. "
            "Consider whether this table could be decomposed."
        )

    return f"Connected to {conn} other {'table' if conn == 1 else 'tables'} in the schema."


# ── Path finding (BFS, undirected) ───────────────────────────────────────────

def find_shortest_path(graph: dict[str, Any], source_id: str, target_id: str) -> list[str] | None:
    if source_id == target_id:
        return [source_id]

    adj: dict[str, list[str]] = {n["id"]: [] for n in graph["nodes"]}
    for e in graph["edges"]:
        src = e["source"] if isinstance(e["source"], str) else e["source"]["id"]
        tgt = e["target"] if isinstance(e["target"], str) else e["target"]["id"]
        adj[src].append(tgt)
        adj[tgt].append(src)

    parent: dict[str, str | None] = {source_id: None}
    queue = deque([source_id])

    while queue:
        cur = queue.popleft()
        if cur == target_id:
            path: list[str] = []
            node: str | None = target_id
            while node is not None:
                path.append(node)
                node = parent[node]
            return list(reversed(path))
        for nb in adj.get(cur, []):
            if nb not in parent:
                parent[nb] = cur
                queue.append(nb)

    return None


def describe_path(path: list[str]) -> str:
    names = [p.split(".")[-1] for p in path]
    if len(names) == 1:
        return names[0]
    if len(names) == 2:
        return f"`{names[0]}` directly relates to `{names[1]}`"
    middle = " → ".join(f"`{n}`" for n in names[1:-1])
    return f"`{names[0]}` reaches `{names[-1]}` through {middle}"


# ── Main builder ──────────────────────────────────────────────────────────────

def build_graph(raw: dict[str, Any]) -> dict[str, Any]:
    col_lookup: dict[str, list] = {}
    for col in raw["columns"]:
        key = f"{col['table_schema']}.{col['table_name']}"
        col_lookup.setdefault(key, []).append(col)

    pk_lookup: dict[str, set] = {}
    for pk in raw["primary_keys"]:
        key = f"{pk['table_schema']}.{pk['table_name']}"
        pk_lookup.setdefault(key, set()).add(pk["column_name"])

    nodes: list[dict] = []
    for table in raw["tables"]:
        key = f"{table['table_schema']}.{table['table_name']}"
        cols = col_lookup.get(key, [])
        pks = pk_lookup.get(key, set())
        nodes.append({
            "id": key,
            "schema": table["table_schema"],
            "name": table["table_name"],
            "columns": [
                {**c, "is_primary_key": c["column_name"] in pks}
                for c in cols
            ],
            "column_count": len(cols),
            "row_estimate": raw["row_counts"].get(key, 0),
            "connectivity": 0,
            "in_degree": 0,
            "out_degree": 0,
            "role": "normal",
            "summary": "",
            "pulse_offset": random.uniform(0, math.tau),
        })

    edges: list[dict] = []
    for fk in raw["foreign_keys"]:
        source = f"{fk['table_schema']}.{fk['table_name']}"
        target = f"{fk['foreign_table_schema']}.{fk['foreign_table_name']}"
        edges.append({
            "id": f"{source}→{target}:{fk['column_name']}",
            "source": source,
            "target": target,
            "source_column": fk["column_name"],
            "target_column": fk["foreign_column_name"],
            "constraint_name": fk["constraint_name"],
        })

    # Degree counts
    conn: dict[str, int] = {n["id"]: 0 for n in nodes}
    in_deg: dict[str, int] = {n["id"]: 0 for n in nodes}
    out_deg: dict[str, int] = {n["id"]: 0 for n in nodes}
    for e in edges:
        conn[e["source"]] = conn.get(e["source"], 0) + 1
        conn[e["target"]] = conn.get(e["target"], 0) + 1
        out_deg[e["source"]] = out_deg.get(e["source"], 0) + 1
        in_deg[e["target"]] = in_deg.get(e["target"], 0) + 1

    for n in nodes:
        n["connectivity"] = conn.get(n["id"], 0)
        n["in_degree"] = in_deg.get(n["id"], 0)
        n["out_degree"] = out_deg.get(n["id"], 0)

    graph = {"nodes": nodes, "edges": edges}

    _assign_roles(nodes, edges)

    total_edges = len(edges)
    for n in nodes:
        n["summary"] = _compute_summary(n, n["in_degree"], n["out_degree"], total_edges)

    return graph
