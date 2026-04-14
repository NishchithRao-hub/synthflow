# backend/app/core/email_validation.py
"""
Email validation utilities: disposable-domain blocking, alias normalization,
and MX-record reachability checks.
"""

from __future__ import annotations

import asyncio

# ---------------------------------------------------------------------------
# Known disposable / temporary email domains
# ---------------------------------------------------------------------------
DISPOSABLE_DOMAINS: frozenset[str] = frozenset(
    {
        "mailinator.com",
        "guerrillamail.com",
        "guerrillamail.info",
        "guerrillamail.net",
        "guerrillamail.org",
        "guerrillamail.de",
        "guerrillamailblock.com",
        "grr.la",
        "sharklasers.com",
        "spam4.me",
        "tempmail.com",
        "temp-mail.org",
        "temp-mail.ru",
        "tempmail.net",
        "throwaway.email",
        "throwam.com",
        "yopmail.com",
        "trashmail.com",
        "trashmail.at",
        "trashmail.io",
        "trashmail.me",
        "trashmail.net",
        "trashmail.org",
        "fakeinbox.com",
        "fakemail.fr",
        "fakemail.net",
        "fakemailgenerator.com",
        "maildrop.cc",
        "dispostable.com",
        "discard.email",
        "spamgourmet.com",
        "spamgourmet.net",
        "spamgourmet.org",
        "spamcorpse.com",
        "spam.la",
        "spam.su",
        "getairmail.com",
        "binkmail.com",
        "safetymail.info",
        "spamavert.com",
        "getnada.com",
        "mohmal.com",
        "emlhub.com",
        "inboxalias.com",
        "spambox.us",
        "mailnesia.com",
        "mailexpire.com",
        "tempinbox.com",
        "anonmails.de",
        "mt2015.com",
        "mt2014.com",
        "0-mail.com",
        "0clickemail.com",
        "0wnd.net",
        "0wnd.org",
        "10minutemail.com",
        "10minutemail.net",
        "10minutemail.org",
        "20minutemail.com",
        "60minutemail.com",
        "my10minutemail.com",
        "filzmail.com",
        "spaml.com",
        "nomail.xl.cx",
        "mail-temporaire.fr",
        "meltmail.com",
        "mailzilla.org",
        "bugmenot.com",
        "owlpic.com",
        "emailondeck.com",
        "anonbox.net",
        "hide.biz.tm",
        "spamdecoy.net",
        "rmqkr.net",
        "mintemail.com",
        "drdrb.net",
        "spamfree24.org",
        "fiifke.de",
        "bnckms.ml",
        "courriel.fr.nf",
        "tempr.email",
        "disbox.net",
        "disbox.org",
        "spamfighter.cf",
        "blahdns.com",
        "mailnull.com",
        "notmailinator.com",
        "inboxkitten.com",
        "gishpuppy.com",
        "crazymailing.com",
        "e4ward.com",
        "spoofmail.de",
        "jetable.fr.nf",
        "jetable.net",
        "jetable.org",
        "nada.email",
        "mailtemp.info",
        "harakirimail.com",
        "kurzepost.de",
        "objectmail.com",
        "proxymail.eu",
        "rcpt.at",
        "trash-mail.at",
        "wegwerfmail.de",
        "wegwerfmail.net",
        "wegwerfmail.org",
        "spamgrap.com",
        "luxusmail.org",
        "fakemails.net",
        "spam.care",
    }
)

# ---------------------------------------------------------------------------
# Domain sets for alias normalization rules
# ---------------------------------------------------------------------------
_GMAIL_DOMAINS: frozenset[str] = frozenset({"gmail.com", "googlemail.com"})
_OUTLOOK_DOMAINS: frozenset[str] = frozenset(
    {"outlook.com", "hotmail.com", "live.com", "msn.com", "windowslive.com"}
)
_YAHOO_DOMAINS: frozenset[str] = frozenset(
    {
        "yahoo.com",
        "yahoo.co.uk",
        "yahoo.co.in",
        "yahoo.fr",
        "yahoo.de",
        "yahoo.es",
        "yahoo.it",
        "yahoo.com.au",
        "ymail.com",
    }
)


def normalize_email(email: str) -> str:
    """
    Return the *canonical* form of an email used only for duplicate/alias detection.
    The original email is still stored as the display address.

    Rules applied:
    - Gmail / GoogleMail: strip all dots and any +suffix from the local part
    - Outlook / Hotmail / Live: strip +suffix
    - Yahoo: strip -suffix (Yahoo uses dash for sub-addressing)
    - All others: strip +suffix (RFC 5233 sub-addressing)
    """
    email = email.lower().strip()
    if "@" not in email:
        return email

    local, domain = email.split("@", 1)

    if domain in _GMAIL_DOMAINS:
        local = local.replace(".", "")
        local = local.split("+")[0]
    elif domain in _OUTLOOK_DOMAINS:
        local = local.split("+")[0]
    elif domain in _YAHOO_DOMAINS:
        local = local.split("+")[0]
        # Yahoo allows foo-bar as an alias for foo; only strip trailing dash-word
        if "-" in local:
            local = local.rsplit("-", 1)[0]
    else:
        local = local.split("+")[0]

    return f"{local}@{domain}"


def is_disposable(email: str) -> bool:
    """Return True if the email's domain is a known disposable/temp mail provider."""
    if "@" not in email:
        return False
    _, domain = email.lower().split("@", 1)
    return domain in DISPOSABLE_DOMAINS


async def has_mx_record(domain: str) -> bool:
    """
    Check asynchronously whether *domain* has at least one MX record.
    Returns False on any DNS error (NXDOMAIN, timeout, etc.).
    """
    try:
        import dns.resolver  # type: ignore[import-untyped]

        loop = asyncio.get_event_loop()
        records = await loop.run_in_executor(
            None,
            lambda: dns.resolver.resolve(domain, "MX", lifetime=5.0),
        )
        return len(list(records)) > 0
    except Exception:
        return False


async def validate_email_for_registration(email: str) -> tuple[bool, str]:
    """
    Run all anti-abuse checks in order.

    Returns ``(ok, error_message)``.  ``error_message`` is empty when ``ok`` is True.
    """
    email = email.strip().lower()

    if "@" not in email:
        return False, "Invalid email address."

    _, domain = email.split("@", 1)

    if is_disposable(email):
        return False, "Disposable or temporary email addresses are not accepted."

    if not await has_mx_record(domain):
        return False, "The email domain does not appear to accept email."

    return True, ""
