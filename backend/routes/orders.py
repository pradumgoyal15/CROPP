from flask import Blueprint, request, jsonify

from services.database import get_db_connection


orders_bp = Blueprint("orders", __name__)


# ============================================================
# GET ALL ORDERS
# ============================================================

@orders_bp.route("/", methods=["GET"])
def get_orders():

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = connection.cursor(dictionary=True)

    try:

        query = """
            SELECT
                o.id AS order_id,
                o.consumer_id,
                u.username AS consumer_name,

                o.crop_id,
                c.crop_name,

                o.quantity,
                o.price_per_unit,
                o.total_amount,
                o.status,
                o.order_date,
                o.updated_at

            FROM consumer_orders o

            JOIN users u
                ON o.consumer_id = u.id

            JOIN crops c
                ON o.crop_id = c.id

            ORDER BY o.id DESC
        """

        cursor.execute(query)

        orders = cursor.fetchall()

        return jsonify(orders), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET CONSUMER ORDERS
# ============================================================

@orders_bp.route("/consumer/<int:consumer_id>", methods=["GET"])
def get_consumer_orders(consumer_id):

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = connection.cursor(dictionary=True)

    try:

        query = """
            SELECT
                o.id AS order_id,
                o.consumer_id,

                o.crop_id,
                c.crop_name,

                o.quantity,
                o.price_per_unit,
                o.total_amount,
                o.status,
                o.order_date,
                o.updated_at

            FROM consumer_orders o

            JOIN crops c
                ON o.crop_id = c.id

            WHERE o.consumer_id = %s

            ORDER BY o.id DESC
        """

        cursor.execute(
            query,
            (consumer_id,)
        )

        orders = cursor.fetchall()

        return jsonify(orders), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET SINGLE ORDER
# ============================================================

@orders_bp.route("/<int:order_id>", methods=["GET"])
def get_order(order_id):

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = connection.cursor(dictionary=True)

    try:

        query = """
            SELECT
                o.id AS order_id,
                o.consumer_id,
                u.username AS consumer_name,

                o.crop_id,
                c.crop_name,

                o.quantity,
                o.price_per_unit,
                o.total_amount,
                o.status,
                o.order_date,
                o.updated_at

            FROM consumer_orders o

            JOIN users u
                ON o.consumer_id = u.id

            JOIN crops c
                ON o.crop_id = c.id

            WHERE o.id = %s
        """

        cursor.execute(
            query,
            (order_id,)
        )

        order = cursor.fetchone()

        if not order:
            return jsonify({
                "error": "Order not found"
            }), 404

        return jsonify(order), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET ORDER TRACEABILITY
#
# Finds the latest completed procurement/supply batch
# for the same crop as the consumer order.
#
# This is the prototype linkage between:
#
# Consumer Order
#       ↓
# Crop
#       ↓
# Completed Procurement
#       ↓
# Supply Chain Batch
#       ↓
# Traceability Timeline
# ============================================================

