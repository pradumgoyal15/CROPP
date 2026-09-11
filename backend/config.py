import os
from pathlib import Path

import mysql.connector
from mysql.connector import Error

try:
    from dotenv import load_dotenv

    BASE_DIR = Path(__file__).resolve().parent
    load_dotenv(BASE_DIR / ".env")
except ImportError:
    pass


# ============================================================
# APPLICATION CONFIGURATION
# ============================================================

SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "cropp-development-secret-key-change-in-production"
)


# ============================================================
# DATABASE CONFIGURATION
# ============================================================

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "kisanflow_db")

DB_SSL_CA = os.getenv("DB_SSL_CA", "")

DB_CONFIG = {
    "host": DB_HOST,
    "port": DB_PORT,
    "user": DB_USER,
    "password": DB_PASSWORD,
    "database": DB_NAME,
    "connection_timeout": 15,
}


# ============================================================
# AIVEN / CLOUD MYSQL SSL
# ============================================================

if DB_SSL_CA:
    DB_CONFIG.update(
        {
            "ssl_ca": DB_SSL_CA,
            "ssl_verify_cert": True,
            "ssl_verify_identity": True,
        }
    )


# ============================================================
# DATABASE CONNECTION
# ============================================================

def get_db_connection():
    try:
        connection = mysql.connector.connect(**DB_CONFIG)

        if connection.is_connected():
            return connection

        print("Database connection could not be established.")
        return None

    except Error as e:
        print("Database connection error:", e)
        return None

    except Exception as e:
        print("Unexpected database error:", e)
        return None