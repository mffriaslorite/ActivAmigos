from marshmallow import Schema, fields, validate, ValidationError, pre_load
from datetime import datetime, timezone

class ActivityCreateSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    description = fields.Str(validate=validate.Length(max=500), allow_none=True)
    activity_type = fields.Str(validate=validate.Length(max=50), allow_none=True)
    location = fields.Str(validate=validate.Length(max=255), allow_none=True)
    date = fields.DateTime(required=True)
    rules = fields.Str(allow_none=True)
    rule_ids = fields.List(fields.Int(), allow_none=True)

    @pre_load
    def process_date(self, in_data, **kwargs):
        """Ensure date is properly handled"""
        if 'date' in in_data and isinstance(in_data['date'], str):
            try:
                # Parse the date string and make it timezone-aware if needed
                parsed_date = datetime.fromisoformat(in_data['date'].replace('Z', '+00:00'))
                if parsed_date.tzinfo is None:
                    parsed_date = parsed_date.replace(tzinfo=timezone.utc)
                in_data['date'] = parsed_date
            except ValueError:
                pass  # Let the DateTime field handle the error
        return in_data

class ActivityUpdateSchema(Schema):
    title = fields.Str(validate=validate.Length(min=1, max=100))
    description = fields.Str(validate=validate.Length(max=500), allow_none=True)
    activity_type = fields.Str(validate=validate.Length(max=50), allow_none=True)
    location = fields.Str(validate=validate.Length(max=255), allow_none=True)
    date = fields.DateTime()
    rules = fields.Str(allow_none=True)

    @pre_load
    def process_date(self, in_data, **kwargs):
        """Ensure date is properly handled"""
        if 'date' in in_data and isinstance(in_data['date'], str):
            try:
                # Parse the date string and make it timezone-aware if needed
                parsed_date = datetime.fromisoformat(in_data['date'].replace('Z', '+00:00'))
                if parsed_date.tzinfo is None:
                    parsed_date = parsed_date.replace(tzinfo=timezone.utc)
                in_data['date'] = parsed_date
            except ValueError:
                pass  # Let the DateTime field handle the error
        return in_data

class ActivityResponseSchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.Str()
    description = fields.Str(allow_none=True)
    activity_type = fields.Str(allow_none=True)
    location = fields.Str(allow_none=True)
    date = fields.DateTime()
    rules = fields.Str(allow_none=True)
    created_by = fields.Int()
    created_at = fields.DateTime(dump_only=True)
    participant_count = fields.Int(dump_only=True)
    is_participant = fields.Bool(dump_only=True)
    attendance_confirmed = fields.Bool(dump_only=True)
    attendance_status = fields.Str(dump_only=True, allow_none=True)

class ActivityListSchema(Schema):
    id = fields.Int()
    title = fields.Str()
    description = fields.Str(allow_none=True)
    activity_type = fields.Str(allow_none=True)
    location = fields.Str(allow_none=True)
    date = fields.DateTime()
    participant_count = fields.Int()
    is_participant = fields.Bool()
    attendance_confirmed = fields.Bool()
    created_at = fields.DateTime()
    created_by = fields.Int()
    attendance_status = fields.Str(allow_none=True)

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
    joined_at = fields.DateTime(allow_none=True)
    attendance_status = fields.Str()
    attendance_confirmed_at = fields.Str(allow_none=True)
    semaphore_color = fields.Str()
    warning_count = fields.Int()

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
    attendance_confirmed = fields.Bool()
    participants = fields.List(fields.Nested(ActivityParticipantSchema))
    attendance_status = fields.Str(allow_none=True)