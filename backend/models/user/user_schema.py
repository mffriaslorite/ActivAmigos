from marshmallow import Schema, fields

class UserSchema(Schema):
    id = fields.Int(dump_only=True)
    username = fields.Str()
    email = fields.Email()
    first_name = fields.Str()
    last_name = fields.Str()
    profile_image = fields.Str()
    bio = fields.Str()
    is_active = fields.Bool()
    created_at = fields.DateTime()
    last_login = fields.DateTime()

class UpdateProfileSchema(Schema):
    email = fields.Email()
    first_name = fields.Str()
    last_name = fields.Str()
    bio = fields.Str()
