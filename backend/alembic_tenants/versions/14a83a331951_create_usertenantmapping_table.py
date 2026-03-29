import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "14a83a331951"
down_revision = None
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
        sa.UniqueConstraint("email", "tenant_id", name="uq_user_tenant"),
        sa.UniqueConstraint("email", name="uq_email"),
        schema="public",
    )


def downgrade() -> None:
    op.drop_table("user_tenant_mapping", schema="public")
