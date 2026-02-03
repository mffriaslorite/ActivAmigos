#!/usr/bin/env python3
import os
import sys
from io import BytesIO
from datetime import datetime

# --- Asegura que /app está en el PYTHONPATH ---
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from app import create_app
from models.user.user import db
from models.achievement.achievement import Achievement
from utils.minio_client import minio_client

KEY_PREFIX = "achievement-icons"   # usamos el MISMO bucket, con un prefijo/carpeta
CONTENT_TYPE = "image/png"

def generate_icon(achievement_name: str) -> BytesIO:
    """Genera un PNG 128x128 con letra (sin Internet)."""
    from PIL import Image, ImageDraw, ImageFont
    size = (128, 128)
    bg = (79, 70, 229)   # #4F46E5
    fg = (255, 255, 255)

    img = Image.new("RGB", size, bg)
    draw = ImageDraw.Draw(img)
    letter = (achievement_name or "A")[0].upper()
    font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), letter, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((size[0]-w)//2, (size[1]-h)//2), letter, fill=fg, font=font)

    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf

def upload_icon(object_name: str, data: BytesIO):
    minio_client.upload_bytes(object_name, data.getvalue(), CONTENT_TYPE)


def seed_achievements():
    achievements_data = [
        {"title": "Primera Actividad", "description": "¡Felicidades! Te has unido a tu primera actividad en ActivAmigos. Este es solo el comienzo de tu aventura.", "points_reward": 50},
        {"title": "Explorador Social", "description": "Te has unido a tu primer grupo. ¡Genial! Ahora puedes conocer personas con intereses similares.", "points_reward": 75},
        {"title": "Estrella en Ascenso", "description": "Has alcanzado el nivel 5. Tu dedicación a mantenerte activo es admirable.", "points_reward": 100},
        {"title": "Organizador Nato", "description": "Has creado tu primera actividad. ¡Excelente liderazgo! Otros usuarios podrán unirse y disfrutar gracias a ti.", "points_reward": 125},
        {"title": "Maestro de la Consistencia", "description": "Has creado 10 actividades. Tu constancia es inspiradora y un ejemplo para la comunidad.", "points_reward": 200},
        {"title": "Embajador ActivAmigos", "description": "Has alcanzado el nivel 10. Eres un verdadero embajador de la vida activa y saludable.", "points_reward": 300},
    ]

    print("Creating achievements...")

    for i, data in enumerate(achievements_data, 1):
        existing = Achievement.query.filter_by(title=data["title"]).first()
        if existing:
            print(f"Achievement '{data['title']}' already exists, skipping...")
            continue

        # Genera icono y súbelo bajo el prefijo en el bucket configurado
        filename = f"achievement_{i}_{datetime.utcnow().strftime('%Y%m%d')}.png"
        object_key = f"{KEY_PREFIX}/{filename}"

        icon_buf = generate_icon(data["title"])
        upload_icon(object_key, icon_buf)
        print(f"Uploaded icon: {object_key}")

        ach = Achievement(
            title=data["title"],
            description=data["description"],
            icon_url=object_key,       # <--- guarda la KEY (prefijo + nombre)
            points_reward=data["points_reward"]
        )
        db.session.add(ach)
        print(f"Created achievement: {ach.title} ({ach.points_reward} points)")

    db.session.commit()
    print("\n✅ Successfully seeded achievements!")

def backfill_missing_icons():
    """Para logros ya creados sin icono: generar y subir."""
    missing = Achievement.query.filter(
        (Achievement.icon_url.is_(None)) | (Achievement.icon_url == "")
    ).all()
    if not missing:
        print("No achievements missing icons.")
        return
    print(f"Backfilling icons for {len(missing)} achievements…")

    for ach in missing:
        filename = f"achievement_fix_{ach.id}_{datetime.utcnow().strftime('%Y%m%d')}.png"
        object_key = f"{KEY_PREFIX}/{filename}"
        icon_buf = generate_icon(ach.title)
        upload_icon(object_key, icon_buf)
        ach.icon_url = object_key
        print(f"Set icon for {ach.title}: {object_key}")

    db.session.commit()
    print("✅ Backfill commit done.")

def main():
    print("🌱 Starting achievements seeding...")
    app, _ = create_app()
    with app.app_context():
        # Tu wrapper ya crea el bucket configurado si no existe al inicializarse
        minio_client._ensure_initialized()
        seed_achievements()
        backfill_missing_icons()
        total = Achievement.query.count()
        print(f"\n📊 Total achievements in database: {total}")

if __name__ == "__main__":
    main()
