from flask import Blueprint, request, jsonify
from services.database import get_db_connection

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({
            "error": "Username and password are required"
        }), 400

    connection = get_db_connection()

    if connection is None:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                id,
                username,
                password,
                role,
                farmer_id
            FROM users
            WHERE username = %s
        """, (username,))

        user = cursor.fetchone()

        if user is None:
            return jsonify({
                "error": "Invalid username or password"
            }), 401

        if user["password"] != password:
            return jsonify({
                "error": "Invalid username or password"
            }), 401

        return jsonify({
            "message": "Login successful",
            "user": {
                "id": user["id"],
                "username": user["username"],
                "role": user["role"],
                "farmer_id": user["farmer_id"]
            }
        }), 200

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500

    finally:
        cursor.close()
        connection.close()