from flask import Blueprint, request, jsonify, session
from flask_smorest import Blueprint as SmorestBlueprint
from models.user.user import db, User
from models.points.points_ledger import PointsLedger
from utils.decorators import login_required, role_required
from datetime import datetime

blp = SmorestBlueprint('points', __name__, url_prefix='/api/points')

class PointsService:
    """Service for managing user points"""
    
    @staticmethod
    def award_points(user_id, points, reason, context_type=None, context_id=None, created_by=None):
        """Award points to a user"""
        if points <= 0:
            raise ValueError("Points to award must be positive")
        
        entry = PointsLedger(
            user_id=user_id,
            points=points,
            reason=reason,
            context_type=context_type,
            context_id=context_id,
            created_by=created_by
        )
        
        db.session.add(entry)
        db.session.commit()
        return entry
    
    @staticmethod
    def deduct_points(user_id, points, reason, context_type=None, context_id=None, created_by=None):
        """Deduct points from a user"""
        if points <= 0:
            raise ValueError("Points to deduct must be positive")
        
        entry = PointsLedger(
            user_id=user_id,
            points=-points,  # Store as negative
            reason=reason,
            context_type=context_type,
            context_id=context_id,
            created_by=created_by
        )
        
        db.session.add(entry)
        db.session.commit()
        return entry
    
    @staticmethod
    def get_user_points(user_id):
        """Get total points for a user"""
        return PointsLedger.get_user_total_points(user_id)
    
    @staticmethod
    def get_user_history(user_id, limit=50):
        """Get points history for a user"""
        return PointsLedger.get_user_points_history(user_id, limit)

# REST endpoints
@blp.route('/user/<int:user_id>/total')
@login_required
def get_user_total_points(user_id):
    """Get total points for a user"""
    try:
        # Users can only see their own points unless they're organizer/admin
        current_user = User.query.get(session['user_id'])
        if user_id != current_user.id and not current_user.is_organizer_or_admin():
            return jsonify({'error': 'Access denied'}), 403
        
        total_points = PointsService.get_user_points(user_id)
        return jsonify({'user_id': user_id, 'total_points': total_points}), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to get user points', 'details': str(e)}), 500

@blp.route('/user/<int:user_id>/history')
@login_required
def get_user_points_history(user_id):
    """Get points history for a user"""
    try:
        # Users can only see their own history unless they're organizer/admin
        current_user = User.query.get(session['user_id'])
        if user_id != current_user.id and not current_user.is_organizer_or_admin():
            return jsonify({'error': 'Access denied'}), 403
        
        limit = request.args.get('limit', 50, type=int)
        history = PointsService.get_user_history(user_id, limit)
        
        return jsonify({
            'user_id': user_id,
            'history': [entry.to_dict() for entry in history]
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to get points history', 'details': str(e)}), 500

@blp.route('/award')
@role_required(['ORGANIZER', 'SUPERADMIN'])
def award_points():
    """Award points to a user (organizer/admin only)"""
    try:
        data = request.get_json()
        
        required_fields = ['user_id', 'points', 'reason']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return jsonify({'error': 'Missing required fields', 'missing_fields': missing_fields}), 400
        
        current_user_id = session['user_id']
        entry = PointsService.award_points(
            user_id=data['user_id'],
            points=data['points'],
            reason=data['reason'],
            context_type=data.get('context_type'),
            context_id=data.get('context_id'),
            created_by=current_user_id
        )
        
        return jsonify({
            'message': 'Points awarded successfully',
            'entry': entry.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to award points', 'details': str(e)}), 500

@blp.route('/deduct')
@role_required(['ORGANIZER', 'SUPERADMIN'])
def deduct_points():
    """Deduct points from a user (organizer/admin only)"""
    try:
        data = request.get_json()
        
        required_fields = ['user_id', 'points', 'reason']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return jsonify({'error': 'Missing required fields', 'missing_fields': missing_fields}), 400
        
        current_user_id = session['user_id']
        entry = PointsService.deduct_points(
            user_id=data['user_id'],
            points=data['points'],
            reason=data['reason'],
            context_type=data.get('context_type'),
            context_id=data.get('context_id'),
            created_by=current_user_id
        )
        
        return jsonify({
            'message': 'Points deducted successfully',
            'entry': entry.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to deduct points', 'details': str(e)}), 500