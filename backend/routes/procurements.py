from flask import Blueprint, request, jsonify
from datetime import date, datetime

from services.database import get_db_connection


procurements_bp = Blueprint("procurements", __name__)


# ============================================================
# DATE HELPERS
# ============================================================

def normalize_date(value):
    """
    Always return a Python date object.

    Accepted examples:
        2026-09-11
        2026-09-11T00:00:00
        Fri, 11 Sep 2026 00:00:00 GMT
        Python date/datetime objects
    """

    if value is None:
        return None

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    value = str(value).strip()

    if not value:
        return None

    # Standard MySQL date
    try:
        return datetime.strptime(
            value[:10],
            "%Y-%m-%d"
        ).date()
    except ValueError:
        pass

    # JavaScript Date.toString / GMT style
    formats = [
        "%a, %d %b %Y %H:%M:%S GMT",
        "%a %b %d %Y %H:%M:%S GMT%z",
        "%a %b %d %Y %H:%M:%S %Z",
        "%a %b %d %Y %H:%M:%S",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(
                value,
                fmt
            ).date()
        except ValueError:
            continue

    # ISO datetime fallback
    try:
        return datetime.fromisoformat(
            value.replace("Z", "+00:00")
        ).date()
    except ValueError:
        pass

    raise ValueError(
        "Invalid procurement date. "
        "Expected YYYY-MM-DD."
    )


# ============================================================
# GET ALL PROCUREMENTS
# ============================================================

@procurements_bp.route("/", methods=["GET"])
def get_procurements():

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = connection.cursor(
        dictionary=True
    )

    try:
        cursor.execute("""
            SELECT
                p.id AS procurement_id,
                p.farmer_id,
                f.name AS farmer_name,
                f.phone AS farmer_phone,

                p.crop_id,
                c.crop_name,

                p.center_id,
                pc.center_name,
                pc.center_code,
                pc.district AS center_district,

                p.quantity,
                p.price_per_unit,
                p.total_amount,
                p.procurement_date,
                p.status,

                p.queue_number,
                p.queue_position

            FROM procurements p

            JOIN farmers f
                ON p.farmer_id = f.id

            JOIN crops c
                ON p.crop_id = c.id

            JOIN procurement_centers pc
                ON p.center_id = pc.id

            ORDER BY p.id DESC
        """)

        procurements = cursor.fetchall()

        return jsonify(procurements), 200

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500

    finally:
        cursor.close()
        connection.close()


# ============================================================
# GET SINGLE PROCUREMENT
# ============================================================

@procurements_bp.route(
    "/<int:procurement_id>",
    methods=["GET"]
)
def get_procurement(procurement_id):

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = connection.cursor(
        dictionary=True
    )

    try:
        cursor.execute("""
            SELECT
                p.id AS procurement_id,

                p.farmer_id,
                f.name AS farmer_name,
                f.phone AS farmer_phone,

                p.crop_id,
                c.crop_name,

                p.center_id,
                pc.center_name,
                pc.center_code,
                pc.district AS center_district,

                p.quantity,
                p.price_per_unit,
                p.total_amount,
                p.procurement_date,
                p.status,

                p.queue_number,
                p.queue_position

            FROM procurements p

            JOIN farmers f
                ON p.farmer_id = f.id

            JOIN crops c
                ON p.crop_id = c.id

            JOIN procurement_centers pc
                ON p.center_id = pc.id

            WHERE p.id = %s
        """, (procurement_id,))

        procurement = cursor.fetchone()

        if not procurement:
            return jsonify({
                "error": "Procurement not found"
            }), 404

        return jsonify(procurement), 200

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500

    finally:
        cursor.close()
        connection.close()


# ============================================================
# CREATE PROCUREMENT
# ============================================================

@procurements_bp.route("/", methods=["POST"])
def create_procurement():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = [
        "farmer_id",
        "crop_id",
        "center_id",
        "quantity",
        "price_per_unit",
        "procurement_date"
    ]

    for field in required_fields:

        if field not in data:
            return jsonify({
                "error": f"{field} is required"
            }), 400

    # --------------------------------------------------------
    # DATE VALIDATION
    # --------------------------------------------------------

    try:
        procurement_date = normalize_date(
            data["procurement_date"]
        )

        if not procurement_date:
            raise ValueError

    except (ValueError, TypeError):
        return jsonify({
            "error": (
                "Invalid procurement date. "
                "Please use YYYY-MM-DD."
            )
        }), 400

    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    status = data.get(
        "status",
        "Pending"
    )

    allowed_statuses = [
        "Pending",
        "Approved",
        "Completed",
        "Cancelled"
    ]

    if status not in allowed_statuses:
        return jsonify({
            "error": "Invalid procurement status"
        }), 400

    # --------------------------------------------------------
    # NUMERIC VALIDATION
    # --------------------------------------------------------

    try:
        quantity = float(
            data["quantity"]
        )

        price_per_unit = float(
            data["price_per_unit"]
        )

    except (ValueError, TypeError):

        return jsonify({
            "error": (
                "Quantity and price per unit "
                "must be valid numbers"
            )
        }), 400

    if quantity <= 0:
        return jsonify({
            "error": "Quantity must be greater than 0"
        }), 400

    if price_per_unit <= 0:
        return jsonify({
            "error": (
                "Price per unit must be "
                "greater than 0"
            )
        }), 400

    total_amount = (
        quantity * price_per_unit
    )

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = connection.cursor(
        dictionary=True
    )

    try:

        # ====================================================
        # CHECK FARMER
        # ====================================================

        cursor.execute("""
            SELECT id
            FROM farmers
            WHERE id = %s
        """, (data["farmer_id"],))

        farmer = cursor.fetchone()

        if not farmer:
            return jsonify({
                "error": "Farmer not found"
            }), 404

        # ====================================================
        # CHECK CROP
        # ====================================================

        cursor.execute("""
            SELECT id
            FROM crops
            WHERE id = %s
        """, (data["crop_id"],))

        crop = cursor.fetchone()

        if not crop:
            return jsonify({
                "error": "Crop not found"
            }), 404

        # ====================================================
        # CHECK CENTER
        # ====================================================

        cursor.execute("""
            SELECT
                id,
                center_code,
                center_name,
                capacity_per_day
            FROM procurement_centers
            WHERE id = %s
        """, (data["center_id"],))

        center = cursor.fetchone()

        if not center:
            return jsonify({
                "error": (
                    "Procurement center not found"
                )
            }), 404

        # ====================================================
        # CAPACITY VALIDATION
        # ====================================================

        cursor.execute("""
            SELECT
                COALESCE(
                    SUM(quantity),
                    0
                ) AS used_capacity

            FROM procurements

            WHERE center_id = %s
            AND procurement_date = %s
            AND status != 'Cancelled'
        """, (
            data["center_id"],
            procurement_date
        ))

        capacity_result = cursor.fetchone()

        used_capacity = float(
            capacity_result[
                "used_capacity"
            ] or 0
        )

        center_capacity = float(
            center["capacity_per_day"] or 0
        )

        remaining_capacity = max(
            center_capacity - used_capacity,
            0
        )

        if quantity > remaining_capacity:

            return jsonify({
                "error": (
                    "Selected procurement center "
                    "does not have enough "
                    "remaining capacity"
                ),
                "capacity_per_day":
                    center_capacity,
                "used_capacity":
                    used_capacity,
                "remaining_capacity":
                    remaining_capacity,
                "requested_quantity":
                    quantity
            }), 400

        # ====================================================
        # QUEUE NUMBER
        # ====================================================

        queue_number = None
        queue_position = None

        if status in [
            "Pending",
            "Approved"
        ]:

            cursor.execute("""
                SELECT
                    COALESCE(
                        MAX(queue_position),
                        0
                    ) AS last_position

                FROM procurements

                WHERE center_id = %s
                AND procurement_date = %s
                AND status IN (
                    'Pending',
                    'Approved'
                )
            """, (
                data["center_id"],
                procurement_date
            ))

            queue_result = cursor.fetchone()

            last_position = int(
                queue_result[
                    "last_position"
                ] or 0
            )

            queue_position = (
                last_position + 1
            )

            queue_number = (
                f"{center['center_code']}-"
                f"{queue_position:03d}"
            )

        # ====================================================
        # INSERT
        # ====================================================

        cursor.execute("""
            INSERT INTO procurements
            (
                farmer_id,
                crop_id,
                center_id,
                quantity,
                price_per_unit,
                total_amount,
                procurement_date,
                status,
                queue_number,
                queue_position
            )

            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
        """, (
            data["farmer_id"],
            data["crop_id"],
            data["center_id"],
            quantity,
            price_per_unit,
            total_amount,
            procurement_date,
            status,
            queue_number,
            queue_position
        ))

        connection.commit()

        procurement_id = (
            cursor.lastrowid
        )

        return jsonify({
            "message":
                "Procurement created successfully",

            "procurement_id":
                procurement_id,

            "total_amount":
                total_amount,

            "status":
                status,

            "queue_number":
                queue_number,

            "queue_position":
                queue_position,

            "procurement_date":
                procurement_date.isoformat(),

            "center": {
                "center_id":
                    center["id"],

                "center_code":
                    center["center_code"],

                "center_name":
                    center["center_name"]
            },

            "capacity": {
                "capacity_per_day":
                    center_capacity,

                "used_capacity":
                    used_capacity,

                "remaining_capacity":
                    max(
                        remaining_capacity -
                        quantity,
                        0
                    )
            }

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
# UPDATE PROCUREMENT
# ============================================================

@procurements_bp.route(
    "/<int:procurement_id>",
    methods=["PUT"]
)
def update_procurement(procurement_id):

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = connection.cursor(
        dictionary=True
    )

    try:

        # ====================================================
        # GET EXISTING
        # ====================================================

        cursor.execute("""
            SELECT *
            FROM procurements
            WHERE id = %s
        """, (procurement_id,))

        existing = cursor.fetchone()

        if not existing:
            return jsonify({
                "error": "Procurement not found"
            }), 404

        # ====================================================
        # GET UPDATED VALUES
        # ====================================================

        farmer_id = data.get(
            "farmer_id",
            existing["farmer_id"]
        )

        crop_id = data.get(
            "crop_id",
            existing["crop_id"]
        )

        center_id = data.get(
            "center_id",
            existing["center_id"]
        )

        try:

            quantity = float(
                data.get(
                    "quantity",
                    existing["quantity"]
                )
            )

            price_per_unit = float(
                data.get(
                    "price_per_unit",
                    existing["price_per_unit"]
                )
            )

        except (ValueError, TypeError):

            return jsonify({
                "error": (
                    "Quantity and price per unit "
                    "must be valid numbers"
                )
            }), 400

        if quantity <= 0:
            return jsonify({
                "error": (
                    "Quantity must be greater "
                    "than 0"
                )
            }), 400

        if price_per_unit <= 0:
            return jsonify({
                "error": (
                    "Price per unit must be "
                    "greater than 0"
                )
            }), 400

        # ====================================================
        # DATE
        #
        # IMPORTANT:
        # If the frontend sends ONLY status,
        # existing date is retained.
        #
        # If frontend sends a JavaScript date string,
        # normalize_date() converts it safely.
        # ====================================================

        raw_date = data.get(
            "procurement_date",
            existing["procurement_date"]
        )

        try:

            procurement_date = normalize_date(
                raw_date
            )

            if not procurement_date:
                raise ValueError

        except (ValueError, TypeError):

            return jsonify({
                "error": (
                    "Invalid procurement date. "
                    "Please use YYYY-MM-DD."
                )
            }), 400

        status = data.get(
            "status",
            existing["status"]
        )

        allowed_statuses = [
            "Pending",
            "Approved",
            "Completed",
            "Cancelled"
        ]

        if status not in allowed_statuses:

            return jsonify({
                "error": "Invalid procurement status"
            }), 400

        # ====================================================
        # CHECK FARMER
        # ====================================================

        cursor.execute("""
            SELECT id
            FROM farmers
            WHERE id = %s
        """, (farmer_id,))

        if not cursor.fetchone():

            return jsonify({
                "error": "Farmer not found"
            }), 404

        # ====================================================
        # CHECK CROP
        # ====================================================

        cursor.execute("""
            SELECT id
            FROM crops
            WHERE id = %s
        """, (crop_id,))

        if not cursor.fetchone():

            return jsonify({
                "error": "Crop not found"
            }), 404

        # ====================================================
        # CHECK CENTER
        # ====================================================

        cursor.execute("""
            SELECT
                id,
                center_code,
                center_name,
                capacity_per_day
            FROM procurement_centers
            WHERE id = %s
        """, (center_id,))

        center = cursor.fetchone()

        if not center:

            return jsonify({
                "error":
                    "Procurement center not found"
            }), 404

        # ====================================================
        # CAPACITY
        # ====================================================

        cursor.execute("""
            SELECT
                COALESCE(
                    SUM(quantity),
                    0
                ) AS used_capacity

            FROM procurements

            WHERE center_id = %s
            AND procurement_date = %s
            AND status != 'Cancelled'
            AND id != %s
        """, (
            center_id,
            procurement_date,
            procurement_id
        ))

        capacity_result = cursor.fetchone()

        used_capacity = float(
            capacity_result[
                "used_capacity"
            ] or 0
        )

        center_capacity = float(
            center["capacity_per_day"] or 0
        )

        remaining_capacity = max(
            center_capacity -
            used_capacity,
            0
        )

        if quantity > remaining_capacity:

            return jsonify({
                "error": (
                    "Selected procurement center "
                    "does not have enough "
                    "remaining capacity"
                ),

                "capacity_per_day":
                    center_capacity,

                "used_capacity":
                    used_capacity,

                "remaining_capacity":
                    remaining_capacity,

                "requested_quantity":
                    quantity
            }), 400

        # ====================================================
        # TOTAL
        # ====================================================

        total_amount = (
            quantity *
            price_per_unit
        )

        # ====================================================
        # QUEUE
        # ====================================================

        queue_number = existing.get(
            "queue_number"
        )

        queue_position = existing.get(
            "queue_position"
        )

        old_active = (
            existing["status"]
            in ["Pending", "Approved"]
        )

        new_active = (
            status
            in ["Pending", "Approved"]
        )

        center_changed = (
            center_id !=
            existing["center_id"]
        )

        old_date = normalize_date(
            existing["procurement_date"]
        )

        date_changed = (
            procurement_date !=
            old_date
        )

        # ----------------------------------------------------
        # Completed / Cancelled
        # ----------------------------------------------------

        if not new_active:

            queue_number = None
            queue_position = None

        # ----------------------------------------------------
        # New active queue
        # ----------------------------------------------------

        elif (
            not old_active
            or center_changed
            or date_changed
            or not queue_position
        ):

            cursor.execute("""
                SELECT
                    COALESCE(
                        MAX(queue_position),
                        0
                    ) AS last_position

                FROM procurements

                WHERE center_id = %s
                AND procurement_date = %s
                AND status IN (
                    'Pending',
                    'Approved'
                )
                AND id != %s
            """, (
                center_id,
                procurement_date,
                procurement_id
            ))

            queue_result = cursor.fetchone()

            last_position = int(
                queue_result[
                    "last_position"
                ] or 0
            )

            queue_position = (
                last_position + 1
            )

            queue_number = (
                f"{center['center_code']}-"
                f"{queue_position:03d}"
            )

        # ====================================================
        # UPDATE
        # ====================================================

        cursor.execute("""
            UPDATE procurements

            SET
                farmer_id = %s,
                crop_id = %s,
                center_id = %s,
                quantity = %s,
                price_per_unit = %s,
                total_amount = %s,
                procurement_date = %s,
                status = %s,
                queue_number = %s,
                queue_position = %s

            WHERE id = %s
        """, (
            farmer_id,
            crop_id,
            center_id,
            quantity,
            price_per_unit,
            total_amount,
            procurement_date,
            status,
            queue_number,
            queue_position,
            procurement_id
        ))

        connection.commit()

        return jsonify({

            "message":
                "Procurement updated successfully",

            "procurement_id":
                procurement_id,

            "total_amount":
                total_amount,

            "status":
                status,

            "queue_number":
                queue_number,

            "queue_position":
                queue_position,

            "procurement_date":
                procurement_date.isoformat()

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
# DELETE PROCUREMENT
# ============================================================

@procurements_bp.route(
    "/<int:procurement_id>",
    methods=["DELETE"]
)
def delete_procurement(procurement_id):

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = connection.cursor()

    try:

        cursor.execute("""
            SELECT id
            FROM procurements
            WHERE id = %s
        """, (procurement_id,))

        if not cursor.fetchone():

            return jsonify({
                "error": "Procurement not found"
            }), 404

        cursor.execute("""
            DELETE FROM procurements
            WHERE id = %s
        """, (procurement_id,))

        connection.commit()

        return jsonify({
            "message":
                "Procurement deleted successfully"
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
# SUPPLY CHAIN
# ============================================================

@procurements_bp.route(
    "/supply-chain",
    methods=["GET"]
)
def get_supply_chain_batches():

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error":
                "Database connection failed"
        }), 500

    cursor = connection.cursor(
        dictionary=True
    )

    try:

        cursor.execute("""
            SELECT
                b.id AS batch_id,
                b.procurement_id,
                b.batch_code,
                b.traceability_id,
                b.current_stage,
                b.status AS batch_status,
                b.quality_status,
                b.created_at,
                b.updated_at,

                p.farmer_id,
                f.name AS farmer_name,
                f.phone AS farmer_phone,

                p.crop_id,
                c.crop_name,

                p.center_id,
                pc.center_name,
                pc.center_code,
                pc.district AS center_district,
                pc.address AS center_address,

                p.quantity,
                p.price_per_unit,
                p.total_amount,
                p.procurement_date,
                p.status AS procurement_status

            FROM supply_chain_batches b

            JOIN procurements p
                ON b.procurement_id = p.id

            JOIN farmers f
                ON p.farmer_id = f.id

            JOIN crops c
                ON p.crop_id = c.id

            JOIN procurement_centers pc
                ON p.center_id = pc.id

            ORDER BY b.id DESC
        """)

        batches = cursor.fetchall()

        return jsonify(batches), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        connection.close()


# ============================================================
# GET SUPPLY CHAIN BATCH
# ============================================================

@procurements_bp.route(
    "/supply-chain/<int:batch_id>",
    methods=["GET"]
)
def get_supply_chain_batch(batch_id):

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error":
                "Database connection failed"
        }), 500

    cursor = connection.cursor(
        dictionary=True
    )

    try:

        cursor.execute("""
            SELECT
                b.id AS batch_id,
                b.procurement_id,
                b.batch_code,
                b.traceability_id,
                b.current_stage,
                b.status AS batch_status,
                b.quality_status,
                b.created_at,
                b.updated_at,

                p.farmer_id,
                f.name AS farmer_name,
                f.phone AS farmer_phone,

                p.crop_id,
                c.crop_name,

                p.center_id,
                pc.center_name,
                pc.center_code,
                pc.district AS center_district,
                pc.address AS center_address,

                p.quantity,
                p.price_per_unit,
                p.total_amount,
                p.procurement_date,
                p.status AS procurement_status

            FROM supply_chain_batches b

            JOIN procurements p
                ON b.procurement_id = p.id

            JOIN farmers f
                ON p.farmer_id = f.id

            JOIN crops c
                ON p.crop_id = c.id

            JOIN procurement_centers pc
                ON p.center_id = pc.id

            WHERE b.id = %s
        """, (batch_id,))

        batch = cursor.fetchone()

        if not batch:

            return jsonify({
                "error":
                    "Supply chain batch not found"
            }), 404

        cursor.execute("""
            SELECT
                id,
                stage,
                event_status,
                notes,
                event_time

            FROM supply_chain_events

            WHERE batch_id = %s

            ORDER BY
                event_time ASC,
                id ASC
        """, (batch_id,))

        batch["events"] = (
            cursor.fetchall()
        )

        return jsonify(batch), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        connection.close()


# ============================================================
# UPDATE SUPPLY CHAIN STAGE
# ============================================================

@procurements_bp.route(
    "/supply-chain/<int:batch_id>/stage",
    methods=["PUT"]
)
def update_supply_chain_stage(batch_id):

    data = request.get_json()

    if not data:
        return jsonify({
            "error":
                "Request body is required"
        }), 400

    stage = data.get("stage")

    batch_status = data.get(
        "status",
        "Active"
    )

    quality_status = data.get(
        "quality_status",
        "Pending"
    )

    notes = data.get(
        "notes",
        ""
    )

    allowed_stages = [
        "Farmer Harvest",
        "Procurement Center",
        "Quality Check",
        "Storage",
        "Distribution",
        "Delivered"
    ]

    allowed_statuses = [
        "Active",
        "Completed",
        "On Hold"
    ]

    allowed_quality = [
        "Pending",
        "Passed",
        "Needs Review",
        "Failed"
    ]

    if stage not in allowed_stages:

        return jsonify({
            "error":
                "Invalid supply chain stage"
        }), 400

    if batch_status not in allowed_statuses:

        return jsonify({
            "error":
                "Invalid batch status"
        }), 400

    if quality_status not in allowed_quality:

        return jsonify({
            "error":
                "Invalid quality status"
        }), 400

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error":
                "Database connection failed"
        }), 500

    cursor = connection.cursor(
        dictionary=True
    )

    try:

        cursor.execute("""
            SELECT id
            FROM supply_chain_batches
            WHERE id = %s
        """, (batch_id,))

        if not cursor.fetchone():

            return jsonify({
                "error":
                    "Supply chain batch not found"
            }), 404

        cursor.execute("""
            UPDATE supply_chain_batches

            SET
                current_stage = %s,
                status = %s,
                quality_status = %s

            WHERE id = %s
        """, (
            stage,
            batch_status,
            quality_status,
            batch_id
        ))

        cursor.execute("""
            INSERT INTO supply_chain_events
            (
                batch_id,
                stage,
                event_status,
                notes
            )

            VALUES
            (
                %s,
                %s,
                %s,
                %s
            )
        """, (
            batch_id,
            stage,
            batch_status,
            notes
        ))

        connection.commit()

        return jsonify({
            "message":
                "Supply chain stage updated successfully",

            "batch_id":
                batch_id,

            "stage":
                stage,

            "status":
                batch_status,

            "quality_status":
                quality_status

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
# TRACEABILITY
# ============================================================

@procurements_bp.route(
    "/traceability/<string:traceability_id>",
    methods=["GET"]
)
def get_traceability(traceability_id):

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error":
                "Database connection failed"
        }), 500

    cursor = connection.cursor(
        dictionary=True
    )

    try:

        cursor.execute("""
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

                f.id AS farmer_id,
                f.name AS farmer_name,

                c.id AS crop_id,
                c.crop_name,

                p.quantity,
                p.price_per_unit,
                p.procurement_date,

                pc.id AS center_id,
                pc.center_name,
                pc.center_code,
                pc.district AS center_district

            FROM supply_chain_batches b

            JOIN procurements p
                ON b.procurement_id = p.id

            JOIN farmers f
                ON p.farmer_id = f.id

            JOIN crops c
                ON p.crop_id = c.id

            JOIN procurement_centers pc
                ON p.center_id = pc.id

            WHERE b.traceability_id = %s
        """, (traceability_id,))

        batch = cursor.fetchone()

        if not batch:

            return jsonify({
                "error":
                    "Traceability ID not found"
            }), 404

        cursor.execute("""
            SELECT
                id,
                stage,
                event_status,
                notes,
                event_time

            FROM supply_chain_events

            WHERE batch_id = %s

            ORDER BY
                event_time ASC,
                id ASC
        """, (batch["batch_id"],))

        batch["timeline"] = (
            cursor.fetchall()
        )

        return jsonify(batch), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        connection.close()