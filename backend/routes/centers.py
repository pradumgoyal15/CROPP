from datetime import date

from flask import Blueprint, jsonify, request

from services.database import get_db_connection
from services.smart_allotment import calculate_center_score


centers_bp = Blueprint("centers", __name__)


# ============================================================
# HELPER - CENTER STATUS
# ============================================================

def get_center_status(utilization, queue_count):
    utilization = float(utilization or 0)
    queue_count = int(queue_count or 0)

    if utilization >= 90:
        return "Near Full"

    if utilization >= 70 or queue_count >= 10:
        return "Busy"

    return "Normal"


# ============================================================
# HELPER - VALIDATE LOCATION
# ============================================================

def validate_coordinates(latitude, longitude):
    if latitude in [None, ""] or longitude in [None, ""]:
        return None, None, "Latitude and longitude are required"

    try:
        latitude = float(latitude)
        longitude = float(longitude)
    except (ValueError, TypeError):
        return None, None, "Latitude and longitude must be valid numbers"

    if latitude < -90 or latitude > 90:
        return None, None, "Latitude must be between -90 and 90"

    if longitude < -180 or longitude > 180:
        return None, None, "Longitude must be between -180 and 180"

    return latitude, longitude, None


# ============================================================
# GET ALL PROCUREMENT CENTERS
# ============================================================

@centers_bp.route("/", methods=["GET"])
def get_centers():

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT *
            FROM procurement_centers
            ORDER BY id ASC
        """)

        centers = cursor.fetchall()

        return jsonify(centers), 200

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
# GET SINGLE PROCUREMENT CENTER
# ============================================================

@centers_bp.route("/<int:center_id>", methods=["GET"])
def get_center(center_id):

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT *
            FROM procurement_centers
            WHERE id = %s
        """, (center_id,))

        center = cursor.fetchone()

        if not center:
            return jsonify({
                "error": "Procurement center not found"
            }), 404

        return jsonify(center), 200

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
# ADD PROCUREMENT CENTER
# ============================================================