@orders_bp.route(
    "/<int:order_id>/traceability",
    methods=["GET"]
)
def get_order_traceability(order_id):

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = connection.cursor(dictionary=True)

    try:

        # --------------------------------------------------------
        # GET ORDER
        # --------------------------------------------------------

        cursor.execute(
            """
            SELECT
                o.id AS order_id,
                o.consumer_id,
                o.crop_id,
                c.crop_name,
                o.quantity AS order_quantity,
                o.status AS order_status

            FROM consumer_orders o

            JOIN crops c
                ON o.crop_id = c.id

            WHERE o.id = %s
            """,
            (order_id,)
        )

        order = cursor.fetchone()

        if not order:
            return jsonify({
                "error": "Order not found"
            }), 404

        # --------------------------------------------------------
        # FIND LATEST COMPLETED PROCUREMENT BATCH
        # FOR THE SAME CROP
        # --------------------------------------------------------

        cursor.execute(
            """
            SELECT
                b.id AS batch_id,
                b.batch_code,
                b.traceability_id,

                b.current_stage,
                b.status AS batch_status,
                b.quality_status,

                b.created_at,
                b.updated_at,

                p.id AS procurement_id,
                p.farmer_id,
                f.name AS farmer_name,

                p.crop_id,
                c.crop_name,

                p.quantity AS procurement_quantity,
                p.price_per_unit,
                p.procurement_date,

                p.center_id,
                pc.center_name,
                pc.center_code,
                pc.district AS center_district,
                pc.address AS center_address

            FROM supply_chain_batches b

            JOIN procurements p
                ON b.procurement_id = p.id

            JOIN farmers f
                ON p.farmer_id = f.id

            JOIN crops c
                ON p.crop_id = c.id

            JOIN procurement_centers pc
                ON p.center_id = pc.id

            WHERE p.crop_id = %s
              AND p.status = 'Completed'

            ORDER BY b.id DESC

            LIMIT 1
            """,
            (order["crop_id"],)
        )

        batch = cursor.fetchone()

        if not batch:

            return jsonify({
                "error": "Traceability is not available yet for this crop",
                "message": (
                    "A completed procurement batch is required "
                    "before this order can be traced."
                ),
                "order": order
            }), 404

        # --------------------------------------------------------
        # GET SUPPLY CHAIN EVENTS
        # --------------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                stage,
                event_status,
                notes,
                event_time

            FROM supply_chain_events

            WHERE batch_id = %s

            ORDER BY event_time ASC, id ASC
            """,
            (batch["batch_id"],)
        )

        events = cursor.fetchall()

        # --------------------------------------------------------
        # RESPONSE
        # --------------------------------------------------------

        return jsonify({

            "order": {
                "order_id": order["order_id"],
                "consumer_id": order["consumer_id"],
                "crop_id": order["crop_id"],
                "crop_name": order["crop_name"],
                "quantity": order["order_quantity"],
                "status": order["order_status"]
            },

            "traceability": {

                "batch_id": batch["batch_id"],
                "batch_code": batch["batch_code"],
                "traceability_id": batch["traceability_id"],

                "crop_id": batch["crop_id"],
                "crop_name": batch["crop_name"],

                "farmer_id": batch["farmer_id"],
                "farmer_name": batch["farmer_name"],

                "center_id": batch["center_id"],
                "center_name": batch["center_name"],
                "center_code": batch["center_code"],
                "center_district": batch["center_district"],
                "center_address": batch["center_address"],

                "procurement_id": batch["procurement_id"],
                "procurement_quantity": batch["procurement_quantity"],
                "price_per_unit": batch["price_per_unit"],
                "procurement_date": batch["procurement_date"],

                "current_stage": batch["current_stage"],
                "batch_status": batch["batch_status"],
                "quality_status": batch["quality_status"],

                "created_at": batch["created_at"],
                "updated_at": batch["updated_at"]
            },

            "events": events

        }), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        connection.close()


# ============================================================
# CREATE ORDER
# ============================================================

@orders_bp.route("/", methods=["POST"])
def create_order():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = [
        "consumer_id",
        "crop_id",
        "quantity"
    ]

    for field in required_fields:

        if field not in data:

            return jsonify({
                "error": f"{field} is required"
            }), 400

    try:

        consumer_id = int(data["consumer_id"])
        crop_id = int(data["crop_id"])
        quantity = float(data["quantity"])

    except (ValueError, TypeError):

        return jsonify({
            "error": (
                "Consumer ID, crop ID and quantity "
                "must be valid"
            )
        }), 400

    if quantity <= 0:

        return jsonify({
            "error": "Quantity must be greater than 0"
        }), 400

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = connection.cursor(dictionary=True)

    try:

        # --------------------------------------------------------
        # CHECK CONSUMER
        # --------------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                username,
                role

            FROM users

            WHERE id = %s
            """,
            (consumer_id,)
        )

        consumer = cursor.fetchone()

        if not consumer:

            return jsonify({
                "error": "Consumer not found"
            }), 404

        if consumer["role"] != "CONSUMER":

            return jsonify({
                "error": "Selected user is not a consumer"
            }), 400

        # --------------------------------------------------------
        # CHECK CROP
        # --------------------------------------------------------

        cursor.execute(
            """
            SELECT *
            FROM crops
            WHERE id = %s
            """,
            (crop_id,)
        )

        crop = cursor.fetchone()

        if not crop:

            return jsonify({
                "error": "Crop not found"
            }), 404

        # --------------------------------------------------------
        # DETERMINE PRICE
        # --------------------------------------------------------

        price = (
            crop.get("msp")
            or crop.get("price")
            or crop.get("msp_price")
            or crop.get("minimum_support_price")
        )

        if price is None:

            return jsonify({
                "error": "Price is not available for this crop"
            }), 400

        try:

            price = float(price)

        except (ValueError, TypeError):

            return jsonify({
                "error": "Crop price is invalid"
            }), 400

        if price <= 0:

            return jsonify({
                "error": "Crop price must be greater than 0"
            }), 400

        total_amount = quantity * price

        # --------------------------------------------------------
        # CREATE ORDER
        # --------------------------------------------------------

        cursor.execute(
            """
            INSERT INTO consumer_orders
            (
                consumer_id,
                crop_id,
                quantity,
                price_per_unit,
                total_amount,
                status
            )

            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                'Pending'
            )
            """,
            (
                consumer_id,
                crop_id,
                quantity,
                price,
                total_amount
            )
        )

        order_id = cursor.lastrowid

        connection.commit()

        # --------------------------------------------------------
        # RETURN CREATED ORDER
        # --------------------------------------------------------

        cursor.execute(
            """
            SELECT
                o.id AS order_id,
                o.consumer_id,
                u.username AS consumer_name,

                o.crop_id,
                c.crop_name,

                o.quantity,
                o.price_per_unit,
                o.total_amount,
                o.status,
                o.order_date,
                o.updated_at

            FROM consumer_orders o

            JOIN users u
                ON o.consumer_id = u.id

            JOIN crops c
                ON o.crop_id = c.id

            WHERE o.id = %s
            """,
            (order_id,)
        )

        order = cursor.fetchone()

        return jsonify({

            "message": "Order created successfully",

            "order": order

        }), 201

    except Exception as e:

        connection.rollback()

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        connection.close()


