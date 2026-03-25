"""add connector account tables

Revision ID: 8f3d4e21b6a1
Revises: 7c2a6d9b1e4f
Create Date: 2026-03-24 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from onyx.configs.constants import DocumentSource
from onyx.db.enums import ConnectorAccountStatus
from onyx.db.enums import ConnectorCredentialType
from onyx.db.enums import SyncStatus


# revision identifiers, used by Alembic.
revision = "8f3d4e21b6a1"
down_revision = "7c2a6d9b1e4f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "connector_account",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column(
            "source",
            sa.Enum(DocumentSource, native_enum=False),
            nullable=False,
        ),
        sa.Column("user_id", PGUUID(as_uuid=True), nullable=True),
        sa.Column("credential_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column(
            "status",
            sa.Enum(ConnectorAccountStatus, native_enum=False),
            nullable=False,
            server_default=ConnectorAccountStatus.CONNECTING.value,
        ),
        sa.Column(
            "credential_type",
            sa.Enum(ConnectorCredentialType, native_enum=False),
            nullable=False,
            server_default=ConnectorCredentialType.CUSTOM.value,
        ),
        sa.Column("external_account_id", sa.String(), nullable=True),
        sa.Column("external_account_email", sa.String(), nullable=True),
        sa.Column(
            "account_metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "settings",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("last_connected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "last_sync_status",
            sa.Enum(SyncStatus, native_enum=False),
            nullable=True,
        ),
        sa.Column("disconnected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["credential_id"], ["credential.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("credential_id"),
    )
    op.create_index(
        "ix_connector_account_source_status",
        "connector_account",
        ["source", "status"],
        unique=False,
    )
    op.create_index(
        op.f("ix_connector_account_source"),
        "connector_account",
        ["source"],
        unique=False,
    )
    op.create_index(
        op.f("ix_connector_account_user_id"),
        "connector_account",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_connector_account_credential_id"),
        "connector_account",
        ["credential_id"],
        unique=False,
    )

    op.create_table(
        "connector_sync_job",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("connector_account_id", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(SyncStatus, native_enum=False),
            nullable=False,
            server_default=SyncStatus.IN_PROGRESS.value,
        ),
        sa.Column("trigger_type", sa.String(), nullable=False),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["connector_account_id"],
            ["connector_account.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_connector_sync_job_connector_account_id"),
        "connector_sync_job",
        ["connector_account_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_connector_sync_job_connector_account_id"),
        table_name="connector_sync_job",
    )
    op.drop_table("connector_sync_job")

    op.drop_index(
        op.f("ix_connector_account_credential_id"),
        table_name="connector_account",
    )
    op.drop_index(op.f("ix_connector_account_user_id"), table_name="connector_account")
    op.drop_index(op.f("ix_connector_account_source"), table_name="connector_account")
    op.drop_index("ix_connector_account_source_status", table_name="connector_account")
    op.drop_table("connector_account")
