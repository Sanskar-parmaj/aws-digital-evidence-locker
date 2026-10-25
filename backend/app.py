import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS

from config import Config
from routes.api import api_bp


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for frontend integration
    CORS(app, resources={r"/api/*": {"origins": config_class.CORS_ORIGINS}})

    # Register blueprints
    app.register_blueprint(api_bp)

    # Error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({
            "success": False,
            "error": "Resource not found"
        }), 404

    @app.errorhandler(413)
    def request_entity_too_large(e):
        return jsonify({
            "success": False,
            "error": f"Uploaded file exceeds maximum limit of {Config.MAX_UPLOAD_SIZE_MB}MB"
        }), 413

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({
            "success": False,
            "error": "Internal server error"
        }), 500

    @app.route("/")
    def index():
        return jsonify({
            "service": "Digital Evidence Locker API",
            "status": "online",
            "docs": "/api/health"
        }), 200

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("FLASK_PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "True").lower() == "true"
    print(f"[*] Starting Digital Evidence Locker API on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
