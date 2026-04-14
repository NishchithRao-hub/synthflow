# backend/app/services/email_service.py
"""
Async email delivery service.

If SMTP_HOST is not configured the emails are only logged (useful for local
development).  Set SMTP_HOST + credentials in .env to enable real delivery.
"""

from __future__ import annotations

import structlog
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = structlog.get_logger()

# ---------------------------------------------------------------------------
# Low-level send helper
# ---------------------------------------------------------------------------


async def _send(to: str, subject: str, html: str) -> None:
    """Send a single HTML email.  Logs instead of raising on failure."""
    if not settings.SMTP_HOST:
        logger.info(
            "email_mock_sent",
            to=to,
            subject=subject,
            note="Set SMTP_HOST in .env to enable real delivery",
        )
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    try:
        import aiosmtplib  # type: ignore[import-untyped]

        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER or None,
            password=settings.SMTP_PASSWORD or None,
            start_tls=settings.SMTP_STARTTLS,
        )
        logger.info("email_sent", to=to, subject=subject)
    except Exception as exc:
        logger.error("email_send_failed", to=to, subject=subject, error=str(exc))


# ---------------------------------------------------------------------------
# Email templates
# ---------------------------------------------------------------------------

_BASE_STYLE = """
  body { margin:0; padding:0; background:#0d0d14; font-family: 'Segoe UI', Arial, sans-serif; }
  .wrapper { max-width:560px; margin:40px auto; background:#16161f;
             border:1px solid #2a2a3a; border-radius:12px; overflow:hidden; }
  .header { background:#7c3aed; padding:32px 40px; text-align:center; }
  .header h1 { margin:0; color:#fff; font-size:22px; font-weight:700; letter-spacing:.5px; }
  .header p  { margin:6px 0 0; color:rgba(255,255,255,.75); font-size:14px; }
  .body { padding:36px 40px; color:#c9c9d4; font-size:15px; line-height:1.6; }
  .body h2 { color:#ffffff; font-size:18px; margin:0 0 12px; }
  .btn { display:inline-block; margin:24px 0; padding:14px 32px;
         background:#7c3aed; color:#fff !important; text-decoration:none;
         border-radius:8px; font-weight:600; font-size:15px; }
  .note { margin-top:20px; font-size:13px; color:#6b7280; }
  .footer { padding:20px 40px; border-top:1px solid #2a2a3a;
            font-size:12px; color:#4b5563; text-align:center; }
"""


async def send_verification_email(to: str, name: str, token: str) -> None:
    """Send the email-address verification link."""
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    first_name = name.split()[0] if name else "there"
    subject = "Verify your SynthFlow email address"
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8">
<style>{_BASE_STYLE}</style></head><body>
<div class="wrapper">
  <div class="header">
    <h1>⚡ SynthFlow</h1>
    <p>AI-powered workflow automation</p>
  </div>
  <div class="body">
    <h2>Hi {first_name}, confirm your email</h2>
    <p>Thanks for signing up! Click the button below to verify your email address
    and activate your account.</p>
    <a href="{verify_url}" class="btn">Verify Email Address</a>
    <p class="note">This link expires in {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} hours.
    If you did not create a SynthFlow account you can safely ignore this email.</p>
    <p class="note">If the button doesn't work, copy and paste this URL into your browser:<br>
    <span style="color:#7c3aed;word-break:break-all">{verify_url}</span></p>
  </div>
  <div class="footer">© {2026} SynthFlow · You're receiving this because you signed up.</div>
</div>
</body></html>"""
    await _send(to, subject, html)


async def send_password_reset_email(to: str, name: str, token: str) -> None:
    """Send the password-reset link."""
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    first_name = name.split()[0] if name else "there"
    subject = "Reset your SynthFlow password"
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8">
<style>{_BASE_STYLE}</style></head><body>
<div class="wrapper">
  <div class="header">
    <h1>⚡ SynthFlow</h1>
    <p>AI-powered workflow automation</p>
  </div>
  <div class="body">
    <h2>Hi {first_name}, reset your password</h2>
    <p>We received a request to reset the password for your SynthFlow account.
    Click the button below to choose a new password.</p>
    <a href="{reset_url}" class="btn">Reset Password</a>
    <p class="note">This link expires in {settings.PASSWORD_RESET_EXPIRE_HOURS} hour(s).
    If you did not request a password reset, no action is needed — your account remains secure.</p>
    <p class="note">If the button doesn't work, copy and paste this URL into your browser:<br>
    <span style="color:#7c3aed;word-break:break-all">{reset_url}</span></p>
  </div>
  <div class="footer">© {2026} SynthFlow · You're receiving this because you requested a password reset.</div>
</div>
</body></html>"""
    await _send(to, subject, html)
