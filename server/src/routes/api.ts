import { Router } from 'express';
import { register, login, getProfile } from '../controllers/auth';
import { createEvaluation, getHistory, getEvaluationDetails, deleteEvaluationAudio } from '../controllers/evaluation';
import { authenticateToken } from '../middleware/auth';
import { rateLimiterMiddleware } from '../middleware/rateLimiter';

const router = Router();

// Authentication
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/user/profile', authenticateToken, getProfile);

// Evaluations & History
router.post('/evaluation', authenticateToken, rateLimiterMiddleware, createEvaluation);
router.delete('/evaluation/:id/audio', authenticateToken, deleteEvaluationAudio);
router.get('/history', authenticateToken, getHistory);
router.get('/history/:id', authenticateToken, getEvaluationDetails);

export default router;
