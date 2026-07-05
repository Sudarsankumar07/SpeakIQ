import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/db';

export interface RateLimitRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
  evaluationModel?: 'gemini-3.5' | 'gemini-2.5';
  fallbackTriggered?: boolean;
  fallbackReason?: string;
  rateLimits?: {
    g35Limit: number;
    g35Remaining: number;
    g25Limit: number;
    g25Remaining: number;
  };
}

export async function rateLimiterMiddleware(
  req: RateLimitRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized: User not identified for rate limiting' });
    return;
  }

  const { duration, model } = req.body;

  // 2. Intelligent Duration-Based Routing & Model Selection
  // Assume a normal speaking rate of 2.2 words per second.
  // 45 seconds duration corresponds to approximately 100 words.
  const estimatedWordCount = Math.floor((duration || 0) * 2.2);
  console.log(`User recorded duration: ${duration}s. Estimated word count: ${estimatedWordCount} words.`);

  // Quota specifications
  const G35_LIMIT = 3;
  const G25_LIMIT = 10;

  try {
    // 1. Fetch counts from database in the last hour
    const queryResult = await pool.query(
      `SELECT 
        COUNT(CASE WHEN model_used = 'gemini-3.5' THEN 1 END)::int as g35_count,
        COUNT(CASE WHEN model_used = 'gemini-2.5' THEN 1 END)::int as g25_count
       FROM evaluations 
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [userId]
    );

    const counts = queryResult.rows[0] || { g35_count: 0, g25_count: 0 };
    const g35Remaining = Math.max(0, G35_LIMIT - counts.g35_count);
    const g25Remaining = Math.max(0, G25_LIMIT - counts.g25_count);

    req.rateLimits = {
      g35Limit: G35_LIMIT,
      g35Remaining,
      g25Limit: G25_LIMIT,
      g25Remaining,
    };

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit-Gemini35', G35_LIMIT.toString());
    res.setHeader('X-RateLimit-Remaining-Gemini35', g35Remaining.toString());
    res.setHeader('X-RateLimit-Limit-Gemini25', G25_LIMIT.toString());
    res.setHeader('X-RateLimit-Remaining-Gemini25', g25Remaining.toString());

    let selectedModel: 'gemini-3.5' | 'gemini-2.5' = (model === 'gemini-2.5') ? 'gemini-2.5' : 'gemini-3.5';
    let fallbackTriggered = false;
    let fallbackReason: string | undefined;

    if (duration && duration < 45) {
      // Shorter responses (< 45s) are automatically routed to the economy model to save premium tokens
      console.log(`Duration (${duration}s) < 45s. Forcing routing to gemini-2.5.`);
      selectedModel = 'gemini-2.5';
      fallbackTriggered = selectedModel !== model && model === 'gemini-3.5';
      if (fallbackTriggered) {
        fallbackReason = 'WORD_COUNT_ROUTING';
      }
    }

    // 3. Quota validations and backend routing (No blocking 429 error returned)
    if (selectedModel === 'gemini-3.5') {
      if (g35Remaining > 0) {
        req.evaluationModel = 'gemini-3.5';
        req.fallbackTriggered = false;
      } else {
        // Automatically fall back to Gemini 2.5 without blocking
        console.log(`Gemini 3.5 quota exhausted for user ${userId}. Automatically falling back to Gemini 2.5.`);
        req.evaluationModel = 'gemini-2.5';
        req.fallbackTriggered = true;
        req.fallbackReason = 'USER_LIMIT_EXCEEDED';
      }
    } else {
      // User explicitly selected Gemini 2.5
      req.evaluationModel = 'gemini-2.5';
      req.fallbackTriggered = fallbackTriggered;
      req.fallbackReason = fallbackReason;
    }

    next();
  } catch (error: any) {
    console.error('Error in rate limiter middleware:', error.message);
    res.status(500).json({ error: 'Internal server error checking rate limits' });
  }
}
