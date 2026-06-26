from typing import Any
import psycopg2
from psycopg2.extras import RealDictCursor


def extract_schema(connection_string: str) -> dict[str, Any]:
    conn = psycopg2.connect(connection_string, connect_timeout=10)
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("""
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
          AND table_type = 'BASE TABLE'
        ORDER BY table_schema, table_name
    """)
    tables = [dict(r) for r in cur.fetchall()]

    cur.execute("""
        SELECT table_schema, table_name, column_name, data_type,
               is_nullable, column_default, ordinal_position,
               character_maximum_length, numeric_precision
        FROM information_schema.columns
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        ORDER BY table_schema, table_name, ordinal_position
    """)
    columns = [dict(r) for r in cur.fetchall()]

    cur.execute("""
        SELECT kcu.table_schema, kcu.table_name, kcu.column_name,
               tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema   = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        ORDER BY kcu.table_schema, kcu.table_name, kcu.ordinal_position
    """)
    primary_keys = [dict(r) for r in cur.fetchall()]

    cur.execute("""
        SELECT tc.table_schema, tc.table_name,
               kcu.column_name,
               ccu.table_schema  AS foreign_table_schema,
               ccu.table_name    AS foreign_table_name,
               ccu.column_name   AS foreign_column_name,
               tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema   = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
         AND ccu.table_schema   = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    """)
    foreign_keys = [dict(r) for r in cur.fetchall()]

    cur.execute("""
        SELECT schemaname AS table_schema, relname AS table_name,
               n_live_tup AS row_estimate
        FROM pg_stat_user_tables
    """)
    row_counts = {
        f"{r['table_schema']}.{r['table_name']}": r['row_estimate']
        for r in cur.fetchall()
    }

    cur.close()
    conn.close()

    return {
        "tables": tables,
        "columns": columns,
        "primary_keys": primary_keys,
        "foreign_keys": foreign_keys,
        "row_counts": row_counts,
    }
