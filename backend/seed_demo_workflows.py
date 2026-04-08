# backend/seed_demo_workflows.py
"""
Seed script to create demo workflows for showcasing SynthFlow.

Usage:
    poetry run python seed_demo_workflows.py <user_email>

Creates 3 demo workflows for the specified user.
"""

import asyncio
import sys

from app.core.database import async_session_factory
from app.models.user import User
from app.models.workflow import Workflow
from sqlalchemy import select

DEMO_WORKFLOWS = [
    {
        "name": "Demo: Support Ticket Classifier",
        "description": (
            "Receives a support ticket via webhook, uses AI to classify it "
            "(bug, feature request, question) and assign priority, then sends "
            "a formatted notification to an external endpoint."
        ),
        "graph_data": {
            "nodes": [
                {
                    "id": "webhook_trigger",
                    "type": "trigger",
                    "subtype": "webhook",
                    "config": {
                        "label": "Receive Ticket",
                    },
                    "position": {"x": 250, "y": 50},
                },
                {
                    "id": "ai_classify",
                    "type": "ai",
                    "subtype": "classify",
                    "config": {
                        "label": "Classify Ticket",
                        "prompt_template": (
                            "Classify the following support ticket into one of these "
                            "categories: bug_report, feature_request, question, complaint.\n\n"
                            "Also assign a priority: high, medium, or low.\n\n"
                            "Ticket message: {{ trigger.output.webhook_body.message }}\n"
                            "Customer email: {{ trigger.output.webhook_body.email }}\n\n"
                            'Respond with JSON only: {"classification": "...", '
                            '"priority": "...", "summary": "one line summary"}'
                        ),
                        "model": "ollama/phi3:mini",
                        "timeout_seconds": 120,
                        "temperature": 0.3,
                        "output_schema": {
                            "type": "object",
                            "properties": {
                                "classification": {"type": "string"},
                                "priority": {"type": "string"},
                                "summary": {"type": "string"},
                            },
                            "required": ["classification", "priority"],
                        },
                        "retry_count": 2,
                    },
                    "position": {"x": 250, "y": 250},
                },
                {
                    "id": "notify_slack",
                    "type": "action",
                    "subtype": "http_request",
                    "config": {
                        "label": "Send Notification",
                        "method": "POST",
                        "url": "https://httpbin.org/post",
                        "headers": {"Content-Type": "application/json"},
                        "body_template": {
                            "text": "New {{ nodes.ai_classify.output.classification }} ({{ nodes.ai_classify.output.priority }}): {{ nodes.ai_classify.output.summary }}",
                            "channel": "#support",
                        },
                        "timeout_seconds": 10,
                        "retry_count": 3,
                    },
                    "position": {"x": 250, "y": 450},
                },
            ],
            "edges": [
                {"source": "webhook_trigger", "target": "ai_classify"},
                {"source": "ai_classify", "target": "notify_slack"},
            ],
        },
    },
    {
        "name": "Demo: Content Summarizer Pipeline",
        "description": (
            "Takes a block of text as input, uses AI to generate a concise summary "
            "with key points, then posts the summary to an external endpoint. "
            "Demonstrates multi-step AI processing with data flow between nodes."
        ),
        "graph_data": {
            "nodes": [
                {
                    "id": "manual_trigger",
                    "type": "trigger",
                    "subtype": "manual",
                    "config": {
                        "label": "Input Text",
                    },
                    "position": {"x": 250, "y": 50},
                },
                {
                    "id": "ai_summarize",
                    "type": "ai",
                    "subtype": "summarize",
                    "config": {
                        "label": "Summarize Content",
                        "prompt_template": (
                            "Summarize the following text into a concise paragraph "
                            "and extract 3 key points.\n\n"
                            "Text: {{ trigger.output.webhook_body.content }}\n\n"
                            'Respond with JSON only: {"summary": "...", '
                            '"key_points": ["point 1", "point 2", "point 3"], '
                            '"word_count": number}'
                        ),
                        "model": "ollama/phi3:mini",
                        "timeout_seconds": 120,
                        "temperature": 0.5,
                        "output_schema": {
                            "type": "object",
                            "properties": {
                                "summary": {"type": "string"},
                                "key_points": {"type": "array"},
                                "word_count": {"type": "integer"},
                            },
                            "required": ["summary", "key_points"],
                        },
                    },
                    "position": {"x": 250, "y": 250},
                },
                {
                    "id": "post_summary",
                    "type": "action",
                    "subtype": "http_request",
                    "config": {
                        "label": "Post Summary",
                        "method": "POST",
                        "url": "https://httpbin.org/post",
                        "headers": {"Content-Type": "application/json"},
                        "body_template": {
                            "summary": "{{ nodes.ai_summarize.output.summary }}",
                            "key_points": "{{ nodes.ai_summarize.output.key_points }}",
                            "source": "synthflow_pipeline",
                        },
                        "timeout_seconds": 10,
                        "retry_count": 3,
                    },
                    "position": {"x": 250, "y": 450},
                },
            ],
            "edges": [
                {"source": "manual_trigger", "target": "ai_summarize"},
                {"source": "ai_summarize", "target": "post_summary"},
            ],
        },
    },
    {
        "name": "Demo: Data Monitor & Alert",
        "description": (
            "Fetches data from a public API (weather/exchange rates), uses AI to "
            "analyze whether an alert condition is met, and sends a conditional "
            "notification. Demonstrates API integration, AI decision-making, and "
            "branching logic."
        ),
        "graph_data": {
            "nodes": [
                {
                    "id": "trigger",
                    "type": "trigger",
                    "subtype": "manual",
                    "config": {
                        "label": "Start Monitor",
                    },
                    "position": {"x": 250, "y": 50},
                },
                {
                    "id": "fetch_data",
                    "type": "action",
                    "subtype": "http_request",
                    "config": {
                        "label": "Fetch Exchange Rates",
                        "method": "GET",
                        "url": "https://open.er-api.com/v6/latest/USD",
                        "timeout_seconds": 15,
                        "retry_count": 2,
                    },
                    "position": {"x": 250, "y": 200},
                },
                {
                    "id": "ai_analyze",
                    "type": "ai",
                    "subtype": "custom",
                    "config": {
                        "label": "Analyze Rates",
                        "prompt_template": (
                            "Analyze the following exchange rate data and determine "
                            "if any major currency (EUR, GBP, JPY, CAD) has changed "
                            "significantly from typical rates.\n\n"
                            "Exchange rates (base USD): {{ nodes.fetch_data.output.body }}\n\n"
                            "Typical ranges: EUR 0.85-0.95, GBP 0.75-0.85, JPY 140-155, CAD 1.30-1.40\n\n"
                            'Respond with JSON only: {"alert": true/false, '
                            '"alert_message": "description if alert", '
                            '"currencies_checked": ["EUR", "GBP", "JPY", "CAD"], '
                            '"analysis": "brief analysis"}'
                        ),
                        "model": "ollama/phi3:mini",
                        "timeout_seconds": 120,
                        "temperature": 0.3,
                        "output_schema": {
                            "type": "object",
                            "properties": {
                                "alert": {"type": "boolean"},
                                "alert_message": {"type": "string"},
                                "analysis": {"type": "string"},
                            },
                            "required": ["alert", "analysis"],
                        },
                    },
                    "position": {"x": 250, "y": 400},
                },
                {
                    "id": "send_alert",
                    "type": "action",
                    "subtype": "http_request",
                    "config": {
                        "label": "Send Alert",
                        "method": "POST",
                        "url": "https://httpbin.org/post",
                        "headers": {"Content-Type": "application/json"},
                        "body_template": {
                            "type": "exchange_rate_alert",
                            "alert": "{{ nodes.ai_analyze.output.alert_message }}",
                            "analysis": "{{ nodes.ai_analyze.output.analysis }}",
                            "timestamp": "{{ trigger.output.webhook_body.triggered_from }}",
                        },
                        "timeout_seconds": 10,
                        "retry_count": 3,
                    },
                    "position": {"x": 250, "y": 600},
                },
            ],
            "edges": [
                {"source": "trigger", "target": "fetch_data"},
                {"source": "fetch_data", "target": "ai_analyze"},
                {"source": "ai_analyze", "target": "send_alert"},
            ],
        },
    },
]


