from marshmallow import Schema, fields, validate, ValidationError
from datetime import datetime

class ActivityCreateSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    description = fields.Str(validate=validate.Length(max=500), allow_none=True)
    location = fields.Str(validate=validate.Length(max=255), allow_none=True)
    date = fields.DateTime(required=True)
    rules = fields.Str(allow_none=True)

class ActivityUpdateSchema(Schema):
    title = fields.Str(validate=validate.Length(min=1, max=100))
    description = fields.Str(validate=validate.Length(max=500), allow_none=True)
    location = fields.Str(validate=validate.Length(max=255), allow_none=True)
    date = fields.DateTime()
    rules = fields.Str(allow_none=True)

class ActivityResponseSchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.Str()
    description = fields.Str(allow_none=True)
    location = fields.Str(allow_none=True)
    date = fields.DateTime()
    rules = fields.Str(allow_none=True)
    created_by = fields.Int()
    created_at = fields.DateTime(dump_only=True)
    participant_count = fields.Int(dump_only=True)
    is_participant = fields.Bool(dump_only=True)

class ActivityListSchema(Schema):
    id = fields.Int()
    title = fields.Str()
    description = fields.Str(allow_none=True)
    location = fields.Str(allow_none=True)
    date = fields.DateTime()
    participant_count = fields.Int()
    is_participant = fields.Bool()
    created_at = fields.DateTime()

class JoinLeaveActivityResponseSchema(Schema):
    message = fields.Str()
    is_participant = fields.Bool()
    participant_count = fields.Int()

class ActivityParticipantSchema(Schema):
    id = fields.Int()
    username = fields.Str()
    first_name = fields.Str(allow_none=True)
    last_name = fields.Str(allow_none=True)
    profile_image = fields.Str(allow_none=True)
    is_organizer = fields.Bool()
    joined_at = fields.DateTime()

class ActivityDetailsResponseSchema(Schema):
    id = fields.Int()
    title = fields.Str()
    description = fields.Str(allow_none=True)
    location = fields.Str(allow_none=True)
    date = fields.DateTime()
    rules = fields.Str(allow_none=True)
    created_by = fields.Int()
    created_at = fields.DateTime()
    participant_count = fields.Int()
    is_participant = fields.Bool()
    participants = fields.List(fields.Nested(ActivityParticipantSchema))