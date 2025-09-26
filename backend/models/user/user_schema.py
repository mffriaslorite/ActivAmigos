from marshmallow import Schema, fields
from werkzeug.datastructures import FileStorage

class UserSchema(Schema):
    id = fields.Int(dump_only=True)
    username = fields.Str()
    email = fields.Email()
    first_name = fields.Str()
    last_name = fields.Str()
    profile_image = fields.Str()
    bio = fields.Str()
    role = fields.Str(dump_only=True)  # Don't allow role changes via API
    is_active = fields.Bool()
    created_at = fields.DateTime()
    last_login = fields.DateTime()

class UpdateProfileSchema(Schema):
    email = fields.Email()
    first_name = fields.Str()
    last_name = fields.Str()
    bio = fields.Str()

class ProfileImageUploadSchema(Schema):
    image = fields.Raw(
        required=True,
        metadata={
            "type": "string",
            "description": "Profile image file (JPG, PNG, WebP)",
            "format": "binary"
        }
    )