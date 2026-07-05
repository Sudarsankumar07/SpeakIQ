import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { getCachedQuotas, type ModelQuotas } from '../services/api';
import { toast } from 'react-hot-toast';
import { Mic, BookOpen, Clock, BarChart3, ChevronRight, RefreshCw, Cpu } from 'lucide-react';

const CATEGORIZED_TOPICS: Record<string, string[]> = {
  "General Ideas": [
    "Describe an interesting book you have read recently and explain why you liked it.",
    "Talk about a memorable trip you took and what made it special.",
    "Describe a hobby or activity you enjoy doing in your spare time."
  ],
  "Business & Work": [
    "Describe your dream company and explain why you want to work there.",
    "Explain what qualities make a good manager or leader in a workplace.",
    "Talk about the challenges and benefits of remote work in the modern economy."
  ],
  "IELTS Prep": [
    "Explain the impact of social media on communication in modern society.",
    "Should art and music classes be compulsory in primary schools? Why or why not?",
    "Describe a major environmental issue and suggest ways it could be mitigated."
  ]
};

export const Dashboard: React.FC = () => {
  const { user, stats, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>('General Ideas');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState(CATEGORIZED_TOPICS['General Ideas'][0]);
  const [history, setHistory] = useState<any[]>([]);
  const [quotas, setQuotas] = useState<ModelQuotas>(getCachedQuotas());
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await api.get('/history');
      setHistory(response.data.history);
      setQuotas(getCachedQuotas()); // update state quotas
    } catch (err: any) {
      toast.error('Failed to load history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshProfile();
      await fetchHistory();
      toast.success('Stats updated');
    } catch (err) {
      toast.error('Sync failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleStartSpeaking = () => {
    // Navigate to speaking screen, passing the selected topic in location state
    navigate('/speak', { state: { topic: selectedTopic } });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Welcome banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Track your progress and evaluate your English speaking skills.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Sync Data
        </button>
      </div>

      {/* Grid of stats & quotas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Analytics Card */}
        <div className="glass-panel rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
                Performance Overview
              </h2>
              <span className="text-xs bg-indigo-50 text-indigo-600 font-semibold px-2.5 py-1 rounded-full">
                {stats?.totalTests || 0} Sessions
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-indigo-50/50 rounded-2xl p-4 text-center">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Overall Score</p>
                <p className="text-3xl font-black text-indigo-900 mt-1">{stats?.avgOverall || 0}%</p>
              </div>
              <div className="bg-emerald-50/50 rounded-2xl p-4 text-center">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Grammar</p>
                <p className="text-3xl font-black text-emerald-900 mt-1">{stats?.avgGrammar || 0}%</p>
              </div>
              <div className="bg-cyan-50/50 rounded-2xl p-4 text-center">
                <p className="text-xs font-semibold text-cyan-600 uppercase tracking-wider">Vocabulary</p>
                <p className="text-3xl font-black text-cyan-900 mt-1">{stats?.avgVocabulary || 0}%</p>
              </div>
              <div className="bg-amber-50/50 rounded-2xl p-4 text-center">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Fluency</p>
                <p className="text-3xl font-black text-amber-900 mt-1">{stats?.avgFluency || 0}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quota Limits Card */}
        <div className="glass-panel rounded-3xl p-6 shadow-sm col-span-1 lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
            <Cpu className="h-5 w-5 text-cyan-500" />
            Dual-Model Rate Limit Tracker
          </h2>

          <div className="space-y-6">
            {/* Gemini 3.5 Quota */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className="font-bold text-slate-900">Gemini 3.5 (Primary)</span>
                  <span className="text-xs text-slate-500 ml-2">(High Quality Evaluation)</span>
                </div>
                <span className="text-sm font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  {quotas.g35Remaining} / {quotas.g35Limit} remaining
                </span>
              </div>
              <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(quotas.g35Remaining / quotas.g35Limit) * 100}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Resets hourly. Auto-falls back to Gemini 2.5 when exhausted.
              </p>
            </div>

            {/* Gemini 2.5 Quota */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className="font-bold text-slate-900">Gemini 2.5 (Economy)</span>
                  <span className="text-xs text-slate-500 ml-2">(Fast & Short Responses)</span>
                </div>
                <span className="text-sm font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  {quotas.g25Remaining} / {quotas.g25Limit} remaining
                </span>
              </div>
              <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-cyan-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(quotas.g25Remaining / quotas.g25Limit) * 100}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Resets hourly. Used directly for transcripts &lt; 100 words.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Topic Selection & Speaking Challenge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mb-8">
        {/* Speaking Challenge Card */}
        <div className="glass-panel rounded-3xl p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            Choose Speaking Challenge
          </h2>

          {/* Category Selectors */}
          <div className="flex border-b border-slate-100 pb-3 mb-4 gap-2 overflow-x-auto">
            {Object.keys(CATEGORIZED_TOPICS).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setSelectedTopic(CATEGORIZED_TOPICS[cat][0]);
                  setCustomTopic('');
                }}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all flex-shrink-0 ${
                  activeCategory === cat
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Categorized list of topics */}
          <div className="space-y-3 mb-6">
            {CATEGORIZED_TOPICS[activeCategory].map((topic, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedTopic(topic);
                  setCustomTopic('');
                }}
                className={`w-full text-left p-3.5 rounded-2xl border text-sm transition-all cursor-pointer ${
                  selectedTopic === topic && !customTopic
                    ? 'border-indigo-600 bg-indigo-50/40 text-indigo-950 font-medium shadow-sm'
                    : 'border-slate-200 bg-white/50 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>

          {/* Custom Topic Input */}
          <div className="mb-6 border-t border-slate-100 pt-4">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Or write a Custom Topic
            </label>
            <input
              type="text"
              value={customTopic}
              onChange={(e) => {
                setCustomTopic(e.target.value);
                setSelectedTopic(e.target.value || CATEGORIZED_TOPICS[activeCategory][0]);
              }}
              placeholder="e.g. Talk about your favorite movie and why you recommend it."
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-slate-900 shadow-inner"
            />
          </div>

          <div className="bg-indigo-600 rounded-2xl p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md shadow-indigo-100">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Active Challenge Topic</p>
              <p className="text-base font-semibold mt-1">"{selectedTopic}"</p>
            </div>
            <button
              onClick={handleStartSpeaking}
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-600 shadow-md hover:bg-indigo-50 active:scale-95 transition-all cursor-pointer flex-shrink-0"
            >
              <Mic className="h-4 w-4" />
              Start Challenge
            </button>
          </div>
        </div>

        {/* History Column */}
        <div className="glass-panel rounded-3xl p-6 shadow-sm min-h-[400px] flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-indigo-600" />
            Recent Evaluations
          </h2>

          {isLoadingHistory ? (
            <div className="flex flex-1 items-center justify-center">
              <span className="text-sm text-slate-400">Loading history...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center p-6">
              <p className="text-sm font-medium text-slate-600">No evaluations yet</p>
              <p className="text-xs text-slate-400 mt-1">Complete your first challenge to see reports here.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto max-h-[380px] pr-1 space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/report/${item.id}`)}
                  className="p-3.5 rounded-2xl border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/10 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-400">
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm font-bold text-slate-800 truncate mt-0.5">
                      {item.topic}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md uppercase">
                        {item.model_used}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                      {item.overall}
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
