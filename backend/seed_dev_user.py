# backend/seed_dev_user.py

import asyncio

from app.core.database import async_session_factory
from sqlalchemy import text


async def seed():
    async with async_session_factory() as session:
        # Check if user already exists
        result = await session.execute(
            text("SELECT id FROM users WHERE id = 'temp-user-001'")
        )
        if result.scalar_one_or_none():
            print("Dev user already exists, skipping.")
            return

        await session.execute(
            text(
                """
                INSERT INTO users (id, email, name, oauth_provider, oauth_id, plan)
                VALUES ('temp-user-001', 'dev@synthflow.local', 'Dev User', 'google', 'dev-oauth-001', 'free')
            """
            )
        )
        await session.commit()
        print("✅ Dev user 'temp-user-001' created successfully.")


if __name__ == "__main__":
    asyncio.run(seed())
