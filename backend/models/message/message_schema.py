from marshmallow import Schema, fields, validate, ValidationError, post_load
from models.message.message import Message

class UserSchema(Schema):
    """Nested schema for user information in messages"""
    id = fields.Integer(required=True)
    username = fields.String(required=True)
    first_name = fields.String(allow_none=True)
    last_name = fields.String(allow_none=True)
    profile_image = fields.String(allow_none=True)

class MessageSchema(Schema):
    """Schema for Message model serialization/deserialization"""
    id = fields.Integer(dump_only=True)
    context_type = fields.String(validate=validate.OneOf(['GROUP', 'ACTIVITY']))
    context_id = fields.Integer(required=True)
    content = fields.String(required=True, validate=validate.Length(min=1, max=2000))
    created_at = fields.DateTime(dump_only=True)
    sender_id = fields.Integer(required=True)
    sender = fields.Nested(UserSchema, dump_only=True)

class MessageCreateSchema(Schema):
    """Schema for creating new messages"""
    content = fields.String(required=True, validate=validate.Length(min=1, max=2000))
    context_type = fields.String(required=True, validate=validate.OneOf(['GROUP', 'ACTIVITY']))
    context_id = fields.Integer(required=True)

class MessageListQuerySchema(Schema):
    """Schema for message list query parameters"""
    context_type = fields.String(required=True, validate=validate.OneOf(['GROUP', 'ACTIVITY']))
    context_id = fields.Integer(required=True)
    cursor = fields.String(allow_none=True)  # For pagination