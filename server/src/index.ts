import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import router from './routes/api';

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for prototype simplicity
  exposedHeaders: [
    'X-RateLimit-Limit-Gemini35',
    'X-RateLimit-Remaining-Gemini35',
    'X-RateLimit-Limit-Gemini25',
    'X-RateLimit-Remaining-Gemini25'
  ]
}));
app.use(express.json());

// Routes
app.use('/api', router);

// Default status route
app.get('/status', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err.message || err);
  res.status(500).json({ error: 'An unexpected server error occurred' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 SpeakIQ Backend running on port ${PORT}`);
});
