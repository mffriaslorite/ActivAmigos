from marshmallow import Schema, fields, validate, ValidationError
from datetime import datetime

class GroupCreateSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    description = fields.Str(validate=validate.Length(max=500), allow_none=True)
    rules = fields.Str(allow_none=True)

class GroupUpdateSchema(Schema):
    name = fields.Str(validate=validate.Length(min=1, max=100))
    description = fields.Str(validate=validate.Length(max=500), allow_none=True)
    rules = fields.Str(allow_none=True)

class GroupResponseSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str()
    description = fields.Str(allow_none=True)
    rules = fields.Str(allow_none=True)
    created_by = fields.Int()
    created_at = fields.DateTime(dump_only=True)
    member_count = fields.Int(dump_only=True)
    is_member = fields.Bool(dump_only=True)

class GroupListSchema(Schema):
    id = fields.Int()
    name = fields.Str()
    description = fields.Str(allow_none=True)
    member_count = fields.Int()
    is_member = fields.Bool()
    created_at = fields.DateTime()

class JoinLeaveResponseSchema(Schema):
    message = fields.Str()
    is_member = fields.Bool()
    member_count = fields.Int()