@centers_bp.route("/", methods=["POST"])
def add_center():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = [
        "center_name",
        "center_code",
        "state",
        "district",
        "address",
        "capacity_per_day",
        "contact_number"
    ]

    for field in required_fields:

        if field not in data or data[field] == "":

            return jsonify({
                "error": f"{field} is required"
            }), 400

    latitude = data.get("latitude")
    longitude = data.get("longitude")

    # Coordinates are optional while creating a center.
    if latitude not in [None, ""] or longitude not in [None, ""]:

        latitude, longitude, location_error = validate_coordinates(
            latitude,
            longitude
        )

        if location_error:

            return jsonify({
                "error": location_error
            }), 400

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor()

        query = """
            INSERT INTO procurement_centers
            (
                center_name,
                center_code,
                state,
                district,
                address,
                capacity_per_day,
                contact_number,
                latitude,
                longitude
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        values = (
            data["center_name"],
            data["center_code"],
            data["state"],
            data["district"],
            data["address"],
            data["capacity_per_day"],
            data["contact_number"],
            latitude,
            longitude
        )

        cursor.execute(query, values)

        connection.commit()

        center_id = cursor.lastrowid

        return jsonify({
            "message": "Procurement center added successfully",
            "center_id": center_id
        }), 201

    except Exception as e:

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
# UPDATE PROCUREMENT CENTER
# ============================================================

@centers_bp.route("/<int:center_id>", methods=["PUT"])
def update_center(center_id):

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

    cursor = None

    try:

        cursor = connection.cursor(dictionary=True)

        # ----------------------------------------------------
        # Get existing center first.
        # This prevents older frontend forms from accidentally
        # deleting saved latitude/longitude.
        # ----------------------------------------------------

        cursor.execute("""
            SELECT
                latitude,
                longitude
            FROM procurement_centers
            WHERE id = %s
        """, (center_id,))

        existing_center = cursor.fetchone()

        if not existing_center:

            return jsonify({
                "error": "Procurement center not found"
            }), 404

        latitude = data.get(
            "latitude",
            existing_center["latitude"]
        )

        longitude = data.get(
            "longitude",
            existing_center["longitude"]
        )

        if latitude in [None, ""]:

            latitude = existing_center["latitude"]

        if longitude in [None, ""]:

            longitude = existing_center["longitude"]

        if latitude is not None or longitude is not None:

            latitude, longitude, location_error = validate_coordinates(
                latitude,
                longitude
            )

            if location_error:

                return jsonify({
                    "error": location_error
                }), 400

        query = """
            UPDATE procurement_centers
            SET
                center_name = %s,
                center_code = %s,
                state = %s,
                district = %s,
                address = %s,
                capacity_per_day = %s,
                contact_number = %s,
                latitude = %s,
                longitude = %s
            WHERE id = %s
        """

        values = (
            data["center_name"],
            data["center_code"],
            data["state"],
            data["district"],
            data["address"],
            data["capacity_per_day"],
            data["contact_number"],
            latitude,
            longitude,
            center_id
        )

        cursor.execute(query, values)

        connection.commit()

        return jsonify({
            "message": "Procurement center updated successfully"
        }), 200

    except Exception as e:

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
# UPDATE CENTER LOCATION ONLY
# ============================================================

@centers_bp.route("/<int:center_id>/location", methods=["PUT"])
def update_center_location(center_id):

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    latitude = data.get("latitude")
    longitude = data.get("longitude")

    latitude, longitude, location_error = validate_coordinates(
        latitude,
        longitude
    )

    if location_error:

        return jsonify({
            "error": location_error
        }), 400

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor()

        cursor.execute("""
            UPDATE procurement_centers
            SET
                latitude = %s,
                longitude = %s
            WHERE id = %s
        """, (
            latitude,
            longitude,
            center_id
        ))

        connection.commit()

        if cursor.rowcount == 0:

            cursor.execute("""
                SELECT id
                FROM procurement_centers
                WHERE id = %s
            """, (center_id,))

            exists = cursor.fetchone()

            if not exists:

                return jsonify({
                    "error": "Procurement center not found"
                }), 404

        return jsonify({
            "message": "Center location updated successfully",
            "center_id": center_id,
            "latitude": latitude,
            "longitude": longitude
        }), 200

    except Exception as e:

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
# DELETE PROCUREMENT CENTER
# ============================================================

@centers_bp.route("/<int:center_id>", methods=["DELETE"])
def delete_center(center_id):

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor()

        cursor.execute("""
            DELETE FROM procurement_centers
            WHERE id = %s
        """, (center_id,))

        connection.commit()

        affected_rows = cursor.rowcount

        if affected_rows == 0:

            return jsonify({
                "error": "Procurement center not found"
            }), 404

        return jsonify({
            "message": "Procurement center deleted successfully"
        }), 200

    except Exception as e:

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
# GET CENTER CAPACITY
# ============================================================

@centers_bp.route("/<int:center_id>/capacity", methods=["GET"])
def get_center_capacity(center_id):

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor(dictionary=True)

        procurement_date = request.args.get("date")

        if not procurement_date:

            return jsonify({
                "error": "Procurement date is required"
            }), 400

        cursor.execute("""
            SELECT
                id,
                center_name,
                capacity_per_day
            FROM procurement_centers
            WHERE id = %s
        """, (center_id,))

        center = cursor.fetchone()

        if not center:

            return jsonify({
                "error": "Procurement center not found"
            }), 404

        cursor.execute("""
            SELECT
                COALESCE(SUM(quantity), 0) AS used_capacity
            FROM procurements
            WHERE center_id = %s
              AND procurement_date = %s
              AND status != 'Cancelled'
        """, (
            center_id,
            procurement_date
        ))

        result = cursor.fetchone()

        used_capacity = float(
            result["used_capacity"] or 0
        )

        total_capacity = float(
            center["capacity_per_day"] or 0
        )

        remaining_capacity = max(
            total_capacity - used_capacity,
            0
        )

        utilization_percentage = (
            (used_capacity / total_capacity) * 100
            if total_capacity > 0
            else 0
        )

        return jsonify({
            "center_id": center["id"],
            "center_name": center["center_name"],
            "procurement_date": procurement_date,
            "capacity_per_day": total_capacity,
            "used_capacity": used_capacity,
            "remaining_capacity": remaining_capacity,
            "utilization_percentage": round(
                utilization_percentage,
                2
            )
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


# ============================================================
# LIVE MAP / CENTER MONITORING
# ============================================================

@centers_bp.route("/live-monitoring", methods=["GET"])
def live_monitoring():

    monitoring_date = request.args.get("date")

    if not monitoring_date:
        monitoring_date = date.today().isoformat()

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                pc.id,
                pc.center_name,
                pc.center_code,
                pc.state,
                pc.district,
                pc.address,
                pc.capacity_per_day,
                pc.contact_number,
                pc.latitude,
                pc.longitude,

                COALESCE(
                    SUM(
                        CASE
                            WHEN p.status != 'Cancelled'
                            THEN p.quantity
                            ELSE 0
                        END
                    ),
                    0
                ) AS used_capacity,

                COUNT(
                    CASE
                        WHEN p.status IN ('Pending', 'Approved')
                        THEN 1
                    END
                ) AS active_queue,

                COUNT(
                    CASE
                        WHEN p.status = 'Pending'
                        THEN 1
                    END
                ) AS pending_count,

                COUNT(
                    CASE
                        WHEN p.status = 'Approved'
                        THEN 1
                    END
                ) AS approved_count,

                COUNT(
                    CASE
                        WHEN p.status = 'Completed'
                        THEN 1
                    END
                ) AS completed_count,

                COALESCE(
                    SUM(
                        CASE
                            WHEN p.status IN ('Pending', 'Approved')
                            THEN p.quantity
                            ELSE 0
                        END
                    ),
                    0
                ) AS queued_quantity

            FROM procurement_centers pc

            LEFT JOIN procurements p
                ON pc.id = p.center_id
                AND p.procurement_date = %s

            GROUP BY
                pc.id,
                pc.center_name,
                pc.center_code,
                pc.state,
                pc.district,
                pc.address,
                pc.capacity_per_day,
                pc.contact_number,
                pc.latitude,
                pc.longitude

            ORDER BY pc.id ASC
        """, (monitoring_date,))

        centers = cursor.fetchall()

        total_capacity = 0
        total_used = 0
        total_queue = 0
        total_queued_quantity = 0

        normal_centers = 0
        busy_centers = 0
        near_full_centers = 0
        located_centers = 0
        unlocated_centers = 0

        for center in centers:

            capacity = float(
                center["capacity_per_day"] or 0
            )

            used = float(
                center["used_capacity"] or 0
            )

            queue = int(
                center["active_queue"] or 0
            )

            pending = int(
                center["pending_count"] or 0
            )

            approved = int(
                center["approved_count"] or 0
            )

            completed = int(
                center["completed_count"] or 0
            )

            queued_quantity = float(
                center["queued_quantity"] or 0
            )

            utilization = (
                (used / capacity) * 100
                if capacity > 0
                else 0
            )

            remaining = max(
                capacity - used,
                0
            )

            status = get_center_status(
                utilization,
                queue
            )

            center["capacity_per_day"] = round(
                capacity,
                2
            )

            center["used_capacity"] = round(
                used,
                2
            )

            center["remaining_capacity"] = round(
                remaining,
                2
            )

            center["utilization_percentage"] = round(
                utilization,
                2
            )

            center["active_queue"] = queue

            center["pending_count"] = pending

            center["approved_count"] = approved

            center["completed_count"] = completed

            center["queued_quantity"] = round(
                queued_quantity,
                2
            )

            center["status"] = status

            center["has_location"] = (
                center["latitude"] is not None
                and center["longitude"] is not None
            )

            if center["has_location"]:
                located_centers += 1
            else:
                unlocated_centers += 1

            if status == "Normal":
                normal_centers += 1

            elif status == "Busy":
                busy_centers += 1

            elif status == "Near Full":
                near_full_centers += 1

            total_capacity += capacity
            total_used += used
            total_queue += queue
            total_queued_quantity += queued_quantity

        overall_utilization = (
            (total_used / total_capacity) * 100
            if total_capacity > 0
            else 0
        )

        return jsonify({

            "date": monitoring_date,

            "summary": {

                "total_centers": len(centers),

                "total_capacity": round(
                    total_capacity,
                    2
                ),

                "total_used_capacity": round(
                    total_used,
                    2
                ),

                "total_remaining_capacity": round(
                    max(
                        total_capacity - total_used,
                        0
                    ),
                    2
                ),

                "overall_utilization": round(
                    overall_utilization,
                    2
                ),

                "active_queue": total_queue,

                "queued_quantity": round(
                    total_queued_quantity,
                    2
                ),

                "normal_centers": normal_centers,

                "busy_centers": busy_centers,

                "near_full_centers": near_full_centers,

                "located_centers": located_centers,

                "unlocated_centers": unlocated_centers
            },

            "centers": centers

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


# ============================================================
# SMART ALLOTMENT
# ============================================================

@centers_bp.route("/smart-allotment", methods=["GET"])
def smart_allotment():

    farmer_id = request.args.get("farmer_id")
    quantity = request.args.get("quantity")
    procurement_date = request.args.get("date")

    if not quantity or not procurement_date:

        return jsonify({
            "error": "Quantity and procurement date are required"
        }), 400

    try:

        quantity = float(quantity)

        if quantity <= 0:
            return jsonify({
                "error": "Quantity must be greater than zero"
            }), 400

    except (ValueError, TypeError):

        return jsonify({
            "error": "Quantity must be a valid number"
        }), 400

    connection = get_db_connection()

    if connection is None:

        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                center_code,
                center_name,
                contact_number,
                address,
                district,
                state,
                capacity_per_day,
                latitude,
                longitude
            FROM procurement_centers
            ORDER BY id ASC
        """)

        centers = cursor.fetchall()

        recommendations = []

        for center in centers:

            cursor.execute("""
                SELECT
                    COALESCE(SUM(quantity), 0) AS used_capacity
                FROM procurements
                WHERE center_id = %s
                  AND procurement_date = %s
                  AND status != 'Cancelled'
            """, (
                center["id"],
                procurement_date
            ))

            capacity_result = cursor.fetchone()

            used_capacity = float(
                capacity_result["used_capacity"] or 0
            )

            cursor.execute("""
                SELECT
                    COUNT(*) AS queue_count
                FROM procurements
                WHERE center_id = %s
                  AND procurement_date = %s
                  AND status IN ('Pending', 'Approved')
            """, (
                center["id"],
                procurement_date
            ))

            queue_result = cursor.fetchone()

            queue_count = int(
                queue_result["queue_count"] or 0
            )

            # ------------------------------------------------
            # Distance remains 0 until farmer GPS/location
            # is connected.
            # ------------------------------------------------

            distance_km = 0

            scoring = calculate_center_score(
                capacity_per_day=center["capacity_per_day"],
                used_capacity=used_capacity,
                queue_count=queue_count,
                distance_km=distance_km
            )

            can_handle = (
                scoring["available_capacity"] >= quantity
            )

            recommendations.append({

                "center_id": center["id"],

                "center_code": center["center_code"],

                "center_name": center["center_name"],

                "address": center["address"],

                "district": center["district"],

                "state": center["state"],

                "contact_number": center["contact_number"],

                "capacity_per_day": float(
                    center["capacity_per_day"] or 0
                ),

                "used_capacity": round(
                    used_capacity,
                    2
                ),

                "available_capacity": scoring[
                    "available_capacity"
                ],

                "queue_count": queue_count,

                "utilization_percentage": scoring[
                    "utilization"
                ],

                "estimated_wait_minutes": scoring[
                    "estimated_wait_minutes"
                ],

                "distance_km": distance_km,

                "score": scoring["score"],

                "can_handle": can_handle,

                "latitude": center["latitude"],

                "longitude": center["longitude"],

                "has_location": (
                    center["latitude"] is not None
                    and center["longitude"] is not None
                )
            })

        recommendations.sort(
            key=lambda x: (
                x["can_handle"],
                x["score"]
            ),
            reverse=True
        )

        for index, recommendation in enumerate(
            recommendations,
            start=1
        ):

            recommendation["rank"] = index

        best_center = None

        for recommendation in recommendations:

            if recommendation["can_handle"]:

                best_center = recommendation

                break

        return jsonify({

            "farmer_id": farmer_id,

            "requested_quantity": quantity,

            "procurement_date": procurement_date,

            "recommended_center": best_center,

            "recommendations": recommendations

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