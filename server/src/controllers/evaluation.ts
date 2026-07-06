import { Response } from 'express';
import { pool } from '../config/db';
import { RateLimitRequest } from '../middleware/rateLimiter';
import { transcribeAudio, evaluateTranscript } from '../services/gemini';

export async function transcribeAudioController(req: any, res: Response): Promise<void> {
  const { audio } = req.body;
  if (!audio) {
    res.status(400).json({ error: 'Audio is required for transcription' });
    return;
  }

  try {
    const transcript = await transcribeAudio(audio);
    res.status(200).json({ transcript });
  } catch (error: any) {
    console.error('Error during transcription:', error.message);
    res.status(500).json({ error: error.message || 'Failed to transcribe audio' });
  }
}

export async function createEvaluation(req: RateLimitRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const { topic, transcript, audio } = req.body;
  const chosenModel = req.evaluationModel || 'gemini-3.5';
  const fallbackTriggered = req.fallbackTriggered || false;
  const fallbackReason = req.fallbackReason;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!transcript || !topic) {
    res.status(400).json({ error: 'Topic and transcript are required' });
    return;
  }

  try {
    // Run text transcript evaluation with Gemini
    const result = await evaluateTranscript(transcript, topic, chosenModel, fallbackTriggered);

    // Save evaluation to database
    const finalModelUsed = result.modelUsed;
    const finalFallbackTriggered = result.fallbackTriggered || fallbackTriggered;
    const finalFallbackReason = result.fallbackReason || fallbackReason;

    const dbResult = await pool.query(
      `INSERT INTO evaluations 
        (user_id, topic, transcript, model_used, grammar, vocabulary, fluency, overall, suggestions, corrected_transcript, feedback, audio_data) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
       RETURNING *`,
      [
        userId,
        topic,
        transcript, // Save user's transcript (edited or verbatim)
        finalModelUsed,
        result.grammar,
        result.vocabulary,
        result.fluency,
        result.overall,
        JSON.stringify(result.suggestions),
        result.correctedTranscript,
        result.feedback,
        audio || null, // Stores raw base64 audio URI if provided
      ]
    );

    const savedEvaluation = dbResult.rows[0];

    res.status(201).json({
      message: 'Evaluation completed successfully',
      evaluation: {
        ...savedEvaluation,
        suggestions: result.suggestions, // Return parsed JSON array
        fallbackTriggered: finalFallbackTriggered,
        fallbackReason: finalFallbackReason,
      },
      rateLimits: req.rateLimits,
    });
  } catch (error: any) {
    console.error('Error during evaluation process:', error.message);
    res.status(500).json({ error: error.message || 'Failed to complete speaking evaluation' });
  }
}

export async function getHistory(req: RateLimitRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const result = await pool.query(
      'SELECT id, topic, model_used, overall, grammar, vocabulary, fluency, created_at FROM evaluations WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.status(200).json({ history: result.rows });
  } catch (error: any) {
    console.error('Error fetching history:', error.message);
    res.status(500).json({ error: 'Internal server error fetching evaluation history' });
  }
}

export async function getEvaluationDetails(req: RateLimitRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const result = await pool.query(
      'SELECT * FROM evaluations WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Evaluation not found or access denied' });
      return;
    }

    const evaluation = result.rows[0];
    
    // Ensure suggestions is parsed to array if stored as string/JSON
    if (typeof evaluation.suggestions === 'string') {
      try {
        evaluation.suggestions = JSON.parse(evaluation.suggestions);
      } catch {
        evaluation.suggestions = [];
      }
    }

    res.status(200).json({ evaluation });
  } catch (error: any) {
    console.error('Error fetching evaluation details:', error.message);
    res.status(500).json({ error: 'Internal server error fetching evaluation details' });
  }
}

export async function deleteEvaluationAudio(req: RateLimitRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const result = await pool.query(
      'UPDATE evaluations SET audio_data = NULL WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Evaluation not found or access denied' });
      return;
    }

    console.log(`Successfully deleted audio for evaluation ${id}`);
    res.status(200).json({ message: 'Audio deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting evaluation audio:', error.message);
    res.status(500).json({ error: 'Internal server error deleting audio' });
  }
}

