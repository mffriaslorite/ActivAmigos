from marshmallow import Schema, fields, validate

class RegisterSchema(Schema):
    username = fields.Str(required=True, validate=validate.Length(min=3, max=20))
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=8))
    first_name = fields.Str()
    last_name = fields.Str()

class LoginSchema(Schema):
    username = fields.Str(required=True)
    password = fields.Str(required=True)
    remember_me = fields.Bool(required=False, load_default=False)

class ChangePasswordSchema(Schema):
    current_password = fields.Str(required=True)
    new_password = fields.Str(required=True, validate=validate.Length(min=8))

class PasswordHintSchema(Schema):
    email = fields.Email(required=True)
