from flask import Blueprint, jsonify, request
from services.database import get_db_connection

farmers_bp = Blueprint("farmers", __name__)


# GET ALL FARMERS
@farmers_bp.route("/", methods=["GET"])
def get_farmers():

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = connection.cursor(dictionary=True)

    cursor.execute("""
        SELECT *
        FROM farmers
        ORDER BY id DESC
    """)

    farmers = cursor.fetchall()

    cursor.close()
    connection.close()

    return jsonify(farmers)


# GET SINGLE FARMER
@farmers_bp.route("/<int:farmer_id>", methods=["GET"])
def get_farmer(farmer_id):

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute(
        "SELECT * FROM farmers WHERE id = %s",
        (farmer_id,)
    )

    farmer = cursor.fetchone()

    cursor.close()
    connection.close()

    if not farmer:
        return jsonify({
            "error": "Farmer not found"
        }), 404

    return jsonify(farmer)


# ADD FARMER
@farmers_bp.route("/", methods=["POST"])
def add_farmer():

    data = request.get_json()

    required_fields = [
        "name",
        "phone",
        "email",
        "village",
        "district"
    ]

    for field in required_fields:
        if field not in data:
            return jsonify({
                "error": f"{field} is required"
            }), 400

    connection = get_db_connection()
    cursor = connection.cursor()

    query = """
        INSERT INTO farmers
        (name, phone, email, village, district)
        VALUES (%s, %s, %s, %s, %s)
    """

    values = (
        data["name"],
        data["phone"],
        data["email"],
        data["village"],
        data["district"]
    )

    cursor.execute(query, values)

    connection.commit()

    farmer_id = cursor.lastrowid

    cursor.close()
    connection.close()

    return jsonify({
        "message": "Farmer added successfully",
        "farmer_id": farmer_id
    }), 201


# UPDATE FARMER
@farmers_bp.route("/<int:farmer_id>", methods=["PUT"])
def update_farmer(farmer_id):

    data = request.get_json()

    connection = get_db_connection()
    cursor = connection.cursor()

    query = """
        UPDATE farmers
        SET
            name = %s,
            phone = %s,
            email = %s,
            village = %s,
            district = %s
        WHERE id = %s
    """

    values = (
        data["name"],
        data["phone"],
        data.get("email"),
        data["village"],
        data["district"],
        farmer_id
    )

    cursor.execute(query, values)

    connection.commit()

    affected_rows = cursor.rowcount

    cursor.close()
    connection.close()

    if affected_rows == 0:
        return jsonify({
            "error": "Farmer not found"
        }), 404

    return jsonify({
        "message": "Farmer updated successfully"
    })


# DELETE FARMER
@farmers_bp.route("/<int:farmer_id>", methods=["DELETE"])
def delete_farmer(farmer_id):

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        "DELETE FROM farmers WHERE id = %s",
        (farmer_id,)
    )

    connection.commit()

    affected_rows = cursor.rowcount

    cursor.close()
    connection.close()

    if affected_rows == 0:
        return jsonify({
            "error": "Farmer not found"
        }), 404

    return jsonify({
        "message": "Farmer deleted successfully"
    })