"""Persist the research question, method, limitations and preliminary conclusion."""

import sqlalchemy as sa
from alembic import op

revision = "c91d1027b8ab"
down_revision = "ab6f8eccde8a"
branch_labels = None
depends_on = None


def upgrade():
    for name in ("question", "method", "limitations", "conclusion"):
        op.add_column("projects", sa.Column(name, sa.Text(), nullable=False, server_default=""))


def downgrade():
    with op.batch_alter_table("projects") as batch:
        for name in ("conclusion", "limitations", "method", "question"):
            batch.drop_column(name)
