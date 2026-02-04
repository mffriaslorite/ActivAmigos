#!/bin/bash
set -e

echo "Running DB Migrations..."
flask db upgrade

echo "Seeding Achievements..."
python scripts/seed_achievements_simple.py

echo "Starting Server..."
exec "$@"
