import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { Mic, MicOff, AlertCircle, Send, ArrowLeft, Edit3 } from 'lucide-react';

// Declare Web Speech API types for TypeScript
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export const SpeakingScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const topic = location.state?.topic || "Describe your dream company and explain why you want to work there.";

  // State Variables
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [timer, setTimer] = useState(0);
  const [preferredModel, setPreferredModel] = useState<'gemini-3.5' | 'gemini-2.5'>('gemini-3.5');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs
  const recognitionRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const { SpeechRecognition, webkitSpeechRecognition } = window as IWindow;
    const SpeechRecObj = SpeechRecognition || webkitSpeechRecognition;

    if (!SpeechRecObj) {
      toast.error('Web Speech API is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    const rec = new SpeechRecObj();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event: any) => {
      let accumulatedTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          accumulatedTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (accumulatedTranscript) {
        setTranscript((prev) => prev + accumulatedTranscript);
      }
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please check your browser permissions.');
        stopRecording();
      }
    };

    rec.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Timer Management
  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording]);

  const startRecording = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition is not initialized.');
      return;
    }
    try {
      setTranscript('');
      setTimer(0);
      recognitionRef.current.start();
      setIsRecording(true);
      toast.success('Listening... Start speaking!');
    } catch (err) {
      console.error('Error starting recognition:', err);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    toast.success('Recording stopped. You can edit your transcript below.');
  };

  const formatTimer = (timeInSeconds: number) => {
    const mins = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
    const secs = (timeInSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;

  const handleSubmit = async () => {
    if (wordCount === 0) {
      toast.error('Please record or enter a speaking response first');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/evaluation', {
        topic,
        transcript,
        model: preferredModel,
      });

      toast.success('Evaluation generated successfully!');
      // Navigate to report screen
      navigate(`/report/${response.data.evaluation.id}`);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to generate evaluation';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-semibold cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>

      {/* Main card */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-lg">
        {/* Topic Banner */}
        <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100 mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Challenge Topic</span>
          <h2 className="text-lg font-bold text-slate-900 mt-1 leading-snug">"{topic}"</h2>
        </div>

        {/* Model Selection Row */}
        <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
          <div className="text-left">
            <h3 className="text-sm font-bold text-slate-800">Model Routing</h3>
            <p className="text-xs text-slate-500 mt-0.5">Choose preferred analysis model.</p>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setPreferredModel('gemini-3.5')}
              className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${
                preferredModel === 'gemini-3.5'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Gemini 3.5 (Primary)
            </button>
            <button
              onClick={() => setPreferredModel('gemini-2.5')}
              className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${
                preferredModel === 'gemini-2.5'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Gemini 2.5 (Economy)
            </button>
          </div>
        </div>

        {/* Audio Recording UI */}
        <div className="flex flex-col items-center justify-center py-6">
          {/* Wave visualizer */}
          <div className="h-12 flex items-center justify-center mb-6">
            {isRecording ? (
              <div className="sound-wave">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="sound-wave-bar" />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 font-medium">Click the microphone to start recording</p>
            )}
          </div>

          {/* Mic Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isSubmitting}
            className={`h-28 w-28 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 transition-all cursor-pointer ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 mic-active-pulse'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
            }`}
          >
            {isRecording ? <MicOff className="h-10 w-10 animate-pulse" /> : <Mic className="h-10 w-10" />}
          </button>

          {/* Timer and Word Count display */}
          <div className="flex gap-8 mt-8">
            <div className="text-center">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Duration</span>
              <p className="text-2xl font-black text-slate-800 mt-1">{formatTimer(timer)}</p>
            </div>
            <div className="h-10 w-px bg-slate-200" />
            <div className="text-center">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Words spoken</span>
              <p className={`text-2xl font-black mt-1 ${
                wordCount >= 100 && wordCount <= 200 ? 'text-emerald-600' : 'text-slate-800'
              }`}>
                {wordCount}
              </p>
            </div>
          </div>

          {/* Intelligent routing hint info */}
          <div className="mt-6 flex items-start gap-2 max-w-md bg-slate-50 border border-slate-100 rounded-xl p-3 text-slate-500 text-xs">
            <AlertCircle className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-600">Smart routing active</span>: 
              {wordCount < 100 ? (
                <span> Inputs &lt; 100 words route directly to <strong>Gemini 2.5</strong>. Speak more than 100 words for Gemini 3.5.</span>
              ) : (
                <span> Transcript length qualified. Routing to <strong>{preferredModel === 'gemini-3.5' ? 'Gemini 3.5' : 'Gemini 2.5'}</strong>.</span>
              )}
            </div>
          </div>
        </div>

        {/* Transcript review */}
        <div className="mt-8 border-t border-slate-100 pt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Edit3 className="h-4 w-4 text-indigo-500" />
              Speech Transcript
            </h3>
            {transcript && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                {isEditing ? 'Done Editing' : 'Edit Text'}
              </button>
            )}
          </div>

          {isEditing ? (
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full min-h-[120px] rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 text-sm leading-relaxed"
              placeholder="Start speaking, then edit the text here if needed."
            />
          ) : (
            <div className="w-full min-h-[120px] rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-slate-700 text-sm leading-relaxed text-left whitespace-pre-wrap">
              {transcript || (
                <span className="text-slate-400 italic">Your spoken transcript will appear here. You can manually tweak it once you stop recording.</span>
              )}
            </div>
          )}
        </div>

        {/* Submit */}
        {transcript && (
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isRecording}
              className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 text-sm font-bold text-white shadow-lg hover:bg-indigo-700 active:scale-98 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <span>Generating Evaluation...</span>
              ) : (
                <>
                  Submit Response
                  <Send className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
