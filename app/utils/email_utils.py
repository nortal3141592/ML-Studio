from email.message import EmailMessage

import aiosmtplib
from fastapi.templating import Jinja2Templates

from config import settings

async def send_email(to_email: str, subject: str, plaintext: str, html_content: str | None = None) -> None:
    message = EmailMessage()

    message["From"] = settings.mail_from
    message["To"] = to_email
    message["Subject"] = subject

    message.set_content(plaintext)

    if html_content:
        message.add_alternative(html_content)

    # the part that actually send the email
    await aiosmtplib.send(
        message,
        hostname= settings.mail_server,
        port = settings.mail_port,
        username = settings.mail_username if settings.mail_username else None,
        password = settings.mail_password.get_secret_value() or None,
        start_tls = settings.mail_use_tls
    )

async def send_password_reset_email(to_email: str, username: str, token: str) -> None:
    reset_url = f"http://localhost:5173/reset-password?token={token}"

    # template = templates.get_template("email/password_reset.html")

    # html_content = template.render(reset_url = reset_url, username = username)

    plain_text = f"""Hi {username},

You requested to reset your password. Click the link below tos et a new password

{reset_url}

This link will expire in 1 Hour

If you didn't request this, you can safely ignore this email

Best regards,
The ML Studio Team
"""
    
    await send_email(to_email=to_email, subject="Password request link", plaintext=plain_text)