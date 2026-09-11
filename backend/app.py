from flask import Flask, jsonify
from flask_cors import CORS

from config import SECRET_KEY

from routes.farmers import farmers_bp
from routes.crops import crops_bp
from routes.centers import centers_bp
from routes.procurements import procurements_bp
from routes.payments import payments_bp
from routes.dashboard import dashboard_bp
from routes.auth import auth_bp
from routes.notifications import notifications_bp
from routes.orders import orders_bp


app = Flask(__name__)

app.config["SECRET_KEY"] = SECRET_KEY

CORS(app)


# ============================================================
# REGISTER API BLUEPRINTS
# ============================================================

app.register_blueprint(
    farmers_bp,
    url_prefix="/api/farmers"
)

app.register_blueprint(
    crops_bp,
    url_prefix="/api/crops"
)

app.register_blueprint(
    centers_bp,
    url_prefix="/api/centers"
)

app.register_blueprint(
    procurements_bp,
    url_prefix="/api/procurements"
)

app.register_blueprint(
    payments_bp,
    url_prefix="/api/payments"
)

app.register_blueprint(
    dashboard_bp,
    url_prefix="/api/dashboard"
)

app.register_blueprint(
    auth_bp,
    url_prefix="/api/auth"
)

app.register_blueprint(
    notifications_bp,
    url_prefix="/api/notifications"
)

app.register_blueprint(
    orders_bp,
    url_prefix="/api/orders"
)


# ============================================================
# HOME
# ============================================================

@app.route("/")
def home():

    return jsonify({
        "message": "Welcome to CROPP API",
        "status": "running"
    })


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/api/health")
def health():

    return jsonify({
        "status": "healthy",
        "message":
            "CROPP backend is running successfully"
    })


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    app.run(
        debug=True,
        port=5000
    )