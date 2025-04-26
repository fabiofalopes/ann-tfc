# Alembic Commands and Best Practices

## Basic Commands

### Initial Setup
```bash
# Initialize Alembic in a project
alembic init alembic

# Create initial migration
alembic revision --autogenerate -m "initial"

# Apply migrations
alembic upgrade head
```

### Common Workflow Commands
```bash
# Create a new migration
alembic revision --autogenerate -m "description_of_changes"

# Apply all pending migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# Rollback to a specific version
alembic downgrade <version>

# Check current migration version
alembic current

# Check migration history
alembic history
```

### Troubleshooting Commands
```bash
# Check for pending migrations
alembic check

# Show migration history with details
alembic history --verbose

# Show current migration status
alembic current --verbose
```

## Best Practices

1. **Always Use Autogenerate**
   - Use `--autogenerate` when creating migrations to ensure SQLAlchemy models and database schema stay in sync
   - Review generated migrations before applying them

2. **Meaningful Migration Names**
   - Use descriptive names that explain what the migration does
   - Example: `alembic revision --autogenerate -m "add_user_email_index"`

3. **Version Control**
   - Always commit migration files to version control
   - Never modify existing migrations after they've been applied

4. **Testing Migrations**
   - Test both upgrade and downgrade paths
   - Use `alembic downgrade -1` to verify rollback works

5. **Environment Configuration**
   - Use environment variables for database URLs
   - Keep `alembic.ini` and `env.py` configuration clean and maintainable

## Common Issues and Solutions

1. **Database Connection Issues**
   - Ensure database URL is correct in both `alembic.ini` and `config.py`
   - For SQLite, use `check_same_thread=False` in connection args

2. **Migration Conflicts**
   - If migrations get out of sync, use `alembic stamp head` to mark current state
   - For complex conflicts, consider creating a new migration to fix the state

3. **Missing Dependencies**
   - Ensure all required packages are installed
   - Check Python path includes your project directory

## SQLite Specific Notes

1. **Connection Configuration**
   ```python
   engine = create_engine(
       settings.SQLALCHEMY_DATABASE_URL,
       echo=True,
       connect_args={"check_same_thread": False}
   )
   ```

2. **File Paths**
   - Use absolute paths for SQLite databases
   - Example: `sqlite:////absolute/path/to/database.db`

3. **Transaction Handling**
   - SQLite has limited transaction support
   - Use `context.begin_transaction()` carefully 