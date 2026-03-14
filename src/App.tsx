/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Target, 
  Smile, 
  Plus, 
  History, 
  TrendingUp, 
  Lightbulb, 
  Trash2,
  Utensils,
  ChevronRight,
  Brain,
  MessageSquare,
  Mic,
  MicOff,
  Volume2,
  Send,
  X,
  Loader2
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useStore, LogEntry } from './store';
import { generateInsight, generateRecommendations, chatWithAssistant, textToSpeech } from './gemini';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Speech Recognition Type
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function App() {
  const { entries, addEntry, removeEntry, clearEntries } = useStore();
  const [meal, setMeal] = useState('');
  const [scores, setScores] = useState({ energy: 7, focus: 7, mood: 7 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setMeal(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    setIsListening(true);
    recognition.start();
  };

  const startChatListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setChatInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    setIsListening(true);
    recognition.start();
  };

  const playVoice = async (text: string) => {
    setIsSpeaking(true);
    const audioUrl = await textToSpeech(text);
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsSpeaking(false);
      audio.play();
    } else {
      setIsSpeaking(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatLoading(true);

    const response = await chatWithAssistant(userMsg, entries);
    setChatMessages(prev => [...prev, { role: 'assistant', content: response || '' }]);
    setIsChatLoading(false);
    
    if (response) {
      playVoice(response);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meal.trim()) return;

    setIsSubmitting(true);
    const insight = await generateInsight(meal, scores, entries);
    
    addEntry({
      meal,
      scores,
      insight,
      tags: meal.toLowerCase().split(' ').filter(word => word.length > 3),
    });

    setMeal('');
    setScores({ energy: 7, focus: 7, mood: 7 });
    setIsSubmitting(false);

    // Refresh recommendations
    const recs = await generateRecommendations(entries);
    setRecommendations(recs);

    if (insight) {
      playVoice(insight);
    }
  };

  const chartData = useMemo(() => {
    return [...entries].reverse().map(e => ({
      time: format(e.timestamp, 'HH:mm'),
      energy: e.scores.energy,
      focus: e.scores.focus,
      mood: e.scores.mood,
      meal: e.meal
    }));
  }, [entries]);

  React.useEffect(() => {
    if (entries.length > 0 && recommendations.length === 0) {
      generateRecommendations(entries).then(setRecommendations);
    }
  }, [entries]);

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-emerald-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <Brain size={24} />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Fuel & Focus</h1>
          </div>
          <div className="flex gap-1 bg-black/5 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                activeTab === 'dashboard' ? "bg-white shadow-sm text-emerald-600" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                activeTab === 'history' ? "bg-white shadow-sm text-emerald-600" : "text-gray-500 hover:text-gray-700"
              )}
            >
              History
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Input & Insights */}
              <div className="lg:col-span-7 space-y-8">
                {/* Entry Form */}
                <section className="bg-white rounded-3xl p-8 shadow-sm border border-black/5">
                  <header className="mb-6">
                    <h2 className="text-2xl font-semibold mb-1">Impact Log</h2>
                    <p className="text-gray-500">Connect your intake to your output.</p>
                  </header>

                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Utensils size={16} className="text-emerald-500" />
                          What did you consume?
                        </div>
                        <button 
                          type="button"
                          onClick={startListening}
                          className={cn(
                            "p-2 rounded-full transition-all",
                            isListening ? "bg-rose-100 text-rose-600 animate-pulse" : "bg-gray-100 text-gray-500 hover:bg-emerald-100 hover:text-emerald-600"
                          )}
                        >
                          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>
                      </label>
                      <input 
                        type="text"
                        value={meal}
                        onChange={(e) => setMeal(e.target.value)}
                        placeholder="e.g., Avocado toast with two poached eggs"
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-lg"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { key: 'energy', label: 'Energy', icon: Zap, color: 'text-amber-500' },
                        { key: 'focus', label: 'Focus', icon: Target, color: 'text-blue-500' },
                        { key: 'mood', label: 'Mood', icon: Smile, color: 'text-rose-500' },
                      ].map(({ key, label, icon: Icon, color }) => (
                        <div key={key} className="space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                              <Icon size={14} className={color} />
                              {label}
                            </label>
                            <span className="text-sm font-bold text-gray-900">{scores[key as keyof typeof scores]}</span>
                          </div>
                          <input 
                            type="range"
                            min="1"
                            max="10"
                            value={scores[key as keyof typeof scores]}
                            onChange={(e) => setScores(s => ({ ...s, [key]: parseInt(e.target.value) }))}
                            className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                          />
                        </div>
                      ))}
                    </div>

                    <button 
                      type="submit"
                      disabled={isSubmitting || !meal.trim()}
                      className="w-full py-4 bg-[#1A1A1A] text-white rounded-2xl font-semibold text-lg shadow-xl shadow-black/10 hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Plus size={20} />
                          Log Impact
                        </>
                      )}
                    </button>
                  </form>
                </section>

                {/* Latest Insight */}
                {entries.length > 0 && entries[0].insight && (
                  <motion.section 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-50 rounded-3xl p-8 border border-emerald-100 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Lightbulb size={120} className="text-emerald-900" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-3">
                        <Lightbulb size={20} />
                        AI Insight
                      </div>
                      <p className="text-xl text-emerald-900 leading-relaxed font-medium">
                        "{entries[0].insight}"
                      </p>
                    </div>
                  </motion.section>
                )}

                {/* Correlation Chart */}
                <section className="bg-white rounded-3xl p-8 shadow-sm border border-black/5">
                  <header className="mb-6 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold">Performance Correlation</h2>
                      <p className="text-sm text-gray-500">Visualizing your biological response.</p>
                    </div>
                    <TrendingUp size={20} className="text-gray-400" />
                  </header>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                        <YAxis hide domain={[0, 10]} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ fontWeight: 600 }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="energy" 
                          stroke="#10b981" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorEnergy)" 
                          name="Energy"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="focus" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          fillOpacity={0} 
                          name="Focus"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </div>

              {/* Right Column: Recommendations & Stats */}
              <div className="lg:col-span-5 space-y-8">
                {/* Recommendations */}
                <section className="bg-[#1A1A1A] text-white rounded-3xl p-8 shadow-2xl">
                  <header className="mb-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Brain size={20} className="text-emerald-400" />
                      Optimization Plan
                    </h2>
                  </header>
                  <div className="space-y-4">
                    {recommendations.length > 0 ? (
                      recommendations.map((rec, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex gap-4 group cursor-default"
                        >
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold border border-emerald-500/30">
                            {i + 1}
                          </div>
                          <p className="text-gray-300 text-sm leading-relaxed group-hover:text-white transition-colors">
                            {rec}
                          </p>
                        </motion.div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm italic">Log more data to unlock personalized cognitive advice.</p>
                    )}
                  </div>
                </section>

                {/* Stats Summary */}
                <section className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Avg Focus</p>
                    <p className="text-3xl font-bold">
                      {entries.length > 0 
                        ? (entries.reduce((acc, e) => acc + e.scores.focus, 0) / entries.length).toFixed(1)
                        : '--'}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Logs Today</p>
                    <p className="text-3xl font-bold">{entries.length}</p>
                  </div>
                </section>

                {/* Quick Tips */}
                <section className="bg-emerald-500 rounded-3xl p-8 text-white">
                  <h3 className="font-bold mb-2">Did you know?</h3>
                  <p className="text-emerald-50 text-sm leading-relaxed">
                    Refined sugars cause a rapid insulin spike, often leading to a "cognitive crash" 90 minutes later. Pairing carbs with healthy fats slows absorption.
                  </p>
                </section>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <header className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-bold">Impact History</h2>
                  <p className="text-gray-500">Your biological timeline.</p>
                </div>
                <button 
                  onClick={clearEntries}
                  className="flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-sm font-medium"
                >
                  <Trash2 size={18} />
                  Clear All
                </button>
              </header>

              <div className="space-y-4">
                {entries.map((entry) => (
                  <motion.div 
                    layout
                    key={entry.id}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-black/5 hover:border-emerald-200 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                          <Utensils size={24} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{entry.meal}</h3>
                          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                            {format(entry.timestamp, 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeEntry(entry.id)}
                        className="p-2 text-gray-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {[
                        { label: 'Energy', value: entry.scores.energy, color: 'bg-amber-500' },
                        { label: 'Focus', value: entry.scores.focus, color: 'bg-blue-500' },
                        { label: 'Mood', value: entry.scores.mood, color: 'bg-rose-500' },
                      ].map(stat => (
                        <div key={stat.label} className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{stat.label}</p>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">{stat.value}</span>
                            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full", stat.color)} style={{ width: `${stat.value * 10}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {entry.insight && (
                      <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100/50">
                        <p className="text-sm text-emerald-800 italic">"{entry.insight}"</p>
                      </div>
                    )}
                  </motion.div>
                ))}

                {entries.length === 0 && (
                  <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                    <History size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">No logs found yet. Start your journey on the dashboard.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Chatbot Floating Button */}
      <button 
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-[#1A1A1A] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[60]"
      >
        <MessageSquare size={28} />
      </button>

      {/* Chatbot Modal */}
      <AnimatePresence>
        {isChatOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[70]"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              className="fixed bottom-8 right-8 w-[400px] h-[600px] bg-white rounded-3xl shadow-2xl z-[80] flex flex-col overflow-hidden border border-black/5"
            >
              <header className="p-6 bg-[#1A1A1A] text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                    <Brain size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold">Focus Assistant</h3>
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Online</p>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
                {chatMessages.length === 0 && (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare size={32} />
                    </div>
                    <p className="text-gray-500 text-sm font-medium">Ask me anything about your diet and focus levels.</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}>
                    <div className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-emerald-600 text-white rounded-tr-none" 
                        : "bg-white text-gray-800 shadow-sm border border-black/5 rounded-tl-none"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex items-center gap-2 text-gray-400 text-sm italic">
                    <Loader2 size={16} className="animate-spin" />
                    Assistant is thinking...
                  </div>
                )}
              </div>

              <form onSubmit={handleChatSubmit} className="p-4 bg-white border-t border-black/5 flex gap-2 items-center">
                <button 
                  type="button"
                  onClick={startChatListening}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                    isListening ? "bg-rose-100 text-rose-600 animate-pulse" : "bg-gray-100 text-gray-500 hover:bg-emerald-100 hover:text-emerald-600"
                  )}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <input 
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1 px-4 py-2 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                />
                <button 
                  type="submit"
                  disabled={!chatInput.trim() || isChatLoading}
                  className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 disabled:opacity-50 transition-all"
                >
                  <Send size={18} />
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-black/5 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <Brain size={20} />
            <span className="text-sm font-semibold">Fuel & Focus</span>
          </div>
          <p className="text-sm text-gray-400">
            Nutritional Intelligence for Cognitive Optimization.
          </p>
          <div className="flex gap-6 text-sm font-medium text-gray-400">
            <a href="#" className="hover:text-emerald-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-emerald-600 transition-colors">Methodology</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
