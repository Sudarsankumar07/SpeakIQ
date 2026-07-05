import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';
import { RateLimitRequest } from '../middleware/rateLimiter';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-speakiq-key-2026';

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ error: 'Name, email, and password are required' });
    return;
  }

  try {
    // Check if user exists
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const insertResult = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, passwordHash, name]
    );

    const user = insertResult.rows[0];

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user,
    });
  } catch (error: any) {
    console.error('Error during registration:', error.message);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    // Fetch user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      res.status(400).json({ error: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(400).json({ error: 'Invalid email or password' });
      return;
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error: any) {
    console.error('Error during login:', error.message);
    res.status(500).json({ error: 'Internal server error during login' });
  }
}

export async function getProfile(req: RateLimitRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    // Fetch user basic info
    const userResult = await pool.query('SELECT id, email, name, created_at FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userResult.rows[0];

    // Fetch dashboard stats from evaluations
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*)::int as total_tests,
        COALESCE(AVG(overall), 0)::float as avg_overall,
        COALESCE(AVG(grammar), 0)::float as avg_grammar,
        COALESCE(AVG(vocabulary), 0)::float as avg_vocabulary,
        COALESCE(AVG(fluency), 0)::float as avg_fluency
       FROM evaluations 
       WHERE user_id = $1`,
      [userId]
    );

    const stats = statsResult.rows[0];

    res.status(200).json({
      user,
      stats: {
        totalTests: stats.total_tests,
        avgOverall: Math.round(stats.avg_overall),
        avgGrammar: Math.round(stats.avg_grammar),
        avgVocabulary: Math.round(stats.avg_vocabulary),
        avgFluency: Math.round(stats.avg_fluency),
      },
    });
  } catch (error: any) {
    console.error('Error fetching profile:', error.message);
    res.status(500).json({ error: 'Internal server error fetching profile' });
  }
}
