const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Execute all migrations
const runMigration = async () => {
  const client = await pool.connect();
  try {
    const fs = require('fs');
    const path = require('path');
    const migrationsDir = path.join(__dirname, '../../migrations');
    
    // Create migrations table to track executed migrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Get all migration files and sort them
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    // Get executed migrations
    const executedResult = await client.query('SELECT version FROM schema_migrations');
    const executedVersions = new Set(executedResult.rows.map(row => row.version));
    
    // Execute pending migrations
    for (const file of migrationFiles) {
      const version = file.replace('.sql', '');
      
      if (!executedVersions.has(version)) {
        console.log(`Running migration: ${file}`);
        const migrationSQL = fs.readFileSync(
          path.join(migrationsDir, file),
          'utf8'
        );
        
        await client.query('BEGIN');
        try {
          await client.query(migrationSQL);
          await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
          await client.query('COMMIT');
          console.log(`Migration ${file} completed successfully`);
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      } else {
        console.log(`Migration ${file} already executed, skipping`);
      }
    }
    
    console.log('All migrations completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, runMigration };