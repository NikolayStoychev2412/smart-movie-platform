#!/usr/bin/env python3
"""
Admin management tool for the movie platform.

Run from backend root: python scripts/manage_admins.py
"""

import sys
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
backend_root = os.path.abspath(os.path.join(script_dir, '..'))
sys.path.insert(0, backend_root)

from app.database import SyncSessionLocal, Base, sync_engine
from app.models.user import User

try:
    from app.utils.security import hash_password
except ImportError:
    try:
        from app.core.security import hash_password
    except ImportError:
        try:
            from app.auth import hash_password
        except ImportError:
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            def hash_password(password: str) -> str:
                return pwd_context.hash(password)

SessionLocal = SyncSessionLocal
engine = sync_engine

try:
    from app.models.review import Review
    from app.models.movie import Movie
    from app.models.watchlist import WatchlistItem
except ImportError:
    pass

Base.metadata.create_all(bind=engine)


def list_all_users():
    """Display all users with their admin status."""
    db = SessionLocal()
    try:
        users = db.query(User).all()

        if not users:
            print("\nNo users found in database.\n")
            return

        print(f"\n{'ID':<5} {'STATUS':<12} {'NAME':<25} {'EMAIL':<35}")
        print("-" * 77)

        for user in users:
            status = "ADMIN" if user.is_admin else "USER"
            name = (user.name or "")[:24]
            email = (user.email or "")[:34]
            print(f"{user.id:<5} {status:<12} {name:<25} {email:<35}")

        print()
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()


def promote_to_admin():
    """Make a user an admin by email."""
    db = SessionLocal()
    try:
        print("\n--- Promote User to Admin ---")
        email = input("Enter user email: ").strip()

        if not email:
            print("Email cannot be empty.")
            return

        user = db.query(User).filter(User.email == email).first()

        if not user:
            print(f"\nUser with email '{email}' not found.")
            print("Tip: Use option 1 to see all users\n")
            return

        if user.is_admin:
            print(f"\nUser '{email}' is already an admin.\n")
            return

        print(f"\nUser Detail:")
        print(f"   ID: {user.id}")
        print(f"   Name: {user.name}")
        print(f"   Email: {user.email}")
        print(f"   Current Status: Regular User")

        confirm = input("\nMake this user an ADMIN? (yes/no): ").strip().lower()

        if confirm == 'yes':
            user.is_admin = True
            db.commit()
            print(f"\n'{email}' is now an admin.\n")
        else:
            print("\nOperation cancelled.\n")

    except Exception as e:
        print(f"\nError: {e}\n")
        db.rollback()
    finally:
        db.close()


def revoke_admin_privileges():
    """Revoke admin privileges from a user."""
    db = SessionLocal()
    try:
        print("\n--- Revoke Admin Privileges ---")
        email = input("Enter admin email: ").strip()

        if not email:
            print("Email cannot be empty.")
            return

        user = db.query(User).filter(User.email == email).first()

        if not user:
            print(f"\nUser with email '{email}' not found.\n")
            return

        if not user.is_admin:
            print(f"\nUser '{email}' is not an admin.\n")
            return

        print(f"\nAdmin Detail:")
        print(f"   ID: {user.id}")
        print(f"   Name: {user.name}")
        print(f"   Email: {user.email}")

        confirm = input("\nREVOKE admin privileges? (yes/no): ").strip().lower()

        if confirm == 'yes':
            user.is_admin = False
            db.commit()
            print(f"\nAdmin privileges revoked from '{email}'.\n")
        else:
            print("\nOperation cancelled.\n")

    except Exception as e:
        print(f"\nError: {e}\n")
        db.rollback()
    finally:
        db.close()


def create_new_admin():
    """Create a brand new admin user."""
    db = SessionLocal()
    try:
        print("\n--- Create New Admin User ---")
        name = input("Full Name: ").strip()
        email = input("Email: ").strip()
        password = input("Password: ").strip()

        if not all([name, email, password]):
            print("\nAll fields are required.\n")
            return

        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"\nUser with email '{email}' already exists.")

            if existing.is_admin:
                print("   (Already an admin)\n")
            else:
                promote = input("   Make them admin? (yes/no): ").strip().lower()
                if promote == 'yes':
                    existing.is_admin = True
                    db.commit()
                    print(f"\n'{email}' is now an admin.\n")
                else:
                    print("\nOperation cancelled.\n")
            return

        new_admin = User(
            name=name,
            email=email,
            hashed_password=hash_password(password),
            is_admin=True
        )

        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)

        print(f"\nAdmin user created.")
        print(f"   ID: {new_admin.id}")
        print(f"   Name: {new_admin.name}")
        print(f"   Email: {new_admin.email}")
        print(f"   Status: ADMIN\n")

    except Exception as e:
        print(f"\nError: {e}\n")
        db.rollback()
    finally:
        db.close()


def show_menu():
    """Display the main menu."""
    print("\nAdmin Management Tool - Movie Platform")
    print("1. List all users")
    print("2. Promote user to admin")
    print("3. Revoke admin privileges")
    print("4. Create new admin user")
    print("5. Exit")


def main():
    """Main program loop."""
    print("\nWelcome to Movie Platform Admin Management Tool")

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
            print("\nGoodbye.\n")
            sys.exit(0)
        else:
            print("\nInvalid option. Please select 1-5.\n")

        input("Press ENTER to continue...")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted. Goodbye.\n")
        sys.exit(0)
    except Exception as e:
        print(f"\nFatal error: {e}\n")
        sys.exit(1)
