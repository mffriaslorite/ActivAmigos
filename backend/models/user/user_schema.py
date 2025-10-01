from marshmallow import Schema, fields, post_dump
from marshmallow_enum import EnumField
from werkzeug.datastructures import FileStorage
from .user import UserRole

class UserSchema(Schema):
    id = fields.Int(dump_only=True)
    username = fields.Str()
    email = fields.Email()
    first_name = fields.Str()
    last_name = fields.Str()
    profile_image = fields.Str()
    bio = fields.Str()
    role = EnumField(UserRole, dump_only=True, by_value=True)
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