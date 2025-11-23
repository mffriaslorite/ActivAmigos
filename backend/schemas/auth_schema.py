from marshmallow import Schema, fields, validate

class RegisterSchema(Schema):
    username = fields.Str(
        required=True, 
        validate=validate.Length(min=2, max=30, error="El nombre debe tener entre 2 y 30 letras")
    )
    email = fields.Email(
        required=True,
        validate=validate.Email(error="El formato del correo no parece correcto")
    )
    password = fields.Str(
        required=True, 
        validate=validate.Length(min=2, error="La contraseña es muy corta")
    )
    first_name = fields.Str(load_default="")
    last_name = fields.Str(load_default="")

class LoginSchema(Schema):
    username = fields.Str(required=True)
    password = fields.Str(required=True)
    remember_me = fields.Bool(required=False, load_default=False)

class ChangePasswordSchema(Schema):
    current_password = fields.Str(required=True)
    new_password = fields.Str(
        required=True, 
        validate=validate.Length(min=2, error="La nueva contraseña es muy corta")
    )
    email = fields.Email(
        required=True,
        validate=validate.Email(error="El formato del correo no parece correcto")
    )

class PasswordHintSchema(Schema):
    email = fields.Email(required=True)