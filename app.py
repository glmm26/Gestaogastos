import json
import os
import sqlite3
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"
DB_PATH = BASE_DIR / "database.sqlite"
HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", "3000"))
OTP_EXP_MINUTES = 5


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS otp_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                code TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                used INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
            """
        )
        conn.commit()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120000)
    return f"{salt}:{digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, digest_hex = stored.split(":", 1)
    except ValueError:
        return False

    computed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120000).hex()
    return hmac.compare_digest(computed, digest_hex)


def generate_otp() -> str:
    return str(secrets.randbelow(900000) + 100000)


class RequestHandler(BaseHTTPRequestHandler):
    def _json_response(self, status: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self):
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length > 0 else b"{}"
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            return None

    def _serve_file(self, file_path: Path):
        if not file_path.exists() or file_path.is_dir():
            file_path = PUBLIC_DIR / "index.html"

        content_type = "application/octet-stream"
        if file_path.suffix == ".html":
            content_type = "text/html; charset=utf-8"
        elif file_path.suffix == ".css":
            content_type = "text/css; charset=utf-8"
        elif file_path.suffix == ".js":
            content_type = "application/javascript; charset=utf-8"

        content = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_POST(self):
        route = urlparse(self.path).path
        data = self._read_json_body()
        if data is None:
            self._json_response(400, {"message": "JSON inválido."})
            return

        if route == "/api/register":
            email = str(data.get("email", "")).strip().lower()
            password = str(data.get("password", ""))

            if not email or not password:
                self._json_response(400, {"message": "Email e senha são obrigatórios."})
                return

            now = datetime.now(timezone.utc).isoformat()
            with get_db_connection() as conn:
                exists = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
                if exists:
                    self._json_response(409, {"message": "Email já cadastrado."})
                    return

                conn.execute(
                    "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
                    (email, hash_password(password), now),
                )
                conn.commit()

            self._json_response(201, {"message": "Cadastro realizado com sucesso."})
            return

        if route == "/api/login":
            email = str(data.get("email", "")).strip().lower()
            password = str(data.get("password", ""))

            if not email or not password:
                self._json_response(400, {"message": "Email e senha são obrigatórios."})
                return

            with get_db_connection() as conn:
                user = conn.execute(
                    "SELECT id, email, password_hash FROM users WHERE email = ?", (email,)
                ).fetchone()

                if user is None or not verify_password(password, user["password_hash"]):
                    self._json_response(401, {"message": "Credenciais inválidas."})
                    return

                conn.execute(
                    "UPDATE otp_codes SET used = 1 WHERE user_id = ? AND used = 0", (user["id"],)
                )

                otp = generate_otp()
                expires = (datetime.now(timezone.utc) + timedelta(minutes=OTP_EXP_MINUTES)).isoformat()
                now = datetime.now(timezone.utc).isoformat()

                conn.execute(
                    "INSERT INTO otp_codes (user_id, code, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)",
                    (user["id"], otp, expires, now),
                )
                conn.commit()

            print(f"OTP para {email}: {otp}")
            self._json_response(
                200,
                {
                    "message": f"OTP gerado. Validade de {OTP_EXP_MINUTES} minutos.",
                    "devOtp": otp,
                },
            )
            return

        if route == "/api/verify-otp":
            email = str(data.get("email", "")).strip().lower()
            otp = str(data.get("otp", "")).strip()

            if not email or not otp:
                self._json_response(400, {"message": "Email e OTP são obrigatórios."})
                return

            with get_db_connection() as conn:
                user = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
                if user is None:
                    self._json_response(404, {"message": "Usuário não encontrado."})
                    return

                otp_row = conn.execute(
                    """
                    SELECT id, code, expires_at, used
                    FROM otp_codes
                    WHERE user_id = ?
                    ORDER BY datetime(created_at) DESC
                    LIMIT 1
                    """,
                    (user["id"],),
                ).fetchone()

                if otp_row is None or otp_row["used"] == 1:
                    self._json_response(401, {"message": "OTP inválido ou já utilizado."})
                    return

                expires_dt = datetime.fromisoformat(otp_row["expires_at"])
                if expires_dt < datetime.now(timezone.utc):
                    self._json_response(401, {"message": "OTP expirado."})
                    return

                if otp != otp_row["code"]:
                    self._json_response(401, {"message": "OTP incorreto."})
                    return

                conn.execute("UPDATE otp_codes SET used = 1 WHERE id = ?", (otp_row["id"],))
                conn.commit()

            token = f"demo-token-{user['id']}-{int(datetime.now(timezone.utc).timestamp())}"
            self._json_response(200, {"message": "Login validado com sucesso.", "token": token})
            return

        self._json_response(404, {"message": "Endpoint não encontrado."})

    def do_GET(self):
        route = urlparse(self.path).path
        if route.startswith("/api/"):
            self._json_response(404, {"message": "Endpoint não encontrado."})
            return

        relative = route.lstrip("/") or "index.html"
        target = (PUBLIC_DIR / relative).resolve()

        if not str(target).startswith(str(PUBLIC_DIR.resolve())):
            self._json_response(403, {"message": "Acesso negado."})
            return

        self._serve_file(target)


if __name__ == "__main__":
    init_db()
    server = HTTPServer((HOST, PORT), RequestHandler)
    print(f"Servidor Python executando em http://localhost:{PORT}")
    server.serve_forever()
