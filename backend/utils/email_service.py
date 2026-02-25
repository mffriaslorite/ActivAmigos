import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_password_reset_email(to_email, new_password, is_bulk=False):
    smtp_server = os.getenv('SMTP_SERVER')
    smtp_port = int(os.getenv('SMTP_PORT', 587))
    smtp_user = os.getenv('SMTP_USERNAME')
    smtp_pass = os.getenv('SMTP_PASSWORD')
    smtp_sender = os.getenv('SMTP_SENDER_EMAIL', smtp_user)

    if not smtp_server or not smtp_user or not smtp_pass:
        print(f"Warning: SMTP credentials not set. Could not send email to {to_email}. New password: {new_password}")
        return False

    msg = MIMEMultipart()
    msg['From'] = smtp_sender
    msg['To'] = to_email
    msg['Subject'] = "Nueva Contraseña Temporal - ActivAmigos" if is_bulk else "Recuperación de Contraseña - ActivAmigos"

    if is_bulk:
        body = f"""Hola,

Por motivos de seguridad y mejoras en la plataforma ActivAmigos, hemos restablecido todas las contraseñas.

Tu nueva contraseña temporal es: {new_password}

Por favor, inicia sesión con esta contraseña y dirígete a tu perfil para cambiarla por una segura lo antes posible.

Atentamente,
El equipo de ActivAmigos
"""
    else:
        body = f"""Hola,

Has solicitado restablecer tu contraseña en ActivAmigos.

Tu nueva contraseña temporal es: {new_password}

Por favor, inicia sesión con esta contraseña y dirígete a tu perfil para cambiarla por una segura lo antes posible.

Atentamente,
El equipo de ActivAmigos
"""

    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_sender, to_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Error al enviar correo a {to_email}: {e}")
        return False
