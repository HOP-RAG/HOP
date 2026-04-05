import pytest

from onyx.auth.email_utils import build_html_email
from onyx.auth.email_utils import build_user_email_invite
from onyx.auth.email_utils import send_email
from onyx.configs.constants import AuthType
from onyx.configs.constants import ONYX_DEFAULT_APPLICATION_NAME
from onyx.configs.constants import ONYX_DISCORD_URL
from onyx.db.engine.sql_engine import SqlEngine
from onyx.server.runtime.onyx_runtime import OnyxRuntime


def test_build_user_email_invite_uses_default_application_name() -> None:
    text_content, html_content = build_user_email_invite(
        "noreply@example.com",
        "user@example.com",
        ONYX_DEFAULT_APPLICATION_NAME,
        AuthType.CLOUD,
    )

    assert ONYX_DEFAULT_APPLICATION_NAME in text_content
    assert ONYX_DEFAULT_APPLICATION_NAME in html_content
    assert (
        f"para unirte a una organizaci\u00f3n en {ONYX_DEFAULT_APPLICATION_NAME}"
        in text_content
    )
    assert "Has sido invitado" in html_content
    assert "Unirme a la organizaci\u00f3n" in html_content
    assert "&Uacute;nete a nuestra comunidad de Discord" in html_content
    assert "Todos los derechos reservados." in html_content
    assert "background-color: #ffffff; border-radius: 8px;" not in html_content


def test_build_html_email_uses_default_application_name() -> None:
    html_content = build_html_email(
        application_name=ONYX_DEFAULT_APPLICATION_NAME,
        heading="Verify Your Email",
        message="<p>Welcome aboard.</p>",
    )

    assert ONYX_DEFAULT_APPLICATION_NAME in html_content
    assert f'alt="{ONYX_DEFAULT_APPLICATION_NAME} Logo"' in html_content
    assert ONYX_DISCORD_URL in html_content
    assert "Onyx Logo" not in html_content


@pytest.mark.skip(
    reason="This sends real emails, so only run when you really want to test this!"
)
def test_send_user_email_invite() -> None:
    SqlEngine.init_engine(pool_size=20, max_overflow=5)

    application_name = ONYX_DEFAULT_APPLICATION_NAME

    onyx_file = OnyxRuntime.get_emailable_logo()

    subject = (
        f"Invitaci\u00f3n para unirte a una organizaci\u00f3n en {application_name}"
    )

    from_email = "noreply@onyx.app"
    to_email = "support@onyx.app"
    text_content, html_content = build_user_email_invite(
        from_email, to_email, ONYX_DEFAULT_APPLICATION_NAME, AuthType.CLOUD
    )

    send_email(
        to_email,
        subject,
        html_content,
        text_content,
        mail_from=from_email,
        inline_png=("logo.png", onyx_file.data),
    )
