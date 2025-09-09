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
    content = fields.String(required=True, validate=validate.Length(min=1, max=2000))
    timestamp = fields.DateTime(dump_only=True)
    sender_id = fields.Integer(required=True)
    sender = fields.Nested(UserSchema, dump_only=True)
    group_id = fields.Integer(allow_none=True)
    activity_id = fields.Integer(allow_none=True)
    
    @post_load
    def validate_chat_room(self, data, **kwargs):
        """Ensure either group_id or activity_id is provided, but not both"""
        group_id = data.get('group_id')
        activity_id = data.get('activity_id')
        
        if not group_id and not activity_id:
            raise ValidationError("Either group_id or activity_id must be provided")
        if group_id and activity_id:
            raise ValidationError("Cannot specify both group_id and activity_id")
        
        return data

class MessageCreateSchema(Schema):
    """Schema for creating new messages"""
    content = fields.String(required=True, validate=validate.Length(min=1, max=2000))
    group_id = fields.Integer(allow_none=True)
    activity_id = fields.Integer(allow_none=True)
    
    @post_load
    def validate_chat_room(self, data, **kwargs):
        """Ensure either group_id or activity_id is provided, but not both"""
        group_id = data.get('group_id')
        activity_id = data.get('activity_id')
        
        if not group_id and not activity_id:
            raise ValidationError("Either group_id or activity_id must be provided")
        if group_id and activity_id:
            raise ValidationError("Cannot specify both group_id and activity_id")
        
        return data

class MessageListQuerySchema(Schema):
    """Schema for message list query parameters"""
    page = fields.Integer(load_default=1, validate=validate.Range(min=1))
    per_page = fields.Integer(load_default=20, validate=validate.Range(min=1, max=100))
    before = fields.DateTime(allow_none=True)  # For pagination - get messages before this timestamp