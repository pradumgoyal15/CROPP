from flask import Blueprint, jsonify
from services.database import get_db_connection


dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/", methods=["GET"])
def get_dashboard():

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "error": "Database connection failed"
        }), 500

    cursor = None

    try:

        cursor = connection.cursor(dictionary=True)

        # Total Farmers
        cursor.execute("""
            SELECT COUNT(*) AS total_farmers
            FROM farmers
        """)

        total_farmers = cursor.fetchone()["total_farmers"]


        # Total Crops
        cursor.execute("""
            SELECT COUNT(*) AS total_crops
            FROM crops
        """)

        total_crops = cursor.fetchone()["total_crops"]


        # Total Procurement Centers
        cursor.execute("""
            SELECT COUNT(*) AS total_centers
            FROM procurement_centers
        """)

        total_centers = cursor.fetchone()["total_centers"]


        # Total Procurements
        cursor.execute("""
            SELECT COUNT(*) AS total_procurements
            FROM procurements
        """)

        total_procurements = cursor.fetchone()["total_procurements"]


        # Total Procurement Amount
        cursor.execute("""
            SELECT
                COALESCE(SUM(total_amount), 0) AS total_procurement_amount
            FROM procurements
        """)

        total_procurement_amount = cursor.fetchone()[
            "total_procurement_amount"
        ]


        # Completed Payments
        cursor.execute("""
            SELECT
                COALESCE(SUM(amount), 0) AS completed_payments
            FROM payments
            WHERE payment_status = 'Completed'
        """)

        completed_payments = cursor.fetchone()[
            "completed_payments"
        ]


        # Pending Payments
        cursor.execute("""
            SELECT
                COALESCE(SUM(amount), 0) AS pending_payments
            FROM payments
            WHERE payment_status = 'Pending'
        """)

        pending_payments = cursor.fetchone()[
            "pending_payments"
        ]


        # Recent Procurements
        cursor.execute("""
            SELECT

                p.id AS procurement_id,

                f.name AS farmer_name,

                c.crop_name,

                pc.center_name,

                p.quantity,

                p.total_amount,

                p.procurement_date,

                p.status

            FROM procurements p

            JOIN farmers f
                ON p.farmer_id = f.id

            JOIN crops c
                ON p.crop_id = c.id

            JOIN procurement_centers pc
                ON p.center_id = pc.id

            ORDER BY p.procurement_date DESC

            LIMIT 5
        """)

        recent_procurements = cursor.fetchall()


        dashboard_data = {

            "statistics": {

                "total_farmers": total_farmers,

                "total_crops": total_crops,

                "total_centers": total_centers,

                "total_procurements": total_procurements,

                "total_procurement_amount": total_procurement_amount,

                "completed_payments": completed_payments,

                "pending_payments": pending_payments

            },

            "recent_procurements": recent_procurements

        }


        return jsonify(dashboard_data), 200


    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()