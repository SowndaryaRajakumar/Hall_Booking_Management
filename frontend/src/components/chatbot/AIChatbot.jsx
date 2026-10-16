import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare,
  X,
  Minus,
  Send,
  Bot,
  User,
  Sparkles,
  Trash2,
  HelpCircle,
  RefreshCw,
} from "lucide-react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const AIChatbot = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const role = typeof window !== "undefined" ? localStorage.getItem("role") || "staff" : "staff";
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {};
  const userName = user.name || (role === "admin" ? "Admin" : "Faculty Member");

  const [messages, setMessages] = useState(() => [
    {
      id: "welcome-1",
      sender: "bot",
      text:
        role === "admin"
          ? `Hello ${userName}! 👋 I am your NEC Venue Admin Assistant. How can I help you manage bookings, venues, or reports today?`
          : `Hello ${userName}! 👋 Welcome to NEC Venue Portal. Ask me anything about venue availability, booking rules, or your request status.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  // Suggested quick questions based on user role
  const facultyQuickQuestions = [
    t("chatbot.quickQuestions.howToBook"),
    t("chatbot.quickQuestions.checkAvailability"),
    t("chatbot.quickQuestions.viewBookings"),
    t("chatbot.quickQuestions.cancelBooking"),
    t("chatbot.quickQuestions.pendingStatus"),
    t("chatbot.quickQuestions.availableVenues"),
    t("chatbot.quickQuestions.myPendingCount"),
  ];

  const adminQuickQuestions = [
    t("chatbot.quickQuestions.adminApprove"),
    t("chatbot.quickQuestions.adminPendingCount"),
    t("chatbot.quickQuestions.adminManageVenues"),
    t("chatbot.quickQuestions.pendingStatus"),
    t("chatbot.quickQuestions.availableVenues"),
  ];

  const quickQuestions = role === "admin" ? adminQuickQuestions : facultyQuickQuestions;

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputMessage;
    if (!text || !text.trim() || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE_URL}/chatbot/message`,
        {
          message: text.trim(),
          language: i18n.language || "en",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const botReplyText =
        res.data?.response || res.data?.reply || "I received your message.";
      const navPath = res.data?.navPath || null;
      const recommendedVenues = res.data?.recommendedVenues || null;
      const bookingIntent = res.data?.bookingIntent || null;

      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: botReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        navPath,
        recommendedVenues,
        bookingIntent,
      };

      setMessages((prev) => [...prev, botMsg]);

      // If user requested to open profile or navigate directly, trigger navigation
      const lowerText = text.toLowerCase();
      if (
        navPath &&
        (lowerText.includes("open") ||
          lowerText.includes("go to") ||
          lowerText.includes("po") ||
          lowerText.includes("khol") ||
          lowerText.includes("திற"))
      ) {
        setTimeout(() => {
          navigate(navPath);
        }, 1200);
      }
    } catch (err) {
      console.error("Chatbot API error:", err);
      const errorMsg = {
        id: `bot-err-${Date.now()}`,
        sender: "bot",
        text: "Sorry, I am having trouble connecting right now. Please check your network or try again later.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "welcome-reset",
        sender: "bot",
        text: "Conversation cleared. How else can I assist you?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <>
      {/* Floating Widget Button (Bottom-Right) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="chatbot-launcher fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-gradient-to-r from-blue-700 to-blue-900 text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-2xl hover:shadow-blue-500/25 hover:scale-105 transition-all duration-300 group cursor-pointer border border-blue-600/30"
          aria-label="Open AI Chatbot"
        >
          <div className="relative">
            <Bot size={22} className="group-hover:rotate-12 transition-transform duration-300" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <span className="font-semibold text-sm hidden sm:inline tracking-wide max-w-[160px] truncate">
            {t("chatbot.title")}
          </span>
        </button>
      )}

      {/* Floating Chat Panel */}
      {isOpen && (
        <div
          className={`fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] sm:w-[380px] md:w-[410px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden transition-all duration-300 ${
            isMinimized ? "h-16" : "h-[540px] max-h-[calc(100vh-3rem)]"
          }`}
        >
          {/* Panel Header */}
          <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white px-4 py-3.5 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/15">
                <Sparkles size={18} className="text-amber-300 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  {t("chatbot.title")}
                  <span className="text-[10px] bg-blue-500/40 text-blue-100 font-semibold px-2 py-0.5 rounded-full border border-blue-400/30">
                    AI
                  </span>
                </h3>
                <p className="text-[11px] text-blue-200/90 font-medium">
                  {t("chatbot.subtitle")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-blue-200">
              <button
                type="button"
                onClick={handleClearChat}
                className="p-1.5 hover:bg-white/15 rounded-lg transition text-blue-200 hover:text-white"
                title={t("chatbot.clearChat")}
              >
                <Trash2 size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized((prev) => !prev)}
                className="p-1.5 hover:bg-white/15 rounded-lg transition text-blue-200 hover:text-white"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                <Minus size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/15 rounded-lg transition text-blue-200 hover:text-white"
                title={t("common.close")}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Panel Body (Visible when not minimized) */}
          {!isMinimized && (
            <>
              {/* Message Transcript */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${
                      msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs shrink-0 shadow-sm ${
                        msg.sender === "user"
                          ? "bg-blue-700 text-white"
                          : "bg-indigo-100 text-indigo-700 border border-indigo-200"
                      }`}
                    >
                      {msg.sender === "user" ? <User size={14} /> : <Bot size={14} />}
                    </div>

                    <div
                      className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        msg.sender === "user"
                          ? "bg-blue-700 text-white rounded-tr-none font-medium"
                          : msg.isError
                          ? "bg-red-50 text-red-700 border border-red-200 rounded-tl-none"
                          : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-none whitespace-pre-line"
                      }`}
                    >
                      {msg.text}
                      {msg.recommendedVenues && msg.recommendedVenues.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-200/80 space-y-2">
                          <p className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                            <Sparkles size={12} className="text-amber-500" />
                            <span>{t("chatbot.availableRecommendations", "Available Venues:")}</span>
                          </p>
                          <div className="space-y-2">
                            {msg.recommendedVenues.map((venue) => (
                              <div
                                key={venue.hallId}
                                className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex flex-col gap-1 text-slate-800"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-blue-950">{venue.hallName}</span>
                                  <span className="text-[9px] px-1.5 py-0.5 bg-blue-200/70 text-blue-900 rounded font-semibold">
                                    {venue.venueType}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-600">
                                  <span>Capacity: {venue.capacity}</span>
                                  {venue.location && <span>• {venue.location}</span>}
                                </div>
                                {venue.facilities && venue.facilities.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {venue.facilities.slice(0, 3).map((f, fIdx) => (
                                      <span
                                        key={fIdx}
                                        className="text-[9px] bg-white border border-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full"
                                      >
                                        {f}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const bookRoute = role === "admin" ? "/admin/book-venue" : "/faculty/book-venue";
                                    navigate(bookRoute, {
                                      state: {
                                        prefillVenueId: venue.hallId,
                                        prefillDate: msg.bookingIntent?.date,
                                        prefillPeriod: msg.bookingIntent?.periods?.[0],
                                      },
                                    });
                                    setIsOpen(false);
                                  }}
                                  className="mt-1 w-full py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-sm transition text-center flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <span>Book {venue.hallName}</span>
                                  <Sparkles size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {msg.navPath && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-start">
                          <button
                            type="button"
                            onClick={() => navigate(msg.navPath)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
                          >
                            👉 {t("nav.profile")}
                          </button>
                        </div>
                      )}
                      <span
                        className={`block text-[9px] mt-1 text-right font-light ${
                          msg.sender === "user" ? "text-blue-200" : "text-slate-400"
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-2 text-slate-500 text-xs py-2 px-1 animate-pulse">
                    <Bot size={14} className="text-blue-700 animate-spin" />
                    <span>{t("chatbot.thinking")}</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Questions Pills */}
              <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                <HelpCircle size={14} className="text-slate-400 shrink-0 ml-1" />
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(q)}
                    className="whitespace-nowrap px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-full border border-slate-200/80 transition-all shrink-0 cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={t("chatbot.placeholder")}
                  className="flex-1 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-800 placeholder-slate-400 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition"
                  disabled={loading}
                />

                <button
                  type="submit"
                  disabled={!inputMessage.trim() || loading}
                  className="p-2.5 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white rounded-xl shadow-md transition-all duration-200 cursor-pointer disabled:cursor-not-allowed shrink-0"
                  title={t("chatbot.send")}
                >
                  {loading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default AIChatbot;
