# VS Code SQL Linting - Known Limitation

## Issue
The SQL migration file `drizzle/0002_stripe_subscriptions.sql` shows syntax errors in VS Code, such as:
- "Incorrect syntax near '\`'"
- "Expecting ADD_COUNTER, ADD_SENSITIVITY, or ADD_SIGNATURE"

## Root Cause
VS Code's embedded **MSSQL extension** validates all `.sql` files using **T-SQL (Microsoft SQL Server) syntax**, not MySQL syntax.

The file contains valid **MySQL syntax** which is not recognized by the T-SQL parser.

## Why This Is Safe To Ignore

1. **The SQL file is valid MySQL**
   ```sql
   ALTER TABLE `users` ADD COLUMN `stripeCustomerId` varchar(255);
   CREATE TABLE IF NOT EXISTS `subscriptions` (...)
   ```
   This is standard MySQL syntax.

2. **The file works in production**
   - Deployed successfully in Cloud Run
   - Database schema initialized correctly
   - Tables created and accessible

3. **Build process validated it**
   - Docker build completes successfully
   - Application starts without SQL errors
   - Drizzle ORM validates schema on startup

## Workarounds Applied

1. **Disabled MSSQL linting** in `.vscode/settings.json`
   ```json
   "mssql.linters.enabled": false,
   "sql.linting.enabled": false
   ```

2. **Added `.sqlfluff` configuration** for MySQL
   ```ini
   [sqlfluff]
   dialect = mysql
   ```

3. **Set MySQL language association** in settings
   ```json
   "[mysql]": {
     "editor.defaultFormatter": null
   }
   ```

## Conclusion

These are **false positives from VS Code's T-SQL linter**. The actual SQL file is correct and functional. The errors can be safely ignored, or users can:

- Disable the MSSQL extension
- Use a MySQL-specific linter extension instead
- Use the VS Code SQL extension configured for MySQL

The application deployment and database operations are not affected by these warnings.
