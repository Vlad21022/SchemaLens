import unittest

from insights.engine import generate_insights


def make_node(
    node_id,
    name,
    connectivity=0,
    column_count=3,
    columns=None,
    row_estimate=0,
):
    return {
        "id": node_id,
        "name": name,
        "connectivity": connectivity,
        "column_count": column_count,
        "columns": columns or [],
        "row_estimate": row_estimate,
    }


class InsightEngineTests(unittest.TestCase):
    def test_generate_insights_returns_empty_list_for_empty_graph(self):
        self.assertEqual(generate_insights({"nodes": [], "edges": []}), [])

    def test_generate_insights_identifies_core_center_orphan_overload_and_large_tables(self):
        graph = {
            "nodes": [
                make_node(
                    "public.users",
                    "users",
                    connectivity=4,
                    column_count=18,
                    row_estimate=150_000,
                ),
                make_node("public.orders", "orders", connectivity=2),
                make_node("public.payments", "payments", connectivity=1),
                make_node("public.profiles", "profiles", connectivity=1),
                make_node("public.audit_log", "audit_log", connectivity=0),
            ],
            "edges": [
                {
                    "source": "public.orders",
                    "target": "public.users",
                    "source_column": "user_id",
                },
                {
                    "source": "public.payments",
                    "target": "public.users",
                    "source_column": "user_id",
                },
                {
                    "source": "public.profiles",
                    "target": "public.users",
                    "source_column": "user_id",
                },
                {
                    "source": "public.orders",
                    "target": "public.payments",
                    "source_column": "payment_id",
                },
            ],
        }

        insights = generate_insights(graph)
        by_id = {insight["id"]: insight for insight in insights}

        self.assertIn("core_tables", by_id)
        self.assertEqual(by_id["core_tables"]["affected_nodes"], ["public.users"])
        self.assertIn("`users`", by_id["core_tables"]["body"])

        self.assertIn("center_of_gravity", by_id)
        self.assertEqual(by_id["center_of_gravity"]["affected_nodes"], ["public.users"])
        self.assertIn("avg:", by_id["center_of_gravity"]["body"])

        self.assertIn("orphan_tables", by_id)
        self.assertEqual(by_id["orphan_tables"]["affected_nodes"], ["public.audit_log"])
        self.assertEqual(by_id["orphan_tables"]["title"], "1 isolated table")

        self.assertIn("overloaded_tables", by_id)
        self.assertEqual(by_id["overloaded_tables"]["affected_nodes"], ["public.users"])
        self.assertIn("18 columns", by_id["overloaded_tables"]["body"])

        self.assertIn("high_coupling", by_id)
        self.assertEqual(by_id["high_coupling"]["affected_nodes"], [])

        self.assertIn("large_tables", by_id)
        self.assertEqual(by_id["large_tables"]["affected_nodes"], ["public.users"])
        self.assertIn("150,000 rows", by_id["large_tables"]["body"])

    def test_generate_insights_reports_possible_missing_foreign_keys(self):
        graph = {
            "nodes": [
                make_node(
                    "public.orders",
                    "orders",
                    connectivity=0,
                    columns=[
                        {"column_name": "id", "is_primary_key": True},
                        {"column_name": "user_id", "is_primary_key": False},
                        {"column_name": "coupon_id", "is_primary_key": False},
                    ],
                ),
                make_node(
                    "public.payments",
                    "payments",
                    connectivity=0,
                    columns=[
                        {"column_name": "id", "is_primary_key": True},
                        {"column_name": "order_id", "is_primary_key": False},
                    ],
                ),
            ],
            "edges": [
                {
                    "source": "public.payments",
                    "target": "public.orders",
                    "source_column": "order_id",
                }
            ],
        }

        insights = generate_insights(graph)
        missing_fks = next(
            insight for insight in insights if insight["id"] == "missing_fks"
        )

        self.assertEqual(missing_fks["type"], "suggestion")
        self.assertEqual(missing_fks["title"], "Possible missing constraints")
        self.assertIn("`orders.user_id`", missing_fks["body"])
        self.assertIn("`orders.coupon_id`", missing_fks["body"])
        self.assertNotIn("payments.order_id", missing_fks["body"])
        self.assertEqual(missing_fks["affected_nodes"], ["public.orders"])

    def test_generate_insights_reports_low_coupling_for_sparse_larger_schemas(self):
        nodes = [
            make_node(f"public.table_{index}", f"table_{index}", connectivity=0)
            for index in range(6)
        ]
        graph = {
            "nodes": nodes,
            "edges": [
                {
                    "source": "public.table_0",
                    "target": "public.table_1",
                    "source_column": "table_1_id",
                }
            ],
        }

        insights = generate_insights(graph)
        by_id = {insight["id"]: insight for insight in insights}

        self.assertIn("low_coupling", by_id)
        self.assertEqual(by_id["low_coupling"]["type"], "design")
        self.assertIn("Only 1 FK relationships for 6 tables", by_id["low_coupling"]["body"])

    def test_generate_insights_limits_output_to_eight_items(self):
        graph = {
            "nodes": [
                make_node(
                    f"public.table_{index}",
                    f"table_{index}",
                    connectivity=4,
                    column_count=20,
                    columns=[
                        {"column_name": "id", "is_primary_key": True},
                        {"column_name": "owner_id", "is_primary_key": False},
                    ],
                    row_estimate=200_000,
                )
                for index in range(12)
            ],
            "edges": [
                {
                    "source": f"public.table_{index}",
                    "target": f"public.table_{(index + 1) % 12}",
                    "source_column": "owner_id",
                }
                for index in range(12)
            ],
        }

        self.assertLessEqual(len(generate_insights(graph)), 8)


if __name__ == "__main__":
    unittest.main()
