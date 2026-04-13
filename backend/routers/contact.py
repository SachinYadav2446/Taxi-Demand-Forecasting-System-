"""
Contact / Support message router.
Sends an email to the DemandSight support inbox via Gmail SMTP.

Required environment variables (in backend/.env):
  SMTP_EMAIL=demandsightsupport@gmail.com
  SMTP_APP_PASSWORD=<16-char Google App Password>
"""

import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from dotenv import load_dotenv

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

# Ensure .env is loaded (idempotent if already loaded by database.py)
load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contact", tags=["contact"])


def _get_smtp_config():
    """Read SMTP config from environment."""
    return (
        os.getenv("SMTP_EMAIL", "demandsightsupport@gmail.com"),
        os.getenv("SMTP_APP_PASSWORD", ""),
    )


class ContactMessage(BaseModel):
    sender_name: str = Field(..., min_length=1)
    sender_email: EmailStr
    subject: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)


def _build_html_body(data: ContactMessage) -> str:
    """Build a clean HTML email body."""
    return f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0d0d0d; border: 1px solid #222; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 24px 32px;">
            <h1 style="margin: 0; color: #000; font-size: 20px; font-weight: 800;">DemandSight Support</h1>
            <p style="margin: 4px 0 0; color: rgba(0,0,0,0.6); font-size: 12px;">New support request received</p>
        </div>
        <div style="padding: 32px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #888; font-size: 13px; width: 100px;">From</td>
                    <td style="padding: 8px 0; color: #fff; font-size: 13px; font-weight: 600;">{data.sender_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #888; font-size: 13px;">Email</td>
                    <td style="padding: 8px 0; color: #f97316; font-size: 13px;">{data.sender_email}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #888; font-size: 13px;">Subject</td>
                    <td style="padding: 8px 0; color: #fff; font-size: 13px; font-weight: 600;">{data.subject}</td>
                </tr>
            </table>
            <div style="margin-top: 20px; padding: 20px; background: #111; border: 1px solid #1a1a1a; border-radius: 12px;">
                <p style="margin: 0 0 8px; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Message</p>
                <p style="margin: 0; color: #ddd; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">{data.message}</p>
            </div>
            <p style="margin: 24px 0 0; color: #555; font-size: 11px; text-align: center;">
                Sent at {datetime.now().strftime('%B %d, %Y at %I:%M %p')} via DemandSight Platform
            </p>
        </div>
    </div>
    """


@router.post("/send")
def send_contact_message(data: ContactMessage):
    """
    Sends a support message.
    - If SMTP is configured → sends a real email via Gmail.
    - If SMTP is NOT configured → logs the message and still returns success
      (so the frontend UX works during development).
    """

    # ── Always log the message ──
    print(f"DEBUG: Entering contact endpoint for subject: {data.subject}")
    logger.info(
        f"[CONTACT] From: {data.sender_name} <{data.sender_email}> | "
        f"Subject: {data.subject} | Message: {data.message[:200]}"
    )

    # ── Try to send via Gmail SMTP ──
    support_email, smtp_password = _get_smtp_config()
    print(f"DEBUG: Extracted config: email={support_email}, pass_len={len(smtp_password) if smtp_password else 0}")

    if smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["From"] = support_email
            msg["To"] = support_email
            msg["Reply-To"] = data.sender_email
            msg["Subject"] = f"[DemandSight Support] {data.subject}"

            print("DEBUG: Connecting to SMTP...")

            # Plain text fallback
            plain = (
                f"From: {data.sender_name} ({data.sender_email})\n"
                f"Subject: {data.subject}\n\n"
                f"{data.message}"
            )
            msg.attach(MIMEText(plain, "plain"))
            msg.attach(MIMEText(_build_html_body(data), "html"))

            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(support_email, smtp_password)
                server.sendmail(support_email, support_email, msg.as_string())

            logger.info("[CONTACT] Email sent successfully via Gmail SMTP.")
            return {"status": "sent", "method": "smtp"}

        except Exception as e:
            logger.error(f"[CONTACT] SMTP send failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to send email: {str(e)}"
            )
    else:
        # No SMTP credentials → still succeed for dev/demo purposes
        logger.warning(
            "[CONTACT] SMTP_APP_PASSWORD not set. Message logged but NOT emailed. "
            "Set SMTP_EMAIL and SMTP_APP_PASSWORD env vars to enable email delivery."
        )
        return {"status": "logged", "method": "log_only"}
