# ⚠️ SECURITY WARNING

## Hardcoded Credentials in Archived Scripts

**IMPORTANT:** Some scripts in this archive contain **hardcoded production database credentials**.

### Affected Files

These scripts contain MongoDB connection strings with embedded credentials:

- `check-achievements.js` - Contains: `mongodb+srv://firasbelhiba:...@cluster0.n6adw.mongodb.net/workhole`
- Potentially other scripts in this directory

### Action Required

1. **Change Database Passwords Immediately**
   - If these scripts were ever committed to a public repository
   - If you suspect unauthorized access
   - As a security best practice

2. **Review All Scripts**
   - Before running any script, verify credentials are removed
   - Replace with environment variables:
     ```javascript
     const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dbwork';
     ```

3. **Never Commit These Scripts**
   - Already added to `.gitignore`: `backend/*.js`
   - Scripts in `backend/scripts/` are NOT ignored (for version control)
   - Ensure no credentials before committing any new scripts

### Recommended Rotation Schedule

- **Production DB Password:** Change immediately, then every 3 months
- **API Keys:** Rotate on breach or team member departure
- **JWT Secrets:** Every 6 months

### How to Securely Store Credentials

Use environment variables in `.env` files:

```bash
# backend/.env (NEVER commit this file)
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname

# backend/.env.example (Safe to commit - template only)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

Access in scripts:
```javascript
require('dotenv').config();
const uri = process.env.MONGODB_URI;
```

---

**This archive is kept for historical reference only.**
Scripts should be reviewed and sanitized before any use.
