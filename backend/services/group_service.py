from flask_smorest import Blueprint, abort
from flask import session
from sqlalchemy.exc import IntegrityError
from models.user.user import User, db
from models.group.group import Group
from models.group.group_schema import (
    GroupCreateSchema, 
    GroupUpdateSchema, 
    GroupResponseSchema, 
    GroupListSchema,
    JoinLeaveResponseSchema
)

blp = Blueprint("Groups", "groups", url_prefix="/api/groups", description="Groups management routes")

def require_auth():
    """Helper function to check if user is authenticated"""
    if 'user_id' not in session:
        abort(401, message="Authentication required")
    return session['user_id']

def get_current_user():
    """Get the current authenticated user"""
    user_id = require_auth()
    user = User.query.get(user_id)
    if not user:
        abort(401, message="User not found")
    return user

@blp.route("", methods=["POST"])
@blp.arguments(GroupCreateSchema)
@blp.response(201, GroupResponseSchema)
def create_group(args):
    """Create a new group"""
    current_user = get_current_user()
    
    try:
        # Create new group
        group = Group(
            name=args['name'],
            description=args.get('description'),
            rules=args.get('rules'),
            created_by=current_user.id
        )
        
        db.session.add(group)
        db.session.flush()  # Get the group ID
        
        # Add creator as a member
        group.add_member(current_user)
        
        db.session.commit()
        
        # Prepare response
        response_data = {
            'id': group.id,
            'name': group.name,
            'description': group.description,
            'rules': group.rules,
            'created_by': group.created_by,
            'created_at': group.created_at,
            'member_count': group.member_count,
            'is_member': True
        }
        
        return response_data
        
    except IntegrityError:
        db.session.rollback()
        abort(400, message="Error creating group")

@blp.route("", methods=["GET"])
@blp.response(200, GroupListSchema(many=True))
def list_groups():
    """List all groups"""
    current_user = get_current_user()
    
    groups = Group.query.order_by(Group.created_at.desc()).all()
    
    groups_data = []
    for group in groups:
        groups_data.append({
            'id': group.id,
            'name': group.name,
            'description': group.description,
            'member_count': group.member_count,
            'is_member': group.is_member(current_user.id),
            'created_at': group.created_at
        })
    
    return groups_data

@blp.route("/<int:group_id>", methods=["GET"])
@blp.response(200, GroupResponseSchema)
def get_group(group_id):
    """Get group details"""
    current_user = get_current_user()
    
    group = Group.query.get_or_404(group_id)
    
    response_data = {
        'id': group.id,
        'name': group.name,
        'description': group.description,
        'rules': group.rules,
        'created_by': group.created_by,
        'created_at': group.created_at,
        'member_count': group.member_count,
        'is_member': group.is_member(current_user.id)
    }
    
    return response_data

@blp.route("/<int:group_id>", methods=["PUT"])
@blp.arguments(GroupUpdateSchema)
@blp.response(200, GroupResponseSchema)
def update_group(args, group_id):
    """Update a group (only creator can update)"""
    current_user = get_current_user()
    
    group = Group.query.get_or_404(group_id)
    
    # Check if current user is the creator
    if group.created_by != current_user.id:
        abort(403, message="Only the group creator can update this group")
    
    try:
        # Update fields if provided
        if 'name' in args:
            group.name = args['name']
        if 'description' in args:
            group.description = args['description']
        if 'rules' in args:
            group.rules = args['rules']
        
        db.session.commit()
        
        response_data = {
            'id': group.id,
            'name': group.name,
            'description': group.description,
            'rules': group.rules,
            'created_by': group.created_by,
            'created_at': group.created_at,
            'member_count': group.member_count,
            'is_member': group.is_member(current_user.id)
        }
        
        return response_data
        
    except IntegrityError:
        db.session.rollback()
        abort(400, message="Error updating group")

@blp.route("/<int:group_id>", methods=["DELETE"])
@blp.response(204)
def delete_group(group_id):
    """Delete a group (only creator can delete)"""
    current_user = get_current_user()
    
    group = Group.query.get_or_404(group_id)
    
    # Check if current user is the creator
    if group.created_by != current_user.id:
        abort(403, message="Only the group creator can delete this group")

    try:
        db.session.delete(group)
        db.session.commit()
        return ""
        
    except IntegrityError:
        db.session.rollback()
        abort(400, message="Error deleting group")

@blp.route("/<int:group_id>/join", methods=["POST"])
@blp.response(200, JoinLeaveResponseSchema)
def join_group(group_id):
    """Join a group"""
    current_user = get_current_user()
    
    group = Group.query.get_or_404(group_id)
    
    try:
        if group.add_member(current_user):
            db.session.commit()
            return {
                'message': 'Successfully joined the group',
                'is_member': True,
                'member_count': group.member_count
            }
        else:
            return {
                'message': 'You are already a member of this group',
                'is_member': True,
                'member_count': group.member_count
            }
            
    except IntegrityError:
        db.session.rollback()
        abort(400, message="Error joining group")

@blp.route("/<int:group_id>/leave", methods=["POST"])
@blp.response(200, JoinLeaveResponseSchema)
def leave_group(group_id):
    """Leave a group"""
    current_user = get_current_user()
    
    group = Group.query.get_or_404(group_id)
    
    # Prevent creator from leaving their own group
    if group.created_by == current_user.id:
        abort(400, message="Group creator cannot leave the group. Transfer ownership or delete the group instead.")

    try:
        if group.remove_member(current_user):
            db.session.commit()
            return {
                'message': 'Successfully left the group',
                'is_member': False,
                'member_count': group.member_count
            }
        else:
            return {
                'message': 'You are not a member of this group',
                'is_member': False,
                'member_count': group.member_count
            }
            
    except IntegrityError:
        db.session.rollback()
        abort(400, message="Error leaving group")