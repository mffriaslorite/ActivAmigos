from flask import Blueprint, jsonify

auth_routes = Blueprint("auth_routes", __name__)

@auth_routes.route("/api/hello", methods=["GET"])
def hello():
    return jsonify({"message": "¡Hola desde Flask!"})
