# Associations Directory

This directory contains all many-to-many relationship tables (association tables) for the ActivAmigos application, organized by domain for better maintainability and scalability.

## Directory Structure

```
associations/
├── __init__.py                 # Package initialization
├── README.md                   # This documentation
├── group_associations.py       # Group-related associations
└── user_associations.py        # User-related associations (future)
```

## Architecture Benefits

### 1. **Separation of Concerns**
- Association tables are separated from entity models
- Each domain has its own association file
- Clear distinction between entities and relationships

### 2. **Maintainability**
- Easy to locate and modify relationship definitions
- Centralized place for all associations
- Clear naming conventions

### 3. **Scalability**
- New association tables can be easily added
- Domain-specific organization prevents file bloat
- Future-ready structure for complex relationships

### 4. **Reusability**
- Association tables can be imported by multiple models
- Shared relationships are defined once
- Consistent relationship patterns across the app

## File Organization

### `group_associations.py`
Contains all many-to-many relationships related to groups:
- `group_members`: Users ↔ Groups membership
- Future: `group_activities`, `group_tags`, etc.

### `user_associations.py`
Contains all many-to-many relationships related to users:
- Future: `user_friendships`, `user_interests`, etc.

## Naming Conventions

### File Names
- Use domain prefix: `{domain}_associations.py`
- Examples: `group_associations.py`, `activity_associations.py`

### Table Names
- Use descriptive names: `{entity1}_{entity2}` or `{domain}_{relationship}`
- Examples: `group_members`, `user_friendships`, `activity_participants`

### Column Names
- Standard foreign keys: `{entity}_id`
- Metadata columns: `created_at`, `updated_at`, `is_active`
- Relationship-specific data: `role`, `status`, `level`

## Usage Examples

### Importing Associations
```python
# In model files
from models.associations.group_associations import group_members

# In relationships
class Group(db.Model):
    members = db.relationship('User', 
                             secondary=group_members, 
                             backref='joined_groups')
```

### Adding New Associations
```python
# In appropriate association file
new_association = db.Table('table_name',
    db.Column('entity1_id', db.Integer, db.ForeignKey('entity1.id'), primary_key=True),
    db.Column('entity2_id', db.Integer, db.ForeignKey('entity2.id'), primary_key=True),
    db.Column('created_at', db.DateTime, default=datetime.utcnow),
    # Add domain-specific columns as needed
)
```

## Best Practices

### 1. **Include Metadata**
Always include audit columns:
- `created_at`: When the relationship was created
- `updated_at`: When it was last modified (if applicable)
- `is_active`: For soft deletes

### 2. **Add Domain-Specific Columns**
Include columns that make sense for the relationship:
- `role` in `group_members` (admin, moderator, member)
- `status` in `user_friendships` (pending, accepted, blocked)
- `level` in `user_interests` (beginner, intermediate, advanced)

### 3. **Document Future Tables**
Use comments to plan future associations:
```python
# Future association tables:
# 
# user_friendships = db.Table('user_friendships', ...)
```

### 4. **Import in Package Init**
Export associations in `__init__.py` for clean imports:
```python
from .group_associations import group_members
__all__ = ['group_members']
```

## Migration Strategy

When refactoring existing associations:
1. Create the new association file
2. Move the table definition
3. Update imports in model files
4. Create migration if adding columns
5. Test all relationships still work

## Future Enhancements

This structure supports future features like:
- **Activity Management**: `activity_participants`, `activity_organizers`
- **Social Features**: `user_friendships`, `user_followers`
- **Content Management**: `post_likes`, `comment_reactions`
- **Categorization**: `group_tags`, `activity_categories`
- **Permissions**: `user_permissions`, `group_roles`

## Related Files

- `/models/__init__.py` - Imports all associations for SQLAlchemy registration
- `/models/group/__init__.py` - Exports group-related associations
- Individual model files import specific associations as needed