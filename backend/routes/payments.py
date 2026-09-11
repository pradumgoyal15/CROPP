from flask import Blueprint, request, jsonify
from services.database import get_db_connection


payments_bp = Blueprint("payments", __name__)


# ============================================================
# GET ALL PAYMENTS
# ============================================================

@payments_bp.route("/", methods=["GET"])
def get_payments():

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT
                pay.id AS payment_id,
                pay.procurement_id,
                pay.farmer_id,

                f.name AS farmer_name,
                f.phone AS farmer_phone,

                p.crop_id,
                c.crop_name,

                p.center_id,
                pc.center_name,

                p.quantity,
                p.price_per_unit,
                p.total_amount AS procurement_amount,

                pay.amount,

                DATE_FORMAT(
                    pay.payment_date,
                    '%Y-%m-%d'
                ) AS payment_date,

                pay.payment_method,
                pay.payment_status,
                pay.transaction_reference

            FROM payments pay

            JOIN farmers f
                ON pay.farmer_id = f.id

            JOIN procurements p
                ON pay.procurement_id = p.id

            JOIN crops c
                ON p.crop_id = c.id

            LEFT JOIN procurement_centers pc
                ON p.center_id = pc.id

            ORDER BY pay.id DESC
        """

        cursor.execute(query)

        payments = cursor.fetchall()

        return jsonify(payments), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


# ============================================================
# GET SINGLE PAYMENT
# ============================================================

@payments_bp.route(
    "/<int:payment_id>",
    methods=["GET"]
)
def get_payment(payment_id):

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT
                pay.id AS payment_id,
                pay.procurement_id,
                pay.farmer_id,

                f.name AS farmer_name,
                f.phone AS farmer_phone,

                p.crop_id,
                c.crop_name,

                p.center_id,
                pc.center_name,

                p.quantity,
                p.price_per_unit,
                p.total_amount AS procurement_amount,

                pay.amount,

                DATE_FORMAT(
                    pay.payment_date,
                    '%Y-%m-%d'
                ) AS payment_date,

                pay.payment_method,
                pay.payment_status,
                pay.transaction_reference

            FROM payments pay

            JOIN farmers f
                ON pay.farmer_id = f.id

            JOIN procurements p
                ON pay.procurement_id = p.id

            JOIN crops c
                ON p.crop_id = c.id

            LEFT JOIN procurement_centers pc
                ON p.center_id = pc.id

            WHERE pay.id = %s
        """

        cursor.execute(
            query,
            (payment_id,)
        )

        payment = cursor.fetchone()

        if not payment:

            return jsonify({
                "error": "Payment not found"
            }), 404

        return jsonify(payment), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


# ============================================================
# CREATE PAYMENT
# ============================================================

