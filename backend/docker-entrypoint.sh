#!/bin/bash
set -e

echo "Running DB Migrations..."
flask db upgrade

echo "Skipping automatic achievement seeding to protect production data."
echo "Run the seed manually only in controlled environments if needed."

echo "Starting Server..."
exec "$@"
