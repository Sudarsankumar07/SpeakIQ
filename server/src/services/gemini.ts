import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('WARNING: GEMINI_API_KEY is not defined in environment variables.');
}

const ai = new GoogleGenAI({ apiKey });

// Map system model identifiers to actual Gemini API model IDs
// gemini-3.5 maps to gemini-2.5-pro (premium) and gemini-2.5 maps to gemini-2.5-flash (standard)
export const MODEL_MAPPING = {
  'gemini-3.5': process.env.MODEL_35_NAME || 'gemini-2.5-pro',
  'gemini-2.5': process.env.MODEL_25_NAME || 'gemini-2.5-flash',
};

export interface EvaluationResult {
  grammar: number;
  vocabulary: number;
  fluency: number;
  overall: number;
  suggestions: Array<{
    original: string;
    corrected: string;
    explanation: string;
  }>;
  correctedTranscript: string;
  feedback: string;
  modelUsed: 'gemini-3.5' | 'gemini-2.5';
  fallbackTriggered: boolean;
  fallbackReason?: string;
}

/**
 * Run evaluation using the selected model. If primary fails due to rate limits or API errors,
 * automatically attempt fallback to the secondary model.
 */
export async function evaluateTranscript(
  transcript: string,
  topic: string,
  preferredModel: 'gemini-3.5' | 'gemini-2.5' = 'gemini-3.5',
  forceFallback: boolean = false
): Promise<EvaluationResult> {
  let modelToUse = preferredModel;
  let fallbackTriggered = forceFallback;
  let fallbackReason = forceFallback ? 'USER_LIMIT_EXCEEDED' : undefined;

  const systemInstruction = `
    You are an expert English language examiner evaluating a user's speaking response.
    Analyze the speaking transcript based on the topic: "${topic}".
    Provide a professional assessment with scores (0-100) for Grammar, Vocabulary, Fluency, and an Overall score.
    Also, identify specific grammar or phrasing errors in the transcript. Suggest improvements with original phrases, corrected versions, and explanation.
    Provide a fully corrected version of the transcript, and write positive, constructive feedback.
    
    You MUST respond in JSON format matching this schema:
    {
      "grammar": number (0-100),
      "vocabulary": number (0-100),
      "fluency": number (0-100),
      "overall": number (0-100),
      "suggestions": [
        {
          "original": "substring in transcript with error",
          "corrected": "corrected version of the substring",
          "explanation": "why this correction is better"
        }
      ],
      "correctedTranscript": "the complete transcript rewritten with all grammatical and vocabulary issues corrected",
      "feedback": "constructive, encouraging feedback about their speaking response"
    }
  `;

  // First Attempt
  try {
    const apiModelName = MODEL_MAPPING[modelToUse];
    console.log(`Evaluating using model: ${modelToUse} (${apiModelName})...`);
    
    const response = await ai.models.generateContent({
      model: apiModelName,
      contents: [
        {
          role: 'user',
          parts: [{ text: `Topic: ${topic}\n\nTranscript: ${transcript}` }]
        }
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Received empty response from Gemini API');
    }

    const parsedData = JSON.parse(text);
    return {
      ...parsedData,
      modelUsed: modelToUse,
      fallbackTriggered,
      fallbackReason,
    };
  } catch (error: any) {
    console.error(`Error during evaluation with ${modelToUse}:`, error.message);

    // If we were already on the fallback model, or if we didn't use gemini-3.5, fail
    if (modelToUse === 'gemini-2.5') {
      throw error;
    }

    // Attempt automatic API-level fallback to Gemini 2.5
    console.log('API-level rate limit or error encountered. Attempting fallback to gemini-2.5...');
    try {
      const apiModelNameFallback = MODEL_MAPPING['gemini-2.5'];
      const responseFallback = await ai.models.generateContent({
        model: apiModelNameFallback,
        contents: [
          {
            role: 'user',
            parts: [{ text: `Topic: ${topic}\n\nTranscript: ${transcript}` }]
          }
        ],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        }
      });

      const textFallback = responseFallback.text;
      if (!textFallback) {
        throw new Error('Received empty response from Gemini Fallback API');
      }

      const parsedData = JSON.parse(textFallback);
      return {
        ...parsedData,
        modelUsed: 'gemini-2.5',
        fallbackTriggered: true,
        fallbackReason: 'API_LIMIT_EXCEEDED',
      };
    } catch (fallbackError: any) {
      console.error('Fallback model also failed:', fallbackError.message);
      throw new Error(`Failed to evaluate transcript. Both primary and fallback models returned errors: ${fallbackError.message}`);
    }
  }
}
