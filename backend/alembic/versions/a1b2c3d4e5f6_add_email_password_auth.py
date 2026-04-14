"""add email/password auth fields

Revision ID: a1b2c3d4e5f6
Revises: 020c681594a6
Create Date: 2026-04-10 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "020c681594a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Make oauth_id and oauth_provider nullable (email users won't have these)
    op.alter_column(
        "users", "oauth_id", existing_type=sa.String(length=255), nullable=True
    )
    op.alter_column(
        "users", "oauth_provider", existing_type=sa.String(length=50), nullable=True
    )

    # Add email/password auth columns
    op.add_column(
        "users", sa.Column("password_hash", sa.String(length=255), nullable=True)
    )
    op.add_column(
        "users",
        sa.Column(
            "is_email_verified", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
    )
    op.add_column(
        "users",
        sa.Column("email_verification_token", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "email_verification_expires_at", sa.DateTime(timezone=True), nullable=True
        ),
    )
    op.add_column(
        "users",
        sa.Column("password_reset_token", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "password_reset_expires_at", sa.DateTime(timezone=True), nullable=True
        ),
    )
    op.add_column(
        "users",
        sa.Column("normalized_email", sa.String(length=255), nullable=True),
    )

    # Create indexes for token lookups and normalized email
    op.create_index(
        op.f("ix_users_email_verification_token"),
        "users",
        ["email_verification_token"],
        unique=False,
    )
    op.create_index(
        op.f("ix_users_password_reset_token"),
        "users",
        ["password_reset_token"],
        unique=False,
    )
    op.create_index(
        op.f("ix_users_normalized_email"),
        "users",
        ["normalized_email"],
        unique=False,
    )

    # Backfill: existing Google users are already email-verified
    op.execute(
        "UPDATE users SET is_email_verified = true WHERE oauth_provider = 'google'"
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_users_normalized_email"), table_name="users")
    op.drop_index(op.f("ix_users_password_reset_token"), table_name="users")
    op.drop_index(op.f("ix_users_email_verification_token"), table_name="users")

    op.drop_column("users", "normalized_email")
    op.drop_column("users", "password_reset_expires_at")
    op.drop_column("users", "password_reset_token")
    op.drop_column("users", "email_verification_expires_at")
    op.drop_column("users", "email_verification_token")
    op.drop_column("users", "is_email_verified")
    op.drop_column("users", "password_hash")

    op.alter_column(
        "users", "oauth_provider", existing_type=sa.String(length=50), nullable=False
    )
    op.alter_column(
        "users", "oauth_id", existing_type=sa.String(length=255), nullable=False
    )
