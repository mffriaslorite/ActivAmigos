from datetime import datetime, timezone
from models.user.user import db
import enum

class RuleType(enum.Enum):
    GROUP = "GROUP"
    ACTIVITY = "ACTIVITY"
    BOTH = "BOTH"

class RuleTemplate(db.Model):
    __tablename__ = 'rules_templates'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    icon = db.Column(db.String(50), nullable=True)  # Emoji or icon identifier
    rule_type = db.Column(db.Enum(RuleType), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f'<RuleTemplate {self.title}>'

    def to_dict(self):
        """Convert rule template to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'icon': self.icon,
            'rule_type': self.rule_type.value,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }

    @classmethod
    def get_templates_for_type(cls, rule_type):
        """Get all active rule templates for a specific type"""
        return cls.query.filter(
            cls.is_active == True,
            (cls.rule_type == rule_type) | (cls.rule_type == RuleType.BOTH)
        ).all()

# Association table for group rules
group_rules = db.Table('group_rules',
    db.Column('group_id', db.Integer, db.ForeignKey('groups.id'), primary_key=True),
    db.Column('rule_template_id', db.Integer, db.ForeignKey('rules_templates.id'), primary_key=True),
    db.Column('added_at', db.DateTime, default=lambda: datetime.now(timezone.utc))
)

# Association table for activity rules
activity_rules = db.Table('activity_rules',
    db.Column('activity_id', db.Integer, db.ForeignKey('activities.id'), primary_key=True),
    db.Column('rule_template_id', db.Integer, db.ForeignKey('rules_templates.id'), primary_key=True),
    db.Column('added_at', db.DateTime, default=lambda: datetime.now(timezone.utc))
)

# Pre-defined rule templates data
DEFAULT_RULE_TEMPLATES = [
    {
        'title': 'Sé respetuoso',
        'description': 'Trata a todos los miembros con respeto',
        'icon': '🤝',
        'rule_type': RuleType.BOTH
    },
    {
        'title': 'No compartir información privada',
        'description': 'No compartas información personal de otros miembros',
        'icon': '🔒',
        'rule_type': RuleType.BOTH
    },
    {
        'title': 'No insultos ni ofensas',
        'description': 'Mantén un lenguaje apropiado y evita insultos',
        'icon': '🚫',
        'rule_type': RuleType.BOTH
    },
    {
        'title': 'Participa activamente',
        'description': 'Contribuye de manera positiva a las conversaciones',
        'icon': '💬',
        'rule_type': RuleType.GROUP
    },
    {
        'title': 'Llega puntual',
        'description': 'Respeta los horarios establecidos para la actividad',
        'icon': '⏰',
        'rule_type': RuleType.ACTIVITY
    },
    {
        'title': 'Confirma tu asistencia',
        'description': 'Confirma si vas a asistir para ayudar con la planificación',
        'icon': '✅',
        'rule_type': RuleType.ACTIVITY
    },
    {
        'title': 'No spam',
        'description': 'Evita enviar mensajes repetitivos',
        'icon': '📵',
        'rule_type': RuleType.BOTH
    },
    {
        'title': 'Ayuda a otros',
        'description': 'Ofrece ayuda y apoyo a otros miembros cuando sea necesario',
        'icon': '🤗',
        'rule_type': RuleType.BOTH
    },
    {
        'title': 'Mantén el tema',
        'description': 'Mantén las conversaciones relacionadas con el grupo o actividad',
        'icon': '🎯',
        'rule_type': RuleType.BOTH
    },
    {
        'title': 'Diviértete',
        'description': 'Disfruta de la experiencia y mantén un ambiente positivo',
        'icon': '🎉',
        'rule_type': RuleType.BOTH
    }
]