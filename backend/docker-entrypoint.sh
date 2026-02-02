#!/bin/bash
set -e

echo "Running DB Migrations..."
flask db upgrade

echo "Seeding Achievements..."
python scripts/seed_achievements.py

echo "Starting Server..."
exec "$@"
