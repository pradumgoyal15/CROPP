from flask import Blueprint, jsonify, request

from services.database import get_db_connection


crops_bp = Blueprint("crops", __name__)


# =========================
# GET ALL CROPS
# =========================

@crops_bp.route("/", methods=["GET"])
def get_crops():

    connection = get_db_connection()

    if connection is None:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT
                id,
                crop_name,
                crop_code,
                category,
                msp_price,
                unit,
                season,
                created_at
            FROM crops
            ORDER BY id
        """

        cursor.execute(query)

        crops = cursor.fetchall()

        return jsonify(crops), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


# =========================
# GET SINGLE CROP
# =========================

@crops_bp.route("/<int:crop_id>", methods=["GET"])
def get_crop(crop_id):

    connection = get_db_connection()

    if connection is None:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            "SELECT * FROM crops WHERE id = %s",
            (crop_id,)
        )

        crop = cursor.fetchone()

        if not crop:

            return jsonify({
                "error": "Crop not found"
            }), 404

        return jsonify(crop), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


# =========================
# ADD CROP
# =========================

@crops_bp.route("/", methods=["POST"])
def add_crop():

    data = request.get_json()

    required_fields = [
        "crop_name",
        "crop_code",
        "category",
        "msp_price",
        "unit"
    ]

    for field in required_fields:

        if field not in data or data[field] == "":

            return jsonify({
                "error": f"{field} is required"
            }), 400


    connection = get_db_connection()

    if connection is None:

        return jsonify({
            "error": "Database connection failed"
        }), 500


    cursor = None

    try:

        cursor = connection.cursor()

        query = """
            INSERT INTO crops
            (
                crop_name,
                crop_code,
                category,
                msp_price,
                unit,
                season
            )
            VALUES (%s, %s, %s, %s, %s, %s)
        """


        values = (

            data["crop_name"],

            data["crop_code"],

            data["category"],

            data["msp_price"],

            data["unit"],

            data.get("season")

        )


        cursor.execute(query, values)

        connection.commit()


        crop_id = cursor.lastrowid


        return jsonify({

            "message": "Crop added successfully",

            "crop_id": crop_id

        }), 201


    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


# =========================
# UPDATE CROP
# =========================

@crops_bp.route("/<int:crop_id>", methods=["PUT"])
def update_crop(crop_id):

    data = request.get_json()


    connection = get_db_connection()

    if connection is None:

        return jsonify({
            "error": "Database connection failed"
        }), 500


    cursor = None


    try:

        cursor = connection.cursor()


        query = """
            UPDATE crops
            SET

                crop_name = %s,

                crop_code = %s,

                category = %s,

                msp_price = %s,

                unit = %s,

                season = %s

            WHERE id = %s
        """


        values = (

            data["crop_name"],

            data["crop_code"],

            data["category"],

            data["msp_price"],

            data["unit"],

            data.get("season"),

            crop_id

        )


        cursor.execute(query, values)

        connection.commit()


        affected_rows = cursor.rowcount


        if affected_rows == 0:

            return jsonify({

                "error": "Crop not found"

            }), 404


        return jsonify({

            "message": "Crop updated successfully"

        }), 200


    except Exception as e:

        return jsonify({

            "error": str(e)

        }), 500


    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


# =========================
# DELETE CROP
# =========================

@crops_bp.route("/<int:crop_id>", methods=["DELETE"])
def delete_crop(crop_id):


    connection = get_db_connection()


    if connection is None:

        return jsonify({
            "error": "Database connection failed"
        }), 500


    cursor = None


    try:

        cursor = connection.cursor()


        cursor.execute(

            "DELETE FROM crops WHERE id = %s",

            (crop_id,)

        )


        connection.commit()


        affected_rows = cursor.rowcount


        if affected_rows == 0:

            return jsonify({

                "error": "Crop not found"

            }), 404


        return jsonify({

            "message": "Crop deleted successfully"

        }), 200


    except Exception as e:

        return jsonify({

            "error": str(e)

        }), 500


    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()