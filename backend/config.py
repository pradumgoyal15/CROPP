import mysql.connector
from mysql.connector import Error


SECRET_KEY = "kisanflow_secret_key_2026"


DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "kisanflow@2026",
    "database": "kisanflow_db"
}


def get_db_connection():
    try:
        connection = mysql.connector.connect(**DB_CONFIG)

        if connection.is_connected():
            return connection

    except Error as e:
        print("Database connection error:", e)
        return None