async def seed(user_email: str):
    async with async_session_factory() as db:
        # Find user
        result = await db.execute(select(User).where(User.email == user_email))
        user = result.scalar_one_or_none()

        if not user:
            print(f"ERROR: User with email '{user_email}' not found.")
            print("\nAvailable users:")
            all_users = await db.execute(select(User))
            for u in all_users.scalars().all():
                print(f"  {u.email}")
            return

        print(f"Seeding demo workflows for: {user.email}")

        created = 0
        for demo in DEMO_WORKFLOWS:
            # Check if already exists
            existing = await db.execute(
                select(Workflow).where(
                    Workflow.owner_id == user.id,
                    Workflow.name == demo["name"],
                )
            )
            if existing.scalar_one_or_none():
                print(f"  SKIP: '{demo['name']}' already exists")
                continue

            workflow = Workflow(
                owner_id=user.id,
                name=demo["name"],
                description=demo["description"],
                graph_data=demo["graph_data"],
                is_active=True,
                concurrency_policy="allow_parallel",
            )
            db.add(workflow)
            created += 1
            print(f"  CREATED: '{demo['name']}'")

        await db.commit()
        print(f"\nDone! Created {created} demo workflows.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: poetry run python seed_demo_workflows.py <user_email>")
        print("Example: poetry run python seed_demo_workflows.py user@example.com")
        sys.exit(1)

    asyncio.run(seed(sys.argv[1]))
