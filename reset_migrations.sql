-- Script para resetear las migraciones y limpiar enums duplicados
-- Ejecutar en PostgreSQL cuando tengas problemas de enums duplicados

-- 1. Eliminar enums existentes que pueden estar causando conflicto
DROP TYPE IF EXISTS warningcontexttype CASCADE;
DROP TYPE IF EXISTS membershipstatus CASCADE;
DROP TYPE IF EXISTS messagecontexttype CASCADE;
DROP TYPE IF EXISTS userrole CASCADE;
DROP TYPE IF EXISTS passwordhinttype CASCADE;
DROP TYPE IF EXISTS ruletype CASCADE;

-- 2. Eliminar tablas que pueden estar causando conflicto (solo si existen)
DROP TABLE IF EXISTS warnings CASCADE;
DROP TABLE IF EXISTS points_ledger CASCADE;
DROP TABLE IF EXISTS activity_attendance CASCADE;
DROP TABLE IF EXISTS rules_templates CASCADE;
DROP TABLE IF EXISTS group_rules CASCADE;
DROP TABLE IF EXISTS activity_rules CASCADE;

-- 3. Eliminar columnas conflictivas de tablas existentes
-- (Solo ejecutar si las columnas existen)
ALTER TABLE users DROP COLUMN IF EXISTS role;
ALTER TABLE users DROP COLUMN IF EXISTS password_hint_type;
ALTER TABLE users DROP COLUMN IF EXISTS password_hint_value;

ALTER TABLE group_members DROP COLUMN IF EXISTS warning_count;
ALTER TABLE group_members DROP COLUMN IF EXISTS status;

ALTER TABLE activity_participants DROP COLUMN IF EXISTS warning_count;
ALTER TABLE activity_participants DROP COLUMN IF EXISTS status;

-- 4. Restaurar messages si fue modificada
ALTER TABLE messages DROP COLUMN IF EXISTS context_type;
ALTER TABLE messages DROP COLUMN IF EXISTS context_id;

-- Si created_at existe y timestamp no, restaurar timestamp
-- ALTER TABLE messages RENAME COLUMN created_at TO timestamp;

-- 5. Limpiar la tabla de versiones de Alembic (CUIDADO - solo en desarrollo)
-- DELETE FROM alembic_version WHERE version_num NOT IN ('dbde74c6d122');

COMMIT;