@payments_bp.route("/", methods=["POST"])
def create_payment():

    data = request.get_json()

    if not data:

        return jsonify({
            "error": "Request body is required"
        }), 400

    # ========================================================
    # REQUIRED FIELD
    # ========================================================

    procurement_id = data.get(
        "procurement_id"
    )

    if not procurement_id:

        return jsonify({
            "error":
                "Procurement ID is required"
        }), 400

    payment_method = data.get(
        "payment_method"
    )

    if not payment_method:

        return jsonify({
            "error":
                "Payment method is required"
        }), 400

    payment_status = data.get(
        "payment_status",
        "Pending"
    )

    allowed_methods = [
        "Bank Transfer",
        "UPI",
        "Cash"
    ]

    allowed_statuses = [
        "Pending",
        "Completed",
        "Failed"
    ]

    if payment_method not in allowed_methods:

        return jsonify({
            "error":
                "Invalid payment method"
        }), 400

    if payment_status not in allowed_statuses:

        return jsonify({
            "error":
                "Invalid payment status"
        }), 400

    connection = get_db_connection()

    if not connection:

        return jsonify({
            "error":
                "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor(
            dictionary=True
        )

        # ====================================================
        # FIND PROCUREMENT
        # ====================================================

        cursor.execute(
            """
            SELECT
                p.id,
                p.farmer_id,
                p.total_amount,
                p.status,
                f.name AS farmer_name,
                c.crop_name

            FROM procurements p

            JOIN farmers f
                ON p.farmer_id = f.id

            JOIN crops c
                ON p.crop_id = c.id

            WHERE p.id = %s
            """,
            (procurement_id,)
        )

        procurement = cursor.fetchone()

        if not procurement:

            return jsonify({
                "error":
                    "Procurement not found"
            }), 404

        # ====================================================
        # CHECK EXISTING PAYMENT
        # ====================================================

        cursor.execute(
            """
            SELECT
                id,
                payment_status
            FROM payments
            WHERE procurement_id = %s
            ORDER BY id DESC
            LIMIT 1
            """,
            (procurement_id,)
        )

        existing_payment = cursor.fetchone()

        if (
            existing_payment
            and existing_payment["payment_status"]
            == "Completed"
        ):

            return jsonify({
                "error":
                    "A completed payment already exists for this procurement",
                "payment_id":
                    existing_payment["id"]
            }), 409

        # ====================================================
        # AMOUNT
        #
        # We deliberately take the amount from the procurement
        # instead of trusting the browser.
        # ====================================================

        amount = float(
            procurement["total_amount"] or 0
        )

        if amount <= 0:

            return jsonify({
                "error":
                    "Procurement has an invalid payment amount"
            }), 400

        # ====================================================
        # OPTIONAL VALUES
        # ====================================================

        transaction_reference = data.get(
            "transaction_reference"
        )

        payment_date = data.get(
            "payment_date"
        )

        if not payment_date:

            cursor.execute(
                """
                SELECT CURDATE() AS today
                """
            )

            today_result = cursor.fetchone()

            payment_date = today_result[
                "today"
            ]

        # ====================================================
        # INSERT PAYMENT
        # ====================================================

        query = """
            INSERT INTO payments
            (
                procurement_id,
                farmer_id,
                amount,
                payment_date,
                payment_method,
                payment_status,
                transaction_reference
            )

            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
        """

        values = (
            procurement_id,
            procurement["farmer_id"],
            amount,
            payment_date,
            payment_method,
            payment_status,
            transaction_reference
        )

        cursor.execute(
            query,
            values
        )

        connection.commit()

        payment_id = cursor.lastrowid

        return jsonify({

            "message":
                "Payment created successfully",

            "payment_id":
                payment_id,

            "procurement_id":
                procurement_id,

            "farmer_id":
                procurement["farmer_id"],

            "farmer_name":
                procurement["farmer_name"],

            "crop_name":
                procurement["crop_name"],

            "amount":
                amount,

            "payment_date":
                str(payment_date),

            "payment_method":
                payment_method,

            "payment_status":
                payment_status,

            "transaction_reference":
                transaction_reference

        }), 201

    except Exception as e:

        if connection:
            connection.rollback()

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


# ============================================================
# UPDATE PAYMENT
# ============================================================

@payments_bp.route(
    "/<int:payment_id>",
    methods=["PUT"]
)
def update_payment(payment_id):

    data = request.get_json()

    if not data:

        return jsonify({
            "error": "Request body is required"
        }), 400

    connection = get_db_connection()

    if not connection:

        return jsonify({
            "error":
                "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor(
            dictionary=True
        )

        # ====================================================
        # EXISTING PAYMENT
        # ====================================================

        cursor.execute(
            """
            SELECT *
            FROM payments
            WHERE id = %s
            """,
            (payment_id,)
        )

        existing = cursor.fetchone()

        if not existing:

            return jsonify({
                "error":
                    "Payment not found"
            }), 404

        # ====================================================
        # VALUES
        # ====================================================

        payment_method = data.get(
            "payment_method",
            existing["payment_method"]
        )

        payment_status = data.get(
            "payment_status",
            existing["payment_status"]
        )

        transaction_reference = data.get(
            "transaction_reference",
            existing["transaction_reference"]
        )

        payment_date = data.get(
            "payment_date",
            existing["payment_date"]
        )

        # ====================================================
        # VALIDATION
        # ====================================================

        allowed_methods = [
            "Bank Transfer",
            "UPI",
            "Cash"
        ]

        allowed_statuses = [
            "Pending",
            "Completed",
            "Failed"
        ]

        if payment_method not in allowed_methods:

            return jsonify({
                "error":
                    "Invalid payment method"
            }), 400

        if payment_status not in allowed_statuses:

            return jsonify({
                "error":
                    "Invalid payment status"
            }), 400

        # ====================================================
        # UPDATE
        # ====================================================

        cursor.execute(
            """
            UPDATE payments

            SET
                payment_date = %s,
                payment_method = %s,
                payment_status = %s,
                transaction_reference = %s

            WHERE id = %s
            """,
            (
                payment_date,
                payment_method,
                payment_status,
                transaction_reference,
                payment_id
            )
        )

        connection.commit()

        return jsonify({

            "message":
                "Payment updated successfully",

            "payment_id":
                payment_id,

            "payment_date":
                str(payment_date),

            "payment_method":
                payment_method,

            "payment_status":
                payment_status,

            "transaction_reference":
                transaction_reference

        }), 200

    except Exception as e:

        if connection:
            connection.rollback()

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


# ============================================================
# DELETE PAYMENT
# ============================================================

@payments_bp.route(
    "/<int:payment_id>",
    methods=["DELETE"]
)
def delete_payment(payment_id):

    connection = get_db_connection()

    if not connection:

        return jsonify({
            "error":
                "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT id
            FROM payments
            WHERE id = %s
            """,
            (payment_id,)
        )

        payment = cursor.fetchone()

        if not payment:

            return jsonify({
                "error":
                    "Payment not found"
            }), 404

        cursor.execute(
            """
            DELETE FROM payments
            WHERE id = %s
            """,
            (payment_id,)
        )

        connection.commit()

        return jsonify({
            "message":
                "Payment deleted successfully"
        }), 200

    except Exception as e:

        if connection:
            connection.rollback()

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()