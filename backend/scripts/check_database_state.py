#!/usr/bin/env python3
"""
Script para verificar el estado actual de la base de datos
y determinar qué migraciones son necesarias
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor

def check_database_state():
    """Verificar el estado actual de la base de datos"""
    
    # Database connection
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://activamigos:activamigos123@localhost:5432/activamigos_db')
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print("🔍 Verificando estado de la base de datos...\n")
        
        # Check existing tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables = [row['table_name'] for row in cursor.fetchall()]
        print("📋 Tablas existentes:")
        for table in tables:
            print(f"  ✓ {table}")
        
        # Check existing enums
        cursor.execute("""
            SELECT typname 
            FROM pg_type 
            WHERE typtype = 'e'
            ORDER BY typname
        """)
        enums = [row['typname'] for row in cursor.fetchall()]
        print(f"\n🏷️  Enums existentes:")
        for enum in enums:
            print(f"  ✓ {enum}")
        
        # Check users table columns
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        """)
        user_columns = cursor.fetchall()
        print(f"\n👤 Columnas en tabla 'users':")
        for col in user_columns:
            print(f"  ✓ {col['column_name']} ({col['data_type']}) {'NULL' if col['is_nullable'] == 'YES' else 'NOT NULL'}")
        
        # Check messages table columns
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'messages' 
            ORDER BY ordinal_position
        """)
        message_columns = cursor.fetchall()
        print(f"\n💬 Columnas en tabla 'messages':")
        for col in message_columns:
            print(f"  ✓ {col['column_name']} ({col['data_type']}) {'NULL' if col['is_nullable'] == 'YES' else 'NOT NULL'}")
        
        # Check current migration version
        cursor.execute("SELECT version_num FROM alembic_version")
        version = cursor.fetchone()
        print(f"\n🔄 Versión actual de migración: {version['version_num'] if version else 'No migration version found'}")
        
        # Check for problematic conditions
        print(f"\n⚠️  Verificación de problemas:")
        
        # Check if enums that should be created already exist
        required_enums = ['userrole', 'passwordhinttype', 'warningcontexttype', 'membershipstatus', 'messagecontexttype', 'ruletype']
        missing_enums = [enum for enum in required_enums if enum not in enums]
        existing_enums = [enum for enum in required_enums if enum in enums]
        
        if existing_enums:
            print(f"  ⚠️  Enums que ya existen: {', '.join(existing_enums)}")
        if missing_enums:
            print(f"  ❌ Enums que faltan: {', '.join(missing_enums)}")
        
        # Check required tables
        required_tables = ['points_ledger', 'warnings', 'activity_attendance', 'rules_templates', 'group_rules', 'activity_rules']
        missing_tables = [table for table in required_tables if table not in tables]
        existing_tables = [table for table in required_tables if table in tables]
        
        if existing_tables:
            print(f"  ⚠️  Tablas que ya existen: {', '.join(existing_tables)}")
        if missing_tables:
            print(f"  ❌ Tablas que faltan: {', '.join(missing_tables)}")
        
        cursor.close()
        conn.close()
        
        print(f"\n💡 Recomendaciones:")
        if existing_enums and missing_enums:
            print("  - Usar migración que verifique si existen antes de crear")
        elif existing_enums:
            print("  - Los enums ya existen, verificar por qué la migración falla")
        elif missing_enums:
            print("  - Ejecutar migración completa para crear todos los elementos")
        
        if missing_tables:
            print("  - Algunas tablas importantes faltan, ejecutar migración completa")
        
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Error de base de datos: {e}")
        return False
    except Exception as e:
        print(f"❌ Error general: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--help":
        print("Uso: python check_database_state.py")
        print("Este script verifica el estado actual de la base de datos de ActivAmigos")
        sys.exit(0)
    
    success = check_database_state()
    sys.exit(0 if success else 1)