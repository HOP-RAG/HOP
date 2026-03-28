"""add multitenant mapping tables

Revision ID: 0ace679199f4
Revises: 8f3d4e21b6a1
Create Date: 2026-03-25 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0ace679199f4"
down_revision = "8f3d4e21b6a1"
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

    if _table_exists(conn, "user_tenant_mapping"):
        return

    op.create_table(
        "user_tenant_mapping",
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("tenant_id", sa.String(), nullable=False),
        sa.Column(
            "active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.PrimaryKeyConstraint("email", "tenant_id"),
        schema="public",
    )

    op.create_table(
        "available_tenant",
        sa.Column("tenant_id", sa.String(), nullable=False),
        sa.Column("alembic_version", sa.String(), nullable=False),
        sa.Column("date_created", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("tenant_id"),
        schema="public",
    )

    op.create_table(
        "tenant_anonymous_user_path",
        sa.Column("tenant_id", sa.String(), nullable=False),
        sa.Column("anonymous_user_path", sa.String(), nullable=False, unique=True),
        sa.PrimaryKeyConstraint("tenant_id"),
        schema="public",
    )


def downgrade() -> None:
    op.drop_table("tenant_anonymous_user_path", schema="public")
    op.drop_table("available_tenant", schema="public")
    op.drop_table("user_tenant_mapping", schema="public")
