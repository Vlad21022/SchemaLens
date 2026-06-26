from typing import Any


def generate_insights(graph: dict[str, Any]) -> list[dict[str, Any]]:
    nodes: list[dict] = graph["nodes"]
    edges: list[dict] = graph["edges"]

    if not nodes:
        return []

    insights: list[dict] = []
    by_conn = sorted(nodes, key=lambda n: n["connectivity"], reverse=True)

    # ── Core tables ──────────────────────────────────────────────────────────
    core = [n for n in by_conn if n["connectivity"] >= 3][:3]
    if core:
        names = ", ".join(f'`{n["name"]}`' for n in core)
        insights.append({
            "id": "core_tables",
            "type": "architecture",
            "title": "Core tables identified",
            "body": (
                f"{names} {'are' if len(core) > 1 else 'is'} the gravitational center of "
                "your schema — everything else orbits around them."
            ),
            "affected_nodes": [n["id"] for n in core],
            "icon": "hub",
        })

    # ── Center of gravity ────────────────────────────────────────────────────
    if len(nodes) > 2:
        center = by_conn[0]
        avg = sum(n["connectivity"] for n in nodes) / len(nodes)
        if center["connectivity"] > 0:
            insights.append({
                "id": "center_of_gravity",
                "type": "info",
                "title": "Schema center of gravity",
                "body": (
                    f'`{center["name"]}` pulls {center["connectivity"]} relationships '
                    f"(avg: {avg:.1f}). It's the load-bearing table of this schema."
                ),
                "affected_nodes": [center["id"]],
                "icon": "radar",
            })

    # ── Orphan tables ────────────────────────────────────────────────────────
    orphans = [n for n in nodes if n["connectivity"] == 0]
    if orphans:
        sample = ", ".join(f'`{n["name"]}`' for n in orphans[:3])
        more = f" and {len(orphans) - 3} more" if len(orphans) > 3 else ""
        insights.append({
            "id": "orphan_tables",
            "type": "warning",
            "title": f"{len(orphans)} isolated {'table' if len(orphans) == 1 else 'tables'}",
            "body": (
                f"{sample}{more} {'has' if len(orphans) == 1 else 'have'} no FK relationships. "
                "Lookup tables, event logs, or unlinked entities."
            ),
            "affected_nodes": [n["id"] for n in orphans],
            "icon": "warning",
        })

    # ── Overloaded tables ────────────────────────────────────────────────────
    overloaded = [n for n in nodes if n["column_count"] > 15]
    if overloaded:
        worst = max(overloaded, key=lambda n: n["column_count"])
        insights.append({
            "id": "overloaded_tables",
            "type": "design",
            "title": "Potential table overload",
            "body": (
                f'`{worst["name"]}` carries {worst["column_count"]} columns — '
                "likely mixing concerns. Consider extracting focused sub-entities."
            ),
            "affected_nodes": [n["id"] for n in overloaded],
            "icon": "layers",
        })

    # ── Missing FK heuristic (columns ending in _id with no FK constraint) ───
    fk_cols: set[str] = set()
    for e in edges:
        fk_cols.add(f"{e['source']}.{e['source_column']}")

    candidates = [
        {"table": n["name"], "column": c["column_name"], "node_id": n["id"]}
        for n in nodes
        for c in n["columns"]
        if (
            c["column_name"].endswith("_id")
            and not c.get("is_primary_key")
            and f"{n['id']}.{c['column_name']}" not in fk_cols
        )
    ]
    if candidates:
        sample = ", ".join(f'`{c["table"]}.{c["column"]}`' for c in candidates[:2])
        more = f" (+{len(candidates) - 2} more)" if len(candidates) > 2 else ""
        insights.append({
            "id": "missing_fks",
            "type": "suggestion",
            "title": "Possible missing constraints",
            "body": (
                f"{sample}{more} look like foreign keys but have no constraint defined. "
                "Referential integrity may not be enforced."
            ),
            "affected_nodes": list({c["node_id"] for c in candidates}),
            "icon": "link_off",
        })

    # ── Schema coupling ──────────────────────────────────────────────────────
    n = len(nodes)
    fk_count = len(edges)
    if n > 1:
        max_possible = n * (n - 1) / 2
        density = fk_count / max_possible
        if density > 0.3:
            insights.append({
                "id": "high_coupling",
                "type": "warning",
                "title": "Highly coupled schema",
                "body": (
                    f"{fk_count} foreign keys across {n} tables gives high coupling. "
                    "Schema changes can have a wide blast radius."
                ),
                "affected_nodes": [],
                "icon": "warning",
            })
        elif n > 5 and fk_count < n / 3:
            insights.append({
                "id": "low_coupling",
                "type": "design",
                "title": "Loosely connected schema",
                "body": (
                    f"Only {fk_count} FK relationships for {n} tables. "
                    "Schema is loosely coupled — or missing constraints."
                ),
                "affected_nodes": [],
                "icon": "info",
            })

    # ── Large tables ─────────────────────────────────────────────────────────
    large = [n for n in nodes if (n.get("row_estimate") or 0) > 100_000]
    if large:
        biggest = max(large, key=lambda n: n.get("row_estimate") or 0)
        insights.append({
            "id": "large_tables",
            "type": "performance",
            "title": "High-volume tables detected",
            "body": (
                f'`{biggest["name"]}` has ~{biggest["row_estimate"]:,} rows. '
                "Verify indexes on frequently-queried columns."
            ),
            "affected_nodes": [n["id"] for n in large],
            "icon": "storage",
        })

    return insights[:8]
