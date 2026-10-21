import base64
import hashlib
import hmac
import secrets


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1)
    return f"scrypt${salt}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        if encoded.startswith("scrypt$"):
            _, salt, expected = encoded.split("$")
            actual = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1)
            return hmac.compare_digest(actual.hex(), expected)
        if encoded.startswith("pbkdf2_sha256$"):
            _, iterations, salt, expected = encoded.split("$")
            rounds = int(iterations)
            if not 1 <= rounds <= 2_000_000:
                return False
            actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), rounds)
            return hmac.compare_digest(base64.b64encode(actual).decode(), expected)
    except (ValueError, TypeError):
        pass
    return False


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
