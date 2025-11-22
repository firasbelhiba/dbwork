# Backend Scripts

This directory contains database migration and debugging scripts.

## ⚠️ IMPORTANT SECURITY NOTICE

**NEVER commit these scripts with production credentials!**

All scripts in this directory should use environment variables for database connections:

```javascript
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dbwork';
```

## Directory Structure

- `archive/` - Completed migrations and one-time scripts (kept for reference)
- `migrations/` - Database migration scripts
- `debug/` - Debugging and diagnostic scripts

## Usage

```bash
# Run a script
cd backend
node scripts/migrations/your-script.js
```

## Script Categories

### Migrations (Completed)
Scripts that modified data structure - kept for historical reference.

### Debug Scripts
Diagnostic scripts for investigating issues - can be deleted when no longer needed.
