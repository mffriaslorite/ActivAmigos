from marshmallow import Schema, fields, validate, ValidationError

class AchievementSchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    description = fields.Str(required=True, validate=validate.Length(min=1))
    icon_url = fields.Str(allow_none=True)
    points_reward = fields.Int(required=True, validate=validate.Range(min=0))
    created_at = fields.DateTime(dump_only=True)

class UserAchievementSchema(Schema):
    id = fields.Int(dump_only=True)
    user_id = fields.Int(dump_only=True)
    achievement_id = fields.Int(required=True)
    date_earned = fields.DateTime(dump_only=True)
    
    # Nested achievement data
    achievement = fields.Nested(AchievementSchema, dump_only=True)

class UserPointsSchema(Schema):
    id = fields.Int(dump_only=True)
    user_id = fields.Int(dump_only=True)
    points = fields.Int(dump_only=True)
    level = fields.Int(dump_only=True)
    progress_to_next_level = fields.Float(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class GamificationStateSchema(Schema):
    """Schema for the complete gamification state response"""
    points = fields.Int(required=True)
    level = fields.Int(required=True)
    progress_to_next_level = fields.Float(required=True, validate=validate.Range(min=0, max=1))
    earned_achievements = fields.List(fields.Nested(UserAchievementSchema), dump_only=True)

class UpdateGamificationSchema(Schema):
    """Schema for updating user gamification state"""
    points = fields.Int(allow_none=True, validate=validate.Range(min=0))
    achievement_id = fields.Int(allow_none=True)