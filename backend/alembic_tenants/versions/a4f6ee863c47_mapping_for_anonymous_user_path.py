"""mapping for anonymous user path

Revision ID: a4f6ee863c47
Revises: 14a83a331951
Create Date: 2025-01-04 14:16:58.697451

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "a4f6ee863c47"
down_revision = "14a83a331951"
branch_labels = None
depends_on = None


def _table_exists(conn: sa.engine.Connection, table_name: str) -> bool:
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = :t"
        ),
        {"t": table_name},
    )
    return result.fetchone() is not None


def upgrade() -> None:
    conn = op.get_bind()
    if _table_exists(conn, "tenant_anonymous_user_path"):
        return

    op.create_table(
        "tenant_anonymous_user_path",
        sa.Column("tenant_id", sa.String(), primary_key=True, nullable=False),
        sa.Column("anonymous_user_path", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("tenant_id"),
        sa.UniqueConstraint("anonymous_user_path"),
    )


def downgrade() -> None:
    op.drop_table("tenant_anonymous_user_path")
