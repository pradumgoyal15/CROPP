from flask import Blueprint, request, jsonify
from services.database import get_db_connection


notifications_bp = Blueprint(
    "notifications",
    __name__
)


# ============================================================
# GET FARMER NOTIFICATIONS
# ============================================================

@notifications_bp.route(
    "/farmer/<int:farmer_id>",
    methods=["GET"]
)
def get_farmer_notifications(farmer_id):

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor(
            dictionary=True
        )

        query = """
            SELECT
                n.id AS notification_id,
                n.farmer_id,
                n.procurement_id,
                n.title,
                n.message,
                n.notification_type,
                n.is_read,
                n.created_at,

                p.status AS procurement_status,
                p.queue_number,

                c.crop_name,

                pc.center_name

            FROM notifications n

            LEFT JOIN procurements p
                ON n.procurement_id = p.id

            LEFT JOIN crops c
                ON p.crop_id = c.id

            LEFT JOIN procurement_centers pc
                ON p.center_id = pc.id

            WHERE n.farmer_id = %s

            ORDER BY
                n.is_read ASC,
                n.created_at DESC
        """

        cursor.execute(
            query,
            (farmer_id,)
        )

        notifications = cursor.fetchall()

        # Convert MySQL datetime/date values to strings
        for notification in notifications:

            if notification.get("created_at"):

                notification["created_at"] = str(
                    notification["created_at"]
                )

        return jsonify(
            notifications
        ), 200

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
# GET UNREAD COUNT
# ============================================================

@notifications_bp.route(
    "/farmer/<int:farmer_id>/unread-count",
    methods=["GET"]
)
def get_unread_count(farmer_id):

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor(
            dictionary=True
        )

        query = """
            SELECT
                COUNT(*) AS unread_count

            FROM notifications

            WHERE farmer_id = %s

            AND is_read = FALSE
        """

        cursor.execute(
            query,
            (farmer_id,)
        )

        result = cursor.fetchone()

        return jsonify({
            "farmer_id": farmer_id,
            "unread_count": int(
                result["unread_count"] or 0
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
# MARK ONE NOTIFICATION AS READ
# ============================================================

@notifications_bp.route(
    "/<int:notification_id>/read",
    methods=["PUT"]
)
def mark_notification_read(notification_id):

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT id
            FROM notifications
            WHERE id = %s
            """,
            (notification_id,)
        )

        notification = cursor.fetchone()

        if not notification:

            return jsonify({
                "error": "Notification not found"
            }), 404

        cursor.execute(
            """
            UPDATE notifications
            SET is_read = TRUE
            WHERE id = %s
            """,
            (notification_id,)
        )

        connection.commit()

        return jsonify({
            "message":
                "Notification marked as read",
            "notification_id":
                notification_id
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
# MARK ALL FARMER NOTIFICATIONS AS READ
# ============================================================

@notifications_bp.route(
    "/farmer/<int:farmer_id>/read-all",
    methods=["PUT"]
)
def mark_all_notifications_read(farmer_id):

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            UPDATE notifications

            SET is_read = TRUE

            WHERE farmer_id = %s

            AND is_read = FALSE
            """,
            (farmer_id,)
        )

        updated_count = cursor.rowcount

        connection.commit()

        return jsonify({
            "message":
                "All notifications marked as read",
            "updated_count":
                updated_count
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
# DELETE NOTIFICATION
# ============================================================

@notifications_bp.route(
    "/<int:notification_id>",
    methods=["DELETE"]
)
def delete_notification(notification_id):

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT id
            FROM notifications
            WHERE id = %s
            """,
            (notification_id,)
        )

        notification = cursor.fetchone()

        if not notification:

            return jsonify({
                "error": "Notification not found"
            }), 404

        cursor.execute(
            """
            DELETE FROM notifications
            WHERE id = %s
            """,
            (notification_id,)
        )

        connection.commit()

        return jsonify({
            "message":
                "Notification deleted successfully"
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