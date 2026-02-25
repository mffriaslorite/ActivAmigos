import os
import sys
import secrets

# Add current directory to path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models.user.user import User, db
from utils.email_service import send_password_reset_email

def reset_all_passwords():
    print("Iniciando reseteo masivo de contraseñas...")
    
    # Check SMTP config
    if not os.getenv('SMTP_SERVER') or not os.getenv('SMTP_USERNAME'):
        print("⚠️ ADVERTENCIA: Las variables de entorno de SMTP (SMTP_SERVER, SMTP_USERNAME, SMTP_PASSWORD) no están configuradas.")
        print("Las contraseñas se cambiarán pero NO se enviarán correos.")
        confirm = input("¿Deseas continuar de todos modos? (s/N): ")
        if confirm.lower() != 's':
            print("Operación cancelada.")
            return

    app, _ = create_app()
    with app.app_context():
        users = User.query.all()
        print(f"Se han encontrado {len(users)} usuarios.")
        
        success_count = 0
        fail_count = 0
        
        for user in users:
            new_password = secrets.token_urlsafe(8)
            user.set_password(new_password)
            
            print(f"Procesando usuario: {user.email}... ", end="")
            
            # Send email
            if send_password_reset_email(user.email, new_password, is_bulk=True):
                db.session.commit()
                success_count += 1
                print("✅ Éxito (Correo enviado)")
            else:
                db.session.rollback()
                fail_count += 1
                # Fallback: We can still commit the password change even if email fails, 
                # but it's dangerous if the user can't know it. 
                # Let's commit anyway if SMTP is explicitly missing, but if it fails mid-way, rollback.
                if not os.getenv('SMTP_SERVER'):
                    db.session.commit()
                    print("✅ Éxito (Sin correo, guardada en DB)")
                    success_count += 1
                else:
                    print("❌ Error al enviar correo. Rollback.")
        
        print(f"\nProceso finalizado. Éxitos: {success_count}, Errores: {fail_count}")

if __name__ == "__main__":
    confirm = input("❗ ESTO CAMBIARÁ LA CONTRASEÑA DE TODOS LOS USUARIOS. ¿Estás seguro? (escribe 'CONFIRMAR'): ")
    if confirm == 'CONFIRMAR':
        reset_all_passwords()
    else:
        print("Operación cancelada.")
