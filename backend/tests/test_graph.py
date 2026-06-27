import unittest

from core.graph import build_graph, describe_path, find_shortest_path


class GraphBuilderTests(unittest.TestCase):
    def test_build_graph_assigns_roles_degrees_columns_and_summaries(self):
        raw = {
            "tables": [
                {"table_schema": "public", "table_name": "users"},
                {"table_schema": "public", "table_name": "orders"},
                {"table_schema": "public", "table_name": "products"},
                {"table_schema": "public", "table_name": "audit_log"},
            ],
            "columns": [
                {
                    "table_schema": "public",
                    "table_name": "users",
                    "column_name": "id",
                    "data_type": "integer",
                },
                {
                    "table_schema": "public",
                    "table_name": "orders",
                    "column_name": "id",
                    "data_type": "integer",
                },
                {
                    "table_schema": "public",
                    "table_name": "orders",
                    "column_name": "user_id",
                    "data_type": "integer",
                },
                {
                    "table_schema": "public",
                    "table_name": "orders",
                    "column_name": "product_id",
                    "data_type": "integer",
                },
                {
                    "table_schema": "public",
                    "table_name": "products",
                    "column_name": "id",
                    "data_type": "integer",
                },
            ],
            "primary_keys": [
                {
                    "table_schema": "public",
                    "table_name": "users",
                    "column_name": "id",
                },
                {
                    "table_schema": "public",
                    "table_name": "orders",
                    "column_name": "id",
                },
            ],
            "foreign_keys": [
                {
                    "table_schema": "public",
                    "table_name": "orders",
                    "column_name": "user_id",
                    "foreign_table_schema": "public",
                    "foreign_table_name": "users",
                    "foreign_column_name": "id",
                    "constraint_name": "orders_user_id_fkey",
                },
                {
                    "table_schema": "public",
                    "table_name": "orders",
                    "column_name": "product_id",
                    "foreign_table_schema": "public",
                    "foreign_table_name": "products",
                    "foreign_column_name": "id",
                    "constraint_name": "orders_product_id_fkey",
                },
            ],
            "row_counts": {
                "public.users": 10,
                "public.orders": 25,
                "public.products": 5,
            },
        }

        graph = build_graph(raw)

        self.assertEqual(len(graph["nodes"]), 4)
        self.assertEqual(len(graph["edges"]), 2)

        nodes = {node["id"]: node for node in graph["nodes"]}
        self.assertEqual(nodes["public.orders"]["connectivity"], 2)
        self.assertEqual(nodes["public.orders"]["out_degree"], 2)
        self.assertEqual(nodes["public.orders"]["in_degree"], 0)
        self.assertEqual(nodes["public.orders"]["role"], "bridge")
        self.assertEqual(nodes["public.orders"]["row_estimate"], 25)
        self.assertEqual(nodes["public.orders"]["column_count"], 3)

        order_columns = {
            column["column_name"]: column
            for column in nodes["public.orders"]["columns"]
        }
        self.assertTrue(order_columns["id"]["is_primary_key"])
        self.assertFalse(order_columns["user_id"]["is_primary_key"])

        self.assertEqual(nodes["public.users"]["connectivity"], 1)
        self.assertEqual(nodes["public.users"]["in_degree"], 1)
        self.assertEqual(nodes["public.users"]["out_degree"], 0)
        self.assertEqual(nodes["public.users"]["role"], "leaf")
        self.assertIn("table depends", nodes["public.users"]["summary"])

        self.assertEqual(nodes["public.audit_log"]["connectivity"], 0)
        self.assertEqual(nodes["public.audit_log"]["role"], "isolated")
        self.assertIn("No relationships defined", nodes["public.audit_log"]["summary"])

        edges = {edge["id"]: edge for edge in graph["edges"]}
        self.assertEqual(
            edges["public.orders→public.users:user_id"],
            {
                "id": "public.orders→public.users:user_id",
                "source": "public.orders",
                "target": "public.users",
                "source_column": "user_id",
                "target_column": "id",
                "constraint_name": "orders_user_id_fkey",
            },
        )

    def test_build_graph_returns_empty_graph_for_empty_schema(self):
        graph = build_graph(
            {
                "tables": [],
                "columns": [],
                "primary_keys": [],
                "foreign_keys": [],
                "row_counts": {},
            }
        )

        self.assertEqual(graph, {"nodes": [], "edges": []})

    def test_find_shortest_path_treats_edges_as_undirected(self):
        graph = {
            "nodes": [
                {"id": "public.users"},
                {"id": "public.orders"},
                {"id": "public.payments"},
            ],
            "edges": [
                {"source": "public.orders", "target": "public.users"},
                {"source": "public.payments", "target": "public.orders"},
            ],
        }

        self.assertEqual(
            find_shortest_path(
                graph,
                "public.users",
                "public.payments",
            ),
            ["public.users", "public.orders", "public.payments"],
        )

    def test_find_shortest_path_returns_none_when_disconnected(self):
        graph = {
            "nodes": [
                {"id": "public.users"},
                {"id": "public.audit_log"},
            ],
            "edges": [],
        }

        self.assertIsNone(find_shortest_path(graph, "public.users", "public.audit_log"))

    def test_describe_path_formats_direct_and_multi_hop_paths(self):
        self.assertEqual(describe_path(["public.users"]), "users")
        self.assertEqual(
            describe_path(["public.orders", "public.users"]),
            "`orders` directly relates to `users`",
        )
        self.assertEqual(
            describe_path(["public.payments", "public.orders", "public.users"]),
            "`payments` reaches `users` through `orders`",
        )


if __name__ == "__main__":
    unittest.main()
