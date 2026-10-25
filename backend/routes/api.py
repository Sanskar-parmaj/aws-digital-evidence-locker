from flask import Blueprint, jsonify, request
from services.aws_service import AWSService
from config import Config

api_bp = Blueprint("api", __name__, url_prefix="/api")
aws_service = AWSService()


@api_bp.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "Digital Evidence Locker API",
        "version": "1.0.0"
    }), 200


@api_bp.route("/dashboard", methods=["GET"])
def get_dashboard():
    try:
        data = aws_service.get_dashboard_data()
        return jsonify({
            "success": True,
            "data": data
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to load dashboard data",
            "details": str(e)
        }), 500


@api_bp.route("/evidence", methods=["GET"])
def get_evidence_list():
    try:
        records = aws_service.get_current_records()
        # Optional query filter by status or filename
        status_filter = request.args.get("status")
        query = request.args.get("query", "").lower()

        if status_filter and status_filter.upper() != "ALL":
            records = [r for r in records if r.get("status", "").upper() == status_filter.upper()]

        if query:
            records = [r for r in records if query in r.get("filename", "").lower()]

        # Sort by received_at descending by default
        records.sort(key=lambda r: r.get("received_at", ""), reverse=True)

        return jsonify({
            "success": True,
            "count": len(records),
            "data": records
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to fetch evidence files",
            "details": str(e)
        }), 500


@api_bp.route("/evidence/<file_id>", methods=["GET"])
def get_evidence_detail(file_id):
    try:
        record = aws_service.get_evidence_detail(file_id)
        if not record:
            return jsonify({
                "success": False,
                "error": "Evidence record not found"
            }), 404
        return jsonify({
            "success": True,
            "data": record
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to fetch evidence details",
            "details": str(e)
        }), 500


@api_bp.route("/evidence/<file_id>/history", methods=["GET"])
def get_evidence_history(file_id):
    try:
        history_data = aws_service.get_evidence_history(file_id)
        return jsonify({
            "success": True,
            "data": history_data
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to fetch audit history",
            "details": str(e)
        }), 500


@api_bp.route("/evidence/<file_id>/verify", methods=["POST", "GET"])
def verify_evidence(file_id):
    try:
        verification = aws_service.verify_file_integrity(file_id)
        if not verification.get("found"):
            return jsonify({
                "success": False,
                "error": verification.get("message", "Evidence record not found")
            }), 404
        return jsonify({
            "success": True,
            "data": verification
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Verification failed",
            "details": str(e)
        }), 500


@api_bp.route("/evidence/upload", methods=["POST"])
def upload_evidence():
    if "file" not in request.files:
        return jsonify({
            "success": False,
            "error": "No file field found in form data"
        }), 400

    file_obj = request.files["file"]
    if not file_obj or file_obj.filename == "":
        return jsonify({
            "success": False,
            "error": "No file selected for upload"
        }), 400

    custom_filename = request.form.get("filename", "").strip()
    target_filename = custom_filename if custom_filename else file_obj.filename

    # Guard: Never allow uploading directly into audit prefixes or dangerous paths
    if target_filename.startswith("audit/") or "/" in target_filename or "\\" in target_filename:
        # Clean down to bare basename
        target_filename = target_filename.split("/")[-1].split("\\")[-1]

    try:
        result = aws_service.upload_evidence(file_obj, target_filename)
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({
            "success": False,
            "error": str(ve)
        }), 400
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to upload evidence to S3 incoming/ locker",
            "details": str(e)
        }), 500


@api_bp.route("/audit", methods=["GET"])
def get_global_audit():
    try:
        limit = int(request.args.get("limit", 50))
        recent_records = aws_service.get_recent_history(limit=limit)
        return jsonify({
            "success": True,
            "count": len(recent_records),
            "data": recent_records
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to retrieve global audit trail",
            "details": str(e)
        }), 500


@api_bp.route("/system/status", methods=["GET"])
@api_bp.route("/status", methods=["GET"])
def get_system_status():
    try:
        status_info = aws_service.get_system_status()
        return jsonify({
            "success": True,
            "data": status_info
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to check system status",
            "details": str(e)
        }), 500
