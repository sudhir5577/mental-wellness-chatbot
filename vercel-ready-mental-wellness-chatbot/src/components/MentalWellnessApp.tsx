import React, { useState, useRef, useEffect } from 'react';
import { Send, Heart, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MentalWellnessApp = () => {
  const [currentView, setCurrentView] = useState('disclaimer');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [moodEntries, setMoodEntries] = useState([]);
  const [showCrisisAlert, setShowCrisisAlert] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Crisis keywords detection
  const crisisKeywords = ['suicide', 'kill myself', 'self harm', 'end it all', 'want to die', 'no reason to live'];
  
  const detectCrisis = (text) => {
    const lowerText = text.toLowerCase();
    return crisisKeywords.some(keyword => lowerText.includes(keyword));
  };

  // Mood tracking
  const moodEmojis = [
    { emoji: '😢', label: 'Very Sad', value: 1 },
    { emoji: '😔', label: 'Sad', value: 2 },
    { emoji: '😐', label: 'Neutral', value: 3 },
    { emoji: '🙂', label: 'Good', value: 4 },
    { emoji: '😊', label: 'Great', value: 5 }
  ];

  const logMood = (moodValue) => {
    const newEntry = {
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      mood: moodValue,
      timestamp: Date.now()
    };
    const updated = [...moodEntries, newEntry];
    setMoodEntries(updated);
    
    setMessages(prev => [...prev, {
      type: 'system',
      content: `Mood logged: ${moodEmojis[moodValue - 1].label}. Keep tracking to see your patterns!`
    }]);
  };

  // AI Chat function
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    
    if (detectCrisis(userMessage)) {
      setShowCrisisAlert(true);
    }

    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'YOUR_API_KEY_HERE',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: userMessage }],
          system: `You are a compassionate mental wellness companion named "Wellness AI". Your role is to:

- Provide emotional support through active listening and validation
- Suggest evidence-based coping strategies (deep breathing, journaling, exercise, mindfulness)
- Encourage healthy habits and self-care
- Be warm, empathetic, and non-judgmental

CRITICAL RULES:
- NEVER diagnose mental health conditions or physical illnesses
- NEVER prescribe medications or treatments
- NEVER claim to replace professional mental health care
- ALWAYS encourage users to seek professional help for serious concerns
- If user mentions self-harm, suicide, or crisis, immediately acknowledge their pain and strongly encourage them to contact crisis resources

Remember: You're a supportive companion, not a therapist. Keep responses concise (2-4 sentences) and caring.`
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      
      if (data.content && data.content[0] && data.content[0].text) {
        setMessages(prev => [...prev, { type: 'ai', content: data.content[0].text }]);
      } else {
        throw new Error('Invalid response');
      }
    } catch (error) {
      console.error('AI Error:', error);
      
      const fallbackResponses = {
        'anxious|worried|stress|nervous': "I hear that you're feeling anxious. Try the 4-7-8 breathing technique: breathe in for 4 counts, hold for 7, exhale for 8. This activates your body's relaxation response. Would you like to talk about what's causing the stress?",
        'sad|depressed|down|low|unhappy': "I'm sorry you're feeling this way. Your feelings are valid. Sometimes it helps to write down what you're feeling or talk to someone you trust. Have you considered speaking with a counselor or therapist? They can provide professional support.",
        'angry|mad|frustrated|irritated': "It sounds like you're dealing with some frustration. It's okay to feel angry. Try taking a few deep breaths or going for a short walk. What's making you feel this way?",
        'tired|exhausted|fatigue|sleepy': "Fatigue can really affect our mood. Are you getting enough sleep? Aim for 7-9 hours, keep a consistent schedule, and avoid screens before bed. If tiredness persists, consider talking to a doctor.",
        'happy|good|great|wonderful|excited': "That's wonderful to hear! It's important to celebrate the good moments. What's making you feel good today?",
        'lonely|alone|isolated': "Feeling lonely is difficult. Remember that reaching out is a sign of strength. Consider connecting with a friend, family member, or joining a support group. You don't have to go through this alone.",
        'default': "Thank you for sharing that with me. I'm here to listen and support you. Remember, if you're dealing with serious mental health concerns, please reach out to a professional counselor or therapist. How else can I help you today?"
      };

      let response = fallbackResponses.default;
      for (const [keywords, reply] of Object.entries(fallbackResponses)) {
        if (keywords !== 'default' && new RegExp(keywords, 'i').test(userMessage)) {
          response = reply;
          break;
        }
      }

      setMessages(prev => [...prev, { 
        type: 'ai', 
        content: response + "\n\n*(Note: Using offline mode. To enable AI responses, add your Claude API key on line 75)*"
      }]);
    }

    setLoading(false);
  };

  const generateInsights = () => {
    if (moodEntries.length < 3) {
      return "Log at least 3 mood entries to see personalized insights!";
    }

    const avgMood = moodEntries.reduce((sum, entry) => sum + entry.mood, 0) / moodEntries.length;
    const recentMoods = moodEntries.slice(-5);
    const trend = recentMoods[recentMoods.length - 1].mood - recentMoods[0].mood;

    let insight = "";
    if (avgMood >= 4) {
      insight = "🌟 You've been feeling mostly positive lately! Keep up the good work with your self-care routines.";
    } else if (avgMood >= 3) {
      insight = "You've had some ups and downs. Remember to practice self-compassion and reach out for support when needed.";
    } else {
      insight = "It looks like you've been struggling. Please consider talking to a mental health professional who can provide personalized support.";
    }

    if (trend > 0) {
      insight += " Your mood has been improving recently - that's great progress!";
    } else if (trend < 0) {
      insight += " Your mood has dipped recently. What self-care activities have helped you before?";
    }

    return insight;
  };

  if (currentView === 'disclaimer') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
          <div className="text-center mb-6">
            <Heart className="w-16 h-16 text-purple-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Mental Wellness Companion</h1>
            <p className="text-gray-600">AI-Powered Emotional Support & Mood Tracking</p>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <AlertCircle className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-yellow-800 mb-2">Important Disclaimer</h3>
                <p className="text-sm text-yellow-700 mb-2">
                  This application provides <strong>emotional support and wellness tools only</strong>. It does NOT:
                </p>
                <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                  <li>Diagnose mental health conditions</li>
                  <li>Provide medical treatment or therapy</li>
                  <li>Replace professional mental healthcare</li>
                  <li>Offer emergency crisis intervention</li>
                </ul>
                <p className="text-sm text-yellow-700 mt-3 font-semibold">
                  Always consult licensed mental health professionals for diagnosis and treatment.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-red-800 mb-2">🆘 Crisis Resources</h3>
            <div className="text-sm text-red-700 space-y-1">
              <p><strong>National Suicide Prevention Lifeline:</strong> 988</p>
              <p><strong>Crisis Text Line:</strong> Text HOME to 741741</p>
              <p><strong>Emergency:</strong> 911</p>
            </div>
          </div>

          <button
            onClick={() => setCurrentView('main')}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
          >
            I Understand - Continue to App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {showCrisisAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold text-red-600 mb-4">🆘 Immediate Help Available</h3>
            <p className="text-gray-700 mb-4">
              I'm concerned about what you've shared. Please know that help is available right now:
            </p>
            <div className="bg-red-50 rounded-lg p-4 mb-4 space-y-2">
              <p className="font-bold text-red-800">📞 National Suicide Prevention Lifeline</p>
              <p className="text-2xl font-bold text-red-600">988</p>
              <p className="text-sm text-gray-600">Available 24/7 - Confidential Support</p>
              
              <p className="font-bold text-red-800 mt-3">💬 Crisis Text Line</p>
              <p className="text-lg font-bold text-red-600">Text HOME to 741741</p>
              
              <p className="font-bold text-red-800 mt-3">🚨 Emergency</p>
              <p className="text-2xl font-bold text-red-600">911</p>
            </div>
            <button
              onClick={() => setShowCrisisAlert(false)}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700"
            >
              I'll Reach Out for Help
            </button>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-8 h-8 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-800">Wellness Companion</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentView('chat')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                currentView === 'chat' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setCurrentView('mood')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                currentView === 'mood' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              📊 Mood
            </button>
            <button
              onClick={() => setCurrentView('resources')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                currentView === 'resources' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🆘 Resources
            </button>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border-b border-yellow-200">
        <div className="max-w-6xl mx-auto px-4 py-2 text-center text-sm text-yellow-800">
          ⚠️ This is not medical advice. Always consult healthcare professionals for diagnosis and treatment.
        </div>
      </div>

      {currentView === 'chat' && (
        <div className="max-w-4xl mx-auto p-4">
          <div className="bg-white rounded-2xl shadow-xl h-[600px] flex flex-col">
            <div className="p-4 border-b bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-t-2xl">
              <h2 className="text-xl font-bold">Supportive Chat</h2>
              <p className="text-sm opacity-90">I'm here to listen and support you</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 mt-12">
                  <Heart className="w-16 h-16 mx-auto mb-4 text-purple-300" />
                  <p className="text-lg font-medium">How are you feeling today?</p>
                  <p className="text-sm mt-2">Share what's on your mind. I'm here to listen.</p>
                </div>
              )}
              
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.type === 'user'
                        ? 'bg-purple-600 text-white'
                        : msg.type === 'system'
                        ? 'bg-green-100 text-green-800 text-sm'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView === 'mood' && (
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">How are you feeling?</h2>
            <div className="grid grid-cols-5 gap-4 mb-6">
              {moodEmojis.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => logMood(mood.value)}
                  className="flex flex-col items-center p-4 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition"
                >
                  <span className="text-4xl mb-2">{mood.emoji}</span>
                  <span className="text-sm font-medium text-gray-700">{mood.label}</span>
                </button>
              ))}
            </div>

            {moodEntries.length > 0 && (
              <>
                <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl p-4 mb-6">
                  <h3 className="font-bold text-gray-800 mb-2">💡 AI Insights</h3>
                  <p className="text-gray-700">{generateInsights()}</p>
                </div>

                <h3 className="text-xl font-bold text-gray-800 mb-4">Your Mood Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={moodEntries.slice(-10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{fontSize: 12}} />
                    <YAxis domain={[0, 6]} ticks={[1, 2, 3, 4, 5]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="mood" stroke="#9333ea" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>

                <div className="mt-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Recent Entries</h3>
                  <div className="space-y-2">
                    {moodEntries.slice(-5).reverse().map((entry, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{moodEmojis[entry.mood - 1].emoji}</span>
                          <div>
                            <p className="font-medium text-gray-800">{moodEmojis[entry.mood - 1].label}</p>
                            <p className="text-sm text-gray-500">{entry.date} at {entry.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {currentView === 'resources' && (
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Mental Health Resources</h2>

            <div className="space-y-4">
              <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                <h3 className="text-lg font-bold text-red-800 mb-3">🆘 Crisis Support (24/7)</h3>
                <div className="space-y-3">
                  <div>
                    <p className="font-bold text-red-900">National Suicide Prevention Lifeline</p>
                    <p className="text-2xl font-bold text-red-600">988</p>
                    <p className="text-sm text-gray-600">Free, confidential support 24/7</p>
                  </div>
                  <div>
                    <p className="font-bold text-red-900">Crisis Text Line</p>
                    <p className="text-lg font-bold text-red-600">Text HOME to 741741</p>
                    <p className="text-sm text-gray-600">Text-based crisis support</p>
                  </div>
                  <div>
                    <p className="font-bold text-red-900">Emergency Services</p>
                    <p className="text-2xl font-bold text-red-600">911</p>
                    <p className="text-sm text-gray-600">For immediate life-threatening emergencies</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                <h3 className="text-lg font-bold text-blue-800 mb-3">💙 Mental Health Support</h3>
                <div className="space-y-2 text-gray-700">
                  <p><strong>SAMHSA Helpline:</strong> 1-800-662-4357 (Treatment referral)</p>
                  <p><strong>NAMI Helpline:</strong> 1-800-950-6264 (Mental health information)</p>
                  <p><strong>Veterans Crisis Line:</strong> 988 then press 1</p>
                  <p><strong>Trevor Project (LGBTQ Youth):</strong> 1-866-488-7386</p>
                </div>
              </div>

              <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
                <h3 className="text-lg font-bold text-green-800 mb-3">🌱 Self-Care Tips</h3>
                <ul className="space-y-2 text-gray-700 list-disc list-inside">
                  <li>Practice deep breathing: 4-7-8 technique (breathe in 4, hold 7, out 8)</li>
                  <li>Get 7-9 hours of sleep per night</li>
                  <li>Exercise for 30 minutes daily (even a walk helps!)</li>
                  <li>Stay connected with friends and family</li>
                  <li>Limit social media and news consumption</li>
                  <li>Practice gratitude journaling</li>
                  <li>Seek professional therapy - it's a sign of strength!</li>
                </ul>
              </div>

              <div className="bg-purple-50 border-l-4 border-purple-500 rounded-lg p-4">
                <h3 className="text-lg font-bold text-purple-800 mb-3">🔍 Find Professional Help</h3>
                <div className="space-y-2 text-gray-700">
                  <p><strong>Psychology Today:</strong> Find therapists in your area</p>
                  <p><strong>BetterHelp/Talkspace:</strong> Online therapy platforms</p>
                  <p><strong>Open Path Collective:</strong> Affordable therapy ($30-$80/session)</p>
                  <p><strong>Your Insurance Provider:</strong> Check coverage for mental health services</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
        <p>Made with 💜 for Mental Health Awareness | Not a substitute for professional care</p>
        <p className="mt-1">If you're in crisis, please call 988 or contact emergency services</p>
      </div>
    </div>
  );
};

export default MentalWellnessApp;