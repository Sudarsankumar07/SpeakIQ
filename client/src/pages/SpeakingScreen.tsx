import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { Mic, MicOff, AlertCircle, Send, ArrowLeft, Edit3, Play, Pause } from 'lucide-react';

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
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [timer, setTimer] = useState(0);
  const [preferredModel, setPreferredModel] = useState<'gemini-3.5' | 'gemini-2.5'>('gemini-3.5');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);

  // Refs
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
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
        toast.error('Microphone access denied. Please check browser permissions.');
        stopRecording();
      }
    };

    rec.onend = () => {
      // SpeechRecognition automatically restarts or stops when paused
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Timer Management
  useEffect(() => {
    if (isRecording && !isPaused) {
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
  }, [isRecording, isPaused]);

  const startRecording = async () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition is not initialized.');
      return;
    }
    try {
      // 1. Initialize Media Recorder
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Convert to Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setAudioBase64(base64data);
        };
      };

      // 2. Clear states and start capturing
      setTranscript('');
      setAudioUrl(null);
      setAudioBase64(null);
      setTimer(0);
      setIsPaused(false);

      mediaRecorder.start();
      recognitionRef.current.start();
      setIsRecording(true);

      toast.success('Listening and recording audio... Start speaking!');
    } catch (err: any) {
      console.error('Error starting audio recording:', err);
      toast.error('Could not access microphone: ' + (err.message || 'Permission denied'));
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsPaused(true);
    toast.success('Recording paused');
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
    }
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
    setIsPaused(false);
    toast.success('Recording resumed');
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    // Stop all media tracks to release hardware
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    setIsRecording(false);
    setIsPaused(false);
    toast.success('Recording stopped. Review your audio below.');
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
        audio: audioBase64, // Send the base64 audio string to the backend
      });

      toast.success('Evaluation completed!');
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
            {isRecording && !isPaused ? (
              <div className="sound-wave">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="sound-wave-bar" />
                ))}
              </div>
            ) : isPaused ? (
              <p className="text-sm text-amber-500 font-bold animate-pulse">Recording Paused</p>
            ) : (
              <p className="text-sm text-slate-400 font-medium">Click the microphone to start recording</p>
            )}
          </div>

          {/* Controls Panel */}
          <div className="flex items-center gap-6">
            {/* Pause/Resume button */}
            {isRecording && (
              <button
                onClick={isPaused ? resumeRecording : pauseRecording}
                className="h-14 w-14 rounded-full flex items-center justify-center border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
              >
                {isPaused ? <Play className="h-5 w-5 text-indigo-600 fill-indigo-600" /> : <Pause className="h-5 w-5" />}
              </button>
            )}

            {/* Mic Button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isSubmitting}
              className={`h-24 w-24 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 transition-all cursor-pointer ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 mic-active-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
              }`}
            >
              {isRecording ? <MicOff className="h-8 w-8 animate-pulse" /> : <Mic className="h-8 w-8" />}
            </button>
          </div>

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

          {/* Custom audio playback player */}
          {audioUrl && !isRecording && (
            <div className="mt-8 w-full max-w-md bg-indigo-50/30 border border-indigo-100 rounded-2xl p-4 text-center">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-2">
                Listen to Your Practice Response
              </span>
              <audio src={audioUrl} controls className="w-full h-8" />
            </div>
          )}

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