# ============================================================
# UPDATE ORDER STATUS
# ============================================================

@orders_bp.route(
    "/<int:order_id>/status",
    methods=["PUT"]
)
def update_order_status(order_id):

    data = request.get_json()

    if not data or "status" not in data:

        return jsonify({
            "error": "Status is required"
        }), 400

    status = data["status"]

    allowed_statuses = [
        "Pending",
        "Confirmed",
        "Processing",
        "Ready",
        "Completed",
        "Cancelled"
    ]

    if status not in allowed_statuses:

        return jsonify({
            "error": "Invalid order status"
        }), 400

    connection = get_db_connection()

    if not connection:

        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT id
            FROM consumer_orders
            WHERE id = %s
            """,
            (order_id,)
        )

        order = cursor.fetchone()

        if not order:

            return jsonify({
                "error": "Order not found"
            }), 404

        cursor.execute(
            """
            UPDATE consumer_orders

            SET status = %s

            WHERE id = %s
            """,
            (
                status,
                order_id
            )
        )

        connection.commit()

        return jsonify({

            "message": (
                "Order status updated successfully"
            ),

            "order_id": order_id,

            "status": status

        }), 200

    except Exception as e:

        connection.rollback()

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        connection.close()


# ============================================================
# DELETE ORDER
# ============================================================

@orders_bp.route(
    "/<int:order_id>",
    methods=["DELETE"]
)
def delete_order(order_id):

    connection = get_db_connection()

    if not connection:

        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT id
            FROM consumer_orders
            WHERE id = %s
            """,
            (order_id,)
        )

        order = cursor.fetchone()

        if not order:

            return jsonify({
                "error": "Order not found"
            }), 404

        cursor.execute(
            """
            DELETE FROM consumer_orders
            WHERE id = %s
            """,
            (order_id,)
        )

        connection.commit()

        return jsonify({

            "message": "Order deleted successfully"

        }), 200

    except Exception as e:

        connection.rollback()

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        connection.close()