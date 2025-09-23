from flask_smorest import Blueprint
from flask import session, request
from sqlalchemy.exc import IntegrityError
from models.user.user import User, UserRole, db
from models.group.group import Group
from models.activity.activity import Activity
from models.rules.rules import RuleTemplate, RuleType, group_rules, activity_rules
from utils.decorators import login_required
from marshmallow import Schema, fields, validate, ValidationError

blp = Blueprint("Rules", "rules", url_prefix="/api/rules", description="Rules management routes")

class AttachRulesSchema(Schema):
    template_ids = fields.List(fields.Int(), required=True, validate=validate.Length(min=1))

class RulesService:
    """Service for managing rules templates and assignments"""
    
    @staticmethod
    def get_templates_for_type(rule_type):
        """Get all active rule templates for a specific type"""
        return RuleTemplate.get_templates_for_type(RuleType(rule_type))
    
    @staticmethod
    def attach_group_rules(group_id, template_ids, user_id):
        """Attach rule templates to a group"""
        group = Group.query.get(group_id)
        if not group:
            raise ValueError("Group not found")
        
        # Check if user can modify group rules (creator, organizer, or admin)
        user = User.query.get(user_id)
        if not (user.is_organizer_or_admin() or group.created_by == user_id):
            raise ValueError("Not authorized to modify group rules")
        
        # Remove existing rules
        db.session.execute(group_rules.delete().where(group_rules.c.group_id == group_id))
        
        # Add new rules
        for template_id in template_ids:
            template = RuleTemplate.query.get(template_id)
            if template and template.is_active and template.rule_type in [RuleType.GROUP, RuleType.BOTH]:
                db.session.execute(
                    group_rules.insert().values(
                        group_id=group_id,
                        rule_template_id=template_id
                    )
                )
        
        db.session.commit()
        return True
    
    @staticmethod
    def attach_activity_rules(activity_id, template_ids, user_id):
        """Attach rule templates to an activity"""
        activity = Activity.query.get(activity_id)
        if not activity:
            raise ValueError("Activity not found")
        
        # Check if user can modify activity rules (creator, organizer, or admin)
        user = User.query.get(user_id)
        if not (user.is_organizer_or_admin() or activity.created_by == user_id):
            raise ValueError("Not authorized to modify activity rules")
        
        # Remove existing rules
        db.session.execute(activity_rules.delete().where(activity_rules.c.activity_id == activity_id))
        
        # Add new rules
        for template_id in template_ids:
            template = RuleTemplate.query.get(template_id)
            if template and template.is_active and template.rule_type in [RuleType.ACTIVITY, RuleType.BOTH]:
                db.session.execute(
                    activity_rules.insert().values(
                        activity_id=activity_id,
                        rule_template_id=template_id
                    )
                )
        
        db.session.commit()
        return True
    
    @staticmethod
    def get_group_rules(group_id):
        """Get all rules for a group"""
        rules_query = db.session.query(RuleTemplate).join(
            group_rules, RuleTemplate.id == group_rules.c.rule_template_id
        ).filter(group_rules.c.group_id == group_id)
        
        return rules_query.all()
    
    @staticmethod
    def get_activity_rules(activity_id):
        """Get all rules for an activity"""
        rules_query = db.session.query(RuleTemplate).join(
            activity_rules, RuleTemplate.id == activity_rules.c.rule_template_id
        ).filter(activity_rules.c.activity_id == activity_id)
        
        return rules_query.all()

# REST endpoints
@blp.route("/templates", methods=["GET"])
def get_rule_templates():
    """Get rule templates filtered by type"""
    rule_type = request.args.get('type', 'BOTH')
    
    try:
        templates = RulesService.get_templates_for_type(rule_type)
        return {
            'templates': [template.to_dict() for template in templates]
        }
    except ValueError as e:
        blp.abort(400, message=str(e))

@blp.route("/groups/<int:group_id>/rules", methods=["POST"])
@blp.arguments(AttachRulesSchema)
@login_required
def attach_group_rules(group_id, args):
    """Attach rules to a group"""
    user_id = session.get('user_id')
    
    try:
        RulesService.attach_group_rules(group_id, args['template_ids'], user_id)
        return {'message': 'Rules attached to group successfully'}
    except ValueError as e:
        blp.abort(400, message=str(e))
    except Exception as e:
        blp.abort(500, message="Failed to attach rules to group")

@blp.route("/groups/<int:group_id>/rules", methods=["GET"])
def get_group_rules(group_id):
    """Get rules for a group"""
    try:
        rules = RulesService.get_group_rules(group_id)
        return {
            'group_id': group_id,
            'rules': [rule.to_dict() for rule in rules]
        }
    except Exception as e:
        blp.abort(500, message="Failed to get group rules")

@blp.route("/activities/<int:activity_id>/rules", methods=["POST"])
@blp.arguments(AttachRulesSchema)
@login_required
def attach_activity_rules(activity_id, args):
    """Attach rules to an activity"""
    user_id = session.get('user_id')
    
    try:
        RulesService.attach_activity_rules(activity_id, args['template_ids'], user_id)
        return {'message': 'Rules attached to activity successfully'}
    except ValueError as e:
        blp.abort(400, message=str(e))
    except Exception as e:
        blp.abort(500, message="Failed to attach rules to activity")

@blp.route("/activities/<int:activity_id>/rules", methods=["GET"])
def get_activity_rules(activity_id):
    """Get rules for an activity"""
    try:
        rules = RulesService.get_activity_rules(activity_id)
        return {
            'activity_id': activity_id,
            'rules': [rule.to_dict() for rule in rules]
        }
    except Exception as e:
        blp.abort(500, message="Failed to get activity rules")