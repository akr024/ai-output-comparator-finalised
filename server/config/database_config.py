import os
from pathlib import Path

def get_database_config():
    """
    Get database configuration based on environment variables.
    
    Supports two methods:
    1. DB_TYPE=postgresql or DB_TYPE=sqlite (new method)
    2. DATABASE_URL (legacy method, for compatibility)
    
    Default: SQLite
    """
    # Method 1: Check DB_TYPE first (new method)
    db_type = os.getenv('DB_TYPE', '').lower()
    
    # Method 2: Check DATABASE_URL (legacy method for compatibility)
    database_url = os.getenv('DATABASE_URL')
    
    # Determine which database to use
    use_postgresql = False
    
    if db_type == 'postgresql':
        use_postgresql = True
    elif database_url and 'postgresql' in database_url.lower():
        use_postgresql = True
    elif db_type == 'sqlite':
        use_postgresql = False
    # else: default to SQLite
    
    if use_postgresql:
        # PostgreSQL configuration
        return {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': os.getenv('DB_NAME', 'ai_comparator'),
                'USER': os.getenv('DB_USER', 'postgres'),
                'PASSWORD': os.getenv('DB_PASSWORD', ''),
                'HOST': os.getenv('DB_HOST', 'localhost'),
                'PORT': os.getenv('DB_PORT', '5432'),
            }
        }
    else:
        # SQLite configuration (default)
        BASE_DIR = Path(__file__).resolve().parent.parent
        return {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': BASE_DIR / 'db.sqlite3',
            }
        }