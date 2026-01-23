#!/usr/bin/env python3
"""
Admin Management Tool for Movie Platform
Run from backend root: python scripts/manage_admins.py
Or from scripts folder: python manage_admins.py

This script uses your existing database.py and security.py
"""

import sys
import os

# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))

# Go up one level to backend root (since script is in scripts/ folder)
backend_root = os.path.abspath(os.path.join(script_dir, '..'))

# Add backend root to path so we can import app modules
sys.path.insert(0, backend_root)

from app.database import SyncSessionLocal, Base, sync_engine
from app.models.user import User

# Try to import hash_password from different locations
try:
    from app.utils.security import hash_password
except ImportError:
    try:
        from app.core.security import hash_password
    except ImportError:
        try:
            from app.auth import hash_password
        except ImportError:
            # Fallback: use passlib directly
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            def hash_password(password: str) -> str:
                return pwd_context.hash(password)

# Alias for cleaner code
SessionLocal = SyncSessionLocal
engine = sync_engine

# Import other models to ensure they're registered
try:
    from app.models.review import Review
    from app.models.movie import Movie
    from app.models.watchlist import WatchlistItem
except ImportError:
    pass  # Some models might not exist

# Ensure all tables are created
Base.metadata.create_all(bind=engine)


def list_all_users():
    """Display all users with their admin status"""
    db = SessionLocal()
    try:
        users = db.query(User).all()
        
        if not users:
            print("\n❌ No users found in database.\n")
            return
        
        print("\n" + "="*80)
        print("📋 ALL USERS IN DATABASE")
        print("="*80)
        print(f"{'ID':<5} {'STATUS':<15} {'NAME':<25} {'EMAIL':<35}")
        print("-"*80)
        
        for user in users:
            status = "👑 ADMIN" if user.is_admin else "👤 USER"
            name = (user.name or "")[:24]
            email = (user.email or "")[:34]
            print(f"{user.id:<5} {status:<15} {name:<25} {email:<35}")
        
        print("="*80 + "\n")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()


def promote_to_admin():
    """Make a user an admin by email"""
    db = SessionLocal()
    try:
        print("\n--- Promote User to Admin ---")
        email = input("Enter user email: ").strip()
        
        if not email:
            print("❌ Email cannot be empty!")
            return
        
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"\n❌ User with email '{email}' not found!")
            print("💡 Tip: Use option 1 to see all users\n")
            return
        
        if user.is_admin:
            print(f"\nℹ️  User '{email}' is already an admin.\n")
            return
        
        # Confirm action
        print(f"\n📝 User Detail:")
        print(f"   ID: {user.id}")
        print(f"   Name: {user.name}")
        print(f"   Email: {user.email}")
        print(f"   Current Status: Regular User")
        
        confirm = input("\n⚠️  Make this user an ADMIN? (yes/no): ").strip().lower()
        
        if confirm == 'yes':
            user.is_admin = True
            db.commit()
            print(f"\n✅ SUCCESS! '{email}' is now an admin!\n")
        else:
            print("\n❌ Operation cancelled.\n")
    
    except Exception as e:
        print(f"\n❌ Error: {e}\n")
        db.rollback()
    finally:
        db.close()


def revoke_admin_privileges():
    """Revoke admin privileges from a user"""
    db = SessionLocal()
    try:
        print("\n--- Revoke Admin Privileges ---")
        email = input("Enter admin email: ").strip()
        
        if not email:
            print("❌ Email cannot be empty!")
            return
        
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"\n❌ User with email '{email}' not found!\n")
            return
        
        if not user.is_admin:
            print(f"\nℹ️  User '{email}' is not an admin.\n")
            return
        
        # Confirm action
        print(f"\n📝 Admin Detail:")
        print(f"   ID: {user.id}")
        print(f"   Name: {user.name}")
        print(f"   Email: {user.email}")
        
        confirm = input("\n⚠️  REVOKE admin privileges? (yes/no): ").strip().lower()
        
        if confirm == 'yes':
            user.is_admin = False
            db.commit()
            print(f"\n✅ Admin privileges revoked from '{email}'.\n")
        else:
            print("\n❌ Operation cancelled.\n")
    
    except Exception as e:
        print(f"\n❌ Error: {e}\n")
        db.rollback()
    finally:
        db.close()


def create_new_admin():
    """Create a brand new admin user"""
    db = SessionLocal()
    try:
        print("\n--- Create New Admin User ---")
        name = input("Full Name: ").strip()
        email = input("Email: ").strip()
        password = input("Password: ").strip()
        
        if not all([name, email, password]):
            print("\n❌ All fields are required!\n")
            return
        
        # Check if email already exists
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"\n❌ User with email '{email}' already exists!")
            
            if existing.is_admin:
                print(f"   (Already an admin)\n")
            else:
                promote = input("   Make them admin? (yes/no): ").strip().lower()
                if promote == 'yes':
                    existing.is_admin = True
                    db.commit()
                    print(f"\n✅ '{email}' is now an admin!\n")
                else:
                    print("\n❌ Operation cancelled.\n")
            return
        
        # Create new admin user
        new_admin = User(
            name=name,
            email=email,
            hashed_password=hash_password(password),
            is_admin=True
        )
        
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        
        print(f"\n✅ SUCCESS! Admin user created!")
        print(f"   ID: {new_admin.id}")
        print(f"   Name: {new_admin.name}")
        print(f"   Email: {new_admin.email}")
        print(f"   Status: 👑 ADMIN\n")
    
    except Exception as e:
        print(f"\n❌ Error: {e}\n")
        db.rollback()
    finally:
        db.close()


def show_menu():
    """Display the main menu"""
    print("\n" + "="*80)
    print("🔐 ADMIN MANAGEMENT TOOL - Movie Platform")
    print("="*80)
    print("1. 📋 List all users")
    print("2. ⬆️  Promote user to admin")
    print("3. ⬇️  Revoke admin privileges")
    print("4. ➕ Create new admin user")
    print("5. 🚪 Exit")
    print("="*80)


def main():
    """Main program loop"""
    print("\n🎬 Welcome to Movie Platform Admin Management Tool")
    
    while True:
        show_menu()
        choice = input("\nSelect option (1-5): ").strip()
        
        if choice == '1':
            list_all_users()
        elif choice == '2':
            promote_to_admin()
        elif choice == '3':
            revoke_admin_privileges()
        elif choice == '4':
            create_new_admin()
        elif choice == '5':
            print("\n👋 Goodbye!\n")
            sys.exit(0)
        else:
            print("\n❌ Invalid option. Please select 1-5.\n")
        
        input("Press ENTER to continue...")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Interrupted. Goodbye!\n")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}\n")
        sys.exit(1)