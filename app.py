import json
import os
import sqlite3
import hashlib
import hmac
import secrets
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


def load_dotenv(dotenv_path: Path):
    if not dotenv_path.exists():
        return

    for raw_line in dotenv_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("\"'")

        if key and key not in os.environ:
            os.environ[key] = value


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
PUBLIC_DIR = BASE_DIR / "public"
DB_PATH = BASE_DIR / "database.sqlite"
HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", "3000"))
OTP_EXP_MINUTES = 5

# Recommended mode: email API provider (Brevo)
EMAIL_PROVIDER = os.environ.get("EMAIL_PROVIDER", "api").lower()
EMAIL_API_URL = os.environ.get("EMAIL_API_URL", "https://api.brevo.com/v3/smtp/email")
EMAIL_API_KEY = os.environ.get("EMAIL_API_KEY")
EMAIL_API_SENDER_EMAIL = os.environ.get("EMAIL_API_SENDER_EMAIL", "verificacaootp@gmail.com")
EMAIL_API_SENDER_NAME = os.environ.get("EMAIL_API_SENDER_NAME", "OTP")


# Optional SMTP fallback config (kept for startup warning compatibility)
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_SENDER = os.environ.get("SMTP_SENDER", SMTP_USER)
SMTP_USE_TLS = os.environ.get("SMTP_USE_TLS", "true").lower() == "true"
SMTP_REQUIRE_AUTH = os.environ.get("SMTP_REQUIRE_AUTH", "true").lower() == "true"


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
                is_verified INTEGER NOT NULL DEFAULT 0,
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

            CREATE TABLE IF NOT EXISTS email_verification_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                code TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                used INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
                amount REAL NOT NULL,
                description TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
            """
        )

        columns = conn.execute("PRAGMA table_info(users)").fetchall()
        column_names = {col["name"] for col in columns}
        if "is_verified" not in column_names:
            conn.execute("ALTER TABLE users ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 0")

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


def send_code_via_api(target_email: str, otp_code: str, subject: str, action_text: str):
    if not EMAIL_API_KEY:
        raise RuntimeError("EMAIL_API_KEY nao configurada.")

    payload = {
        "sender": {
            "name": EMAIL_API_SENDER_NAME,
            "email": EMAIL_API_SENDER_EMAIL,
        },
        "to": [{"email": target_email}],
        "subject": subject,
        "htmlContent": f"""
        <html>
            <body style=\"font-family: Arial, sans-serif;\">
                <h2>Codigo de verificacao</h2>
                <p>Use o codigo abaixo para {action_text}:</p>
                <h1 style=\"letter-spacing:4px;\">{otp_code}</h1>
                <p>Esse codigo expira em {OTP_EXP_MINUTES} minutos.</p>
            </body>
        </html>
        """,
    }

    request = urllib.request.Request(
        EMAIL_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "api-key": EMAIL_API_KEY,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            if response.getcode() != 201:
                raise RuntimeError(f"Erro Brevo: {response.read().decode()}")
    except urllib.error.HTTPError as error:
        details = error.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Falha na API Brevo (HTTP {error.code}): {details}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"Nao foi possivel conectar ao Brevo: {error}") from error


def send_verification_email(target_email: str, otp_code: str):
    if EMAIL_PROVIDER != "api":
        raise RuntimeError("Este projeto esta configurado apenas para envio via API (Brevo).")

    send_code_via_api(
        target_email,
        otp_code,
        "Verifique sua conta - Gestao de Gastos",
        "confirmar seu cadastro",
    )


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
            self._json_response(400, {"message": "JSON invalido."})
            return

        if route == "/api/register":
            email = str(data.get("email", "")).strip().lower()
            password = str(data.get("password", ""))

            if not email or not password:
                self._json_response(400, {"message": "Email e senha sao obrigatorios."})
                return

            now = datetime.now(timezone.utc).isoformat()
            with get_db_connection() as conn:
                exists = conn.execute(
                    "SELECT id, is_verified FROM users WHERE email = ?",
                    (email,),
                ).fetchone()
                if exists:
                    if exists["is_verified"] == 1:
                        self._json_response(409, {"message": "Email ja cadastrado."})
                    else:
                        self._json_response(
                            409,
                            {
                                "message": "Conta ja criada, mas ainda nao verificada. Verifique seu email.",
                            },
                        )
                    return

                result = conn.execute(
                    "INSERT INTO users (email, password_hash, is_verified, created_at) VALUES (?, ?, 0, ?)",
                    (email, hash_password(password), now),
                )
                user_id = result.lastrowid

                conn.execute(
                    "UPDATE email_verification_codes SET used = 1 WHERE user_id = ? AND used = 0",
                    (user_id,),
                )

                code = generate_otp()
                expires = (datetime.now(timezone.utc) + timedelta(minutes=OTP_EXP_MINUTES)).isoformat()
                conn.execute(
                    """
                    INSERT INTO email_verification_codes (user_id, code, expires_at, used, created_at)
                    VALUES (?, ?, ?, 0, ?)
                    """,
                    (user_id, code, expires, now),
                )
                conn.commit()

            try:
                send_verification_email(email, code)
            except Exception as error:
                with get_db_connection() as conn:
                    conn.execute("DELETE FROM email_verification_codes WHERE user_id = ?", (user_id,))
                    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
                    conn.commit()
                print(f"Falha ao enviar email de verificacao para {email}: {error}")
                self._json_response(
                    500,
                    {"message": "Conta nao criada porque o email de verificacao nao foi enviado."},
                )
                return

            self._json_response(
                201,
                {
                    "message": f"Conta criada. Verifique o codigo enviado para seu email (validade de {OTP_EXP_MINUTES} minutos).",
                },
            )
            return

        if route == "/api/verify-email":
            email = str(data.get("email", "")).strip().lower()
            otp = str(data.get("otp", "")).strip()

            if not email or not otp:
                self._json_response(400, {"message": "Email e codigo sao obrigatorios."})
                return

            with get_db_connection() as conn:
                user = conn.execute(
                    "SELECT id, is_verified FROM users WHERE email = ?",
                    (email,),
                ).fetchone()

                if user is None:
                    self._json_response(404, {"message": "Usuario nao encontrado."})
                    return

                if user["is_verified"] == 1:
                    self._json_response(200, {"message": "Email ja verificado. Faca login."})
                    return

                otp_row = conn.execute(
                    """
                    SELECT id, code, expires_at, used
                    FROM email_verification_codes
                    WHERE user_id = ?
                    ORDER BY datetime(created_at) DESC
                    LIMIT 1
                    """,
                    (user["id"],),
                ).fetchone()

                if otp_row is None or otp_row["used"] == 1:
                    self._json_response(401, {"message": "Codigo invalido ou ja utilizado."})
                    return

                expires_dt = datetime.fromisoformat(otp_row["expires_at"])
                if expires_dt < datetime.now(timezone.utc):
                    self._json_response(401, {"message": "Codigo expirado."})
                    return

                if otp != otp_row["code"]:
                    self._json_response(401, {"message": "Codigo incorreto."})
                    return

                conn.execute("UPDATE email_verification_codes SET used = 1 WHERE id = ?", (otp_row["id"],))
                conn.execute("UPDATE users SET is_verified = 1 WHERE id = ?", (user["id"],))
                conn.commit()

            self._json_response(200, {"message": "Email verificado com sucesso. Agora voce pode fazer login."})
            return

        if route == "/api/login":
            email = str(data.get("email", "")).strip().lower()
            password = str(data.get("password", ""))

            if not email or not password:
                self._json_response(400, {"message": "Email e senha sao obrigatorios."})
                return

            with get_db_connection() as conn:
                user = conn.execute(
                    "SELECT id, password_hash, is_verified FROM users WHERE email = ?",
                    (email,),
                ).fetchone()

                if user is None or not verify_password(password, user["password_hash"]):
                    self._json_response(401, {"message": "Credenciais invalidas."})
                    return

                if user["is_verified"] != 1:
                    self._json_response(
                        403,
                        {"message": "Voce precisa verificar seu email antes de fazer login."},
                    )
                    return

            token = f"demo-token-{user['id']}-{int(datetime.now(timezone.utc).timestamp())}"
            self._json_response(200, {"message": "Login realizado com sucesso.", "token": token})
            return

        if route == "/api/transactions":
            email = str(data.get("email", "")).strip().lower()
            tx_type = str(data.get("type", "")).strip().lower()
            description = str(data.get("description", "")).strip()

            try:
                amount = float(data.get("amount", 0))
            except (TypeError, ValueError):
                self._json_response(400, {"message": "Valor invalido."})
                return

            if not email or tx_type not in ("income", "expense"):
                self._json_response(400, {"message": "Email e tipo sao obrigatorios."})
                return

            if amount <= 0:
                self._json_response(400, {"message": "O valor deve ser maior que zero."})
                return

            if not description:
                description = "Movimentacao"

            now = datetime.now(timezone.utc).isoformat()
            with get_db_connection() as conn:
                user = conn.execute(
                    "SELECT id, is_verified FROM users WHERE email = ?",
                    (email,),
                ).fetchone()
                if user is None:
                    self._json_response(404, {"message": "Usuario nao encontrado."})
                    return
                if user["is_verified"] != 1:
                    self._json_response(403, {"message": "Usuario ainda nao verificado."})
                    return

                conn.execute(
                    """
                    INSERT INTO transactions (user_id, type, amount, description, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (user["id"], tx_type, amount, description[:120], now),
                )
                conn.commit()

            self._json_response(201, {"message": "Movimentacao adicionada com sucesso."})
            return

        self._json_response(404, {"message": "Endpoint nao encontrado."})

    def do_GET(self):
        parsed = urlparse(self.path)
        route = parsed.path
        if route.startswith("/api/"):
            if route == "/api/transactions":
                query = parse_qs(parsed.query)
                email = (query.get("email", [""])[0] or "").strip().lower()
                if not email:
                    self._json_response(400, {"message": "Email e obrigatorio."})
                    return

                with get_db_connection() as conn:
                    user = conn.execute(
                        "SELECT id FROM users WHERE email = ?",
                        (email,),
                    ).fetchone()
                    if user is None:
                        self._json_response(404, {"message": "Usuario nao encontrado."})
                        return

                    rows = conn.execute(
                        """
                        SELECT id, type, amount, description, created_at
                        FROM transactions
                        WHERE user_id = ?
                        ORDER BY datetime(created_at) DESC
                        LIMIT 20
                        """,
                        (user["id"],),
                    ).fetchall()

                    total_income_row = conn.execute(
                        "SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE user_id = ? AND type = 'income'",
                        (user["id"],),
                    ).fetchone()
                    total_expense_row = conn.execute(
                        "SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE user_id = ? AND type = 'expense'",
                        (user["id"],),
                    ).fetchone()

                total_income = float(total_income_row["total"])
                total_expense = float(total_expense_row["total"])
                payload = {
                    "summary": {
                        "income": total_income,
                        "expense": total_expense,
                        "balance": total_income - total_expense,
                    },
                    "transactions": [
                        {
                            "id": row["id"],
                            "type": row["type"],
                            "amount": float(row["amount"]),
                            "description": row["description"],
                            "created_at": row["created_at"],
                        }
                        for row in rows
                    ],
                }
                self._json_response(200, payload)
                return

            self._json_response(404, {"message": "Endpoint nao encontrado."})
            return

        relative = route.lstrip("/") or "index.html"
        target = (PUBLIC_DIR / relative).resolve()

        if not str(target).startswith(str(PUBLIC_DIR.resolve())):
            self._json_response(403, {"message": "Acesso negado."})
            return

        self._serve_file(target)


def startup_email_warning() -> str:
    if EMAIL_PROVIDER == "api":
        missing = []
        if not EMAIL_API_KEY:
            missing.append("EMAIL_API_KEY")
        if not EMAIL_API_SENDER_EMAIL:
            missing.append("EMAIL_API_SENDER_EMAIL")
        if missing:
            return "[AVISO] API de email incompleta. Configure: " + ", ".join(missing)
        return ""

    if EMAIL_PROVIDER == "smtp":
        missing = []
        if not SMTP_HOST:
            missing.append("SMTP_HOST")
        if not SMTP_SENDER:
            missing.append("SMTP_SENDER")
        if SMTP_REQUIRE_AUTH and not SMTP_USER:
            missing.append("SMTP_USER")
        if SMTP_REQUIRE_AUTH and not SMTP_PASSWORD:
            missing.append("SMTP_PASSWORD")
        if missing:
            return "[AVISO] SMTP incompleto. Configure: " + ", ".join(missing)
        return ""

    return "[AVISO] EMAIL_PROVIDER invalido. Use 'api' ou 'smtp'."


if __name__ == "__main__":
    init_db()

    warning = startup_email_warning()
    if warning:
        print(warning + ". O fluxo de verificacao por email retornara erro ate corrigir.")

    server = HTTPServer((HOST, PORT), RequestHandler)
    print(f"Servidor Python executando em http://localhost:{PORT}")
    server.serve_forever()
