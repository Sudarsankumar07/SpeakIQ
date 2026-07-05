import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { ArrowLeft, RefreshCw, Printer, AlertCircle, CheckCircle2, MessageSquare, Eye } from 'lucide-react';

export const EvaluationReport: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tabs for accordion
  const [activeTab, setActiveTab] = useState<'suggestions' | 'transcript' | 'feedback'>('suggestions');

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/history/${id}`);
      setEvaluation(response.data.evaluation);
    } catch (err: any) {
      toast.error('Failed to load evaluation details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDetails();
    }
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="mx-auto max-w-xl text-center py-12 px-4">
        <h2 className="text-xl font-bold text-slate-800">Report not found</h2>
        <p className="text-slate-500 mt-2">The evaluation you are looking for does not exist or you do not have permission to view it.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Parse suggestions if string
  let suggestionsList = evaluation.suggestions || [];
  if (typeof suggestionsList === 'string') {
    try {
      suggestionsList = JSON.parse(suggestionsList);
    } catch {
      suggestionsList = [];
    }
  }

  // Determine fallback alert banner content
  const hasFallback = evaluation.fallback_triggered || evaluation.fallbackTriggered;
  const fallbackReason = evaluation.fallback_reason || evaluation.fallbackReason;

  let fallbackMessage = '';
  if (hasFallback) {
    if (fallbackReason === 'USER_LIMIT_EXCEEDED') {
      fallbackMessage = 'Your Gemini 3.5 hourly quota was exhausted. This session was evaluated using Gemini 2.5.';
    } else if (fallbackReason === 'API_LIMIT_EXCEEDED') {
      fallbackMessage = 'Google AI Studio rate limits were hit. The system automatically fell back to Gemini 2.5 for evaluation.';
    } else if (fallbackReason === 'WORD_COUNT_ROUTING') {
      fallbackMessage = 'Your spoken response was under 100 words. It was automatically routed to Gemini 2.5 to conserve premium tokens.';
    } else {
      fallbackMessage = 'Automatically evaluated using Gemini 2.5.';
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 print:py-0 print:px-0">
      {/* Action Row (hidden in print) */}
      <div className="mb-6 flex justify-between items-center print:hidden">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-semibold cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all cursor-pointer"
        >
          <Printer className="h-4 w-4" />
          Download PDF / Print
        </button>
      </div>

      {/* Fallback Warning Notice */}
      {hasFallback && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-100 p-4 text-amber-800 text-sm print:border-amber-300">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Model Fallback Active</span>
            <p className="mt-0.5 text-amber-700">{fallbackMessage}</p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Overall score and categorized scores */}
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 shadow-md text-center flex flex-col items-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overall Score</span>
            
            {/* SVG circular gauge */}
            <div className="relative h-40 w-40 flex items-center justify-center mt-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  className="stroke-slate-100 fill-none"
                  strokeWidth="12"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  className="stroke-indigo-600 fill-none"
                  strokeWidth="12"
                  strokeDasharray={440}
                  strokeDashoffset={440 - (440 * evaluation.overall) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-4xl font-black text-slate-900">{evaluation.overall}</span>
                <span className="text-slate-400 block text-xs font-semibold">out of 100</span>
              </div>
            </div>

            <p className="mt-6 text-sm text-slate-500 max-w-xs">
              Analyzed with <strong className="text-slate-800 uppercase">{evaluation.model_used}</strong> on {new Date(evaluation.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Subscores list */}
          <div className="glass-panel rounded-3xl p-6 shadow-md">
            <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Subscores</h3>
            <div className="space-y-4">
              {/* Grammar */}
              <div>
                <div className="flex justify-between text-sm font-bold text-slate-700 mb-1">
                  <span>Grammar Accuracy</span>
                  <span>{evaluation.grammar}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${evaluation.grammar}%` }} />
                </div>
              </div>
              
              {/* Vocabulary */}
              <div>
                <div className="flex justify-between text-sm font-bold text-slate-700 mb-1">
                  <span>Vocabulary Range</span>
                  <span>{evaluation.vocabulary}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${evaluation.vocabulary}%` }} />
                </div>
              </div>

              {/* Fluency */}
              <div>
                <div className="flex justify-between text-sm font-bold text-slate-700 mb-1">
                  <span>Fluency & Coherence</span>
                  <span>{evaluation.fluency}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${evaluation.fluency}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed feedback tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs bar */}
          <div className="glass-panel rounded-3xl p-6 shadow-md min-h-[480px]">
            <div className="flex border-b border-slate-100 pb-3 gap-2">
              <button
                onClick={() => setActiveTab('suggestions')}
                className={`px-4 py-2.5 text-sm font-bold rounded-xl cursor-pointer transition-all ${
                  activeTab === 'suggestions'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                Suggestions ({suggestionsList.length})
              </button>
              <button
                onClick={() => setActiveTab('transcript')}
                className={`px-4 py-2.5 text-sm font-bold rounded-xl cursor-pointer transition-all ${
                  activeTab === 'transcript'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                Corrected Transcript
              </button>
              <button
                onClick={() => setActiveTab('feedback')}
                className={`px-4 py-2.5 text-sm font-bold rounded-xl cursor-pointer transition-all ${
                  activeTab === 'feedback'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                Constructive Feedback
              </button>
            </div>

            {/* Tab content area */}
            <div className="mt-6 text-left">
              {activeTab === 'suggestions' && (
                <div>
                  <h4 className="text-base font-extrabold text-slate-800 mb-4 flex items-center gap-1.5">
                    <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                    Grammar & Vocabulary Suggestions
                  </h4>
                  {suggestionsList.length === 0 ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-emerald-800 text-sm">
                      <span className="font-bold block">Excellent work!</span>
                      No significant grammatical errors or phrasing issues were detected in your transcript.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {suggestionsList.map((item: any, idx: number) => (
                        <div key={idx} className="border border-slate-100 bg-slate-50/40 rounded-2xl p-4">
                          <div className="flex flex-col md:flex-row gap-3 md:items-center">
                            <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md border border-red-100 w-fit">
                              Original
                            </span>
                            <span className="text-sm font-semibold text-slate-700 italic">
                              "{item.original}"
                            </span>
                          </div>
                          <div className="flex flex-col md:flex-row gap-3 md:items-center mt-3 border-t border-slate-100/50 pt-2.5">
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 w-fit">
                              Suggested
                            </span>
                            <span className="text-sm font-bold text-slate-900 italic">
                              "{item.corrected}"
                            </span>
                          </div>
                          <div className="mt-3 text-xs text-slate-500 leading-relaxed bg-white/70 p-2.5 rounded-xl border border-slate-100/50">
                            <strong>Explanation:</strong> {item.explanation}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'transcript' && (
                <div>
                  <h4 className="text-base font-extrabold text-slate-800 mb-4 flex items-center gap-1.5">
                    <Eye className="h-5 w-5 text-indigo-600" />
                    Side-by-Side Transcript Comparison
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Speech Transcript</span>
                      <div className="mt-2 bg-slate-50 rounded-2xl p-4 text-sm text-slate-700 leading-relaxed border border-slate-100 whitespace-pre-wrap">
                        {evaluation.transcript}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Corrected Speaking Text</span>
                      <div className="mt-2 bg-indigo-50/20 rounded-2xl p-4 text-sm text-indigo-950 leading-relaxed border border-indigo-100 whitespace-pre-wrap">
                        {evaluation.corrected_transcript || evaluation.correctedTranscript}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'feedback' && (
                <div>
                  <h4 className="text-base font-extrabold text-slate-800 mb-4 flex items-center gap-1.5">
                    <MessageSquare className="h-5 w-5 text-indigo-600" />
                    General Feedback
                  </h4>
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 leading-relaxed text-slate-700 text-sm whitespace-pre-wrap">
                    {evaluation.feedback}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
