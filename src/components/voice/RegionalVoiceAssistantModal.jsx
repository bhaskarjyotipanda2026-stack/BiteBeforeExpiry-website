import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Volume2, Globe, Send, Sparkles, X, 
  CheckCircle, AlertTriangle, ShieldCheck, ArrowRight
} from 'lucide-react';
import { 
  SUPPORTED_LANGUAGES, 
  processRegionalAssistantQuery 
} from '../../services/regionalVoiceService';
import { dbService } from '../../services/dbService';

export function RegionalVoiceAssistantModal({ isOpen, onClose }) {
  const [selectedLang, setSelectedLang] = useState('en');
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    async function fetchInventory() {
      const items = await dbService.getHouseholdInventory('usr_demo_primary_001');
      setInventory(items || []);
    }
    if (isOpen) {
      fetchInventory();
      // Add welcome greeting
      if (messages.length === 0) {
        setMessages([
          {
            sender: 'assistant',
            text: 'Hello! I am your BiteBeforeExpiry regional voice assistant. Ask me about your food expiry, USE FIRST items, or safety recalls in English, Hindi, Odia, or Bengali.',
            lang: 'en'
          }
        ]);
      }
    }
  }, [isOpen]);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = SUPPORTED_LANGUAGES[selectedLang]?.speechCode || 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleSendQuery(transcript);
      };
      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [selectedLang]);

  const toggleListen = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please type your query in the text box below.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.lang = SUPPORTED_LANGUAGES[selectedLang]?.speechCode || 'en-US';
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Failed to start recognition:', err);
      }
    }
  };

  const speakText = (text, langCode = 'en') => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const speechCode = SUPPORTED_LANGUAGES[langCode]?.speechCode || 'en-US';
    utterance.lang = speechCode;
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleSendQuery = (textToSend = null) => {
    const text = textToSend || inputText;
    if (!text || !text.trim()) return;

    const userMessage = { sender: 'user', text, lang: selectedLang };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Process query strictly on active user's inventory
    const result = processRegionalAssistantQuery({
      queryText: text,
      userInventory: inventory,
      language: selectedLang
    });

    const assistantMessage = {
      sender: 'assistant',
      text: result.responseText,
      speechText: result.speechText,
      highlights: result.highlights,
      lang: selectedLang
    };

    setMessages(prev => [...prev, assistantMessage]);
    speakText(result.speechText || result.responseText, selectedLang);
  };

  if (!isOpen) return null;

  const samplePrompts = [
    { text: 'What is expiring soon?', lang: 'en', label: '🇬🇧 Expiring Soon' },
    { text: 'Which products should I use first?', lang: 'en', label: '🇬🇧 Use First' },
    { text: 'Mere ghar mein kya expire hone wala hai?', lang: 'hi', label: '🇮🇳 घर में क्या एक्सपायर होगा?' },
    { text: 'Pehle kya use karein?', lang: 'hi', label: '🇮🇳 पहले क्या उपयोग करें?' },
    { text: 'ମୋର କେଉଁ ଖାଦ୍ୟ ଶୀଘ୍ର ସମାପ୍ତ ହେବ?', lang: 'or', label: '🇮🇳 କେଉଁ ଖାଦ୍ୟ ସମାପ୍ତ ହେବ?' },
    { text: 'আমার কোন খাবারটি দ্রুত শেষ হবে?', lang: 'bn', label: '🇮🇳 কোন খাবার দ্রুত শেষ হবে?' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Regional Language & Voice Assistant
              </h3>
              <p className="text-[11px] text-slate-500">
                Speaks English, हिन्दी, ଓଡ଼ିଆ, and বাংলা using your verified inventory data
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Language Selector */}
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="py-1 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              {Object.values(SUPPORTED_LANGUAGES).map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                if (window.speechSynthesis) window.speechSynthesis.cancel();
                onClose();
              }}
              className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat History Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-3.5 rounded-2xl ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <p className="leading-relaxed">{msg.text}</p>

                {msg.sender === 'assistant' && (
                  <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                    <button
                      onClick={() => speakText(msg.speechText || msg.text, msg.lang)}
                      className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center space-x-1"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>{isSpeaking ? 'Speaking...' : 'Play Audio Voice'}</span>
                    </button>
                    <span className="text-[10px] text-slate-400">Verified User Data</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Clickable Quick Prompts */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Suggested Regional Questions:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedLang(p.lang);
                  handleSendQuery(p.text);
                }}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-2">
          <button
            onClick={toggleListen}
            className={`p-3 rounded-2xl transition-all shadow-md shrink-0 ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            title={isListening ? 'Stop listening' : 'Start voice recognition'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            placeholder={
              selectedLang === 'hi' 
                ? 'अपना सवाल बोलें या टाइप करें...' 
                : selectedLang === 'or'
                ? 'ଆପଣଙ୍କ ପ୍ରଶ୍ନ କୁହନ୍ତୁ କିମ୍ବା ଟାଇପ୍ କରନ୍ତୁ...'
                : selectedLang === 'bn'
                ? 'আপনার প্রশ্ন বলুন বা টাইপ করুন...'
                : 'Ask a question or type your prompt...'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendQuery();
            }}
            className="flex-1 px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-emerald-500"
          />

          <button
            onClick={() => handleSendQuery()}
            disabled={!inputText.trim()}
            className="p-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 disabled:opacity-40 transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
