#!/bin/bash
set -e

echo "Running DB Migrations..."
flask db upgrade

echo "Starting Server..."
exec "$@"
