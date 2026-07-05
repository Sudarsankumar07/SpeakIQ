import { pool } from '../config/db';

async function setupDatabase() {
  console.log('Running database schema initialization...');
  
  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );
  `;

  const createEvaluationsTableQuery = `
    CREATE TABLE IF NOT EXISTS evaluations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      topic TEXT NOT NULL,
      transcript TEXT NOT NULL,
      model_used VARCHAR(50) NOT NULL,
      grammar INTEGER NOT NULL,
      vocabulary INTEGER NOT NULL,
      fluency INTEGER NOT NULL,
      overall INTEGER NOT NULL,
      suggestions JSONB NOT NULL,
      corrected_transcript TEXT NOT NULL,
      feedback TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );
  `;

  try {
    // 1. Create users table
    console.log('Creating users table if it does not exist...');
    await pool.query(createUsersTableQuery);
    console.log('users table is ready.');

    // 2. Create evaluations table
    console.log('Creating evaluations table if it does not exist...');
    await pool.query(createEvaluationsTableQuery);
    console.log('evaluations table is ready.');

    console.log('🎉 Database setup completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error during database schema initialization:', error.message);
    process.exit(1);
  }
}

setupDatabase();
