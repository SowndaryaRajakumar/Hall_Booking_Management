import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import VoiceConfirmationModal from "./VoiceConfirmationModal";

const VoiceNavControl = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [pendingAction, setPendingAction] = useState(null);

  const recognitionRef = useRef(null);

  const userRole = typeof window !== "undefined" ? localStorage.getItem("role") || "staff" : "staff";
  const userEmail = typeof window !== "undefined" ? localStorage.getItem("email") || "" : "";

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      // Set language based on active i18n
      const currentLang = i18n.language || "en";
      if (currentLang.startsWith("ta")) {
        recognition.lang = "ta-IN";
      } else if (currentLang.startsWith("hi")) {
        recognition.lang = "hi-IN";
      } else {
        recognition.lang = "en-IN";
      }

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript("");
      };

      recognition.onresult = (event) => {
        const spokenText = event.results[0][0].transcript;
        setTranscript(spokenText);
        handleVoiceCommand(spokenText);
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error !== "no-speech" && event.error !== "aborted") {
          toast.error(t("voice.commandNotRecognized", { command: "Speech error" }));
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [i18n.language]);

  const toggleListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.info(t("voice.notSupported"));
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        // Update language right before starting
        const currentLang = i18n.language || "en";
        if (currentLang.startsWith("ta")) {
          recognitionRef.current.lang = "ta-IN";
        } else if (currentLang.startsWith("hi")) {
          recognitionRef.current.lang = "hi-IN";
        } else {
          recognitionRef.current.lang = "en-IN";
        }
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start voice recognition:", err);
      }
    }
  };

  const handleVoiceCommand = (text) => {
    setIsProcessing(true);
    const cmd = text.toLowerCase().trim();

    toast.info(`🎤 Spoken: "${text}"`, { autoClose: 3000 });

    // Check for destructive cancellation command e.g. "cancel booking 43" or "cancel my booking"
    if (cmd.includes("cancel booking") || cmd.includes(" cancel ") || cmd.includes("ரத்து") || cmd.includes("रद्द")) {
      const match = cmd.match(/\d+/);
      const bookingId = match ? match[0] : "";
      
      setPendingAction({
        type: "CANCEL_BOOKING",
        bookingId: bookingId,
        text: text,
      });
      setIsProcessing(false);
      return;
    }

    // Command mapping dictionary
    // Admin routes vs Faculty routes
    const routesMap = [
      // Dashboard
      {
        keys: ["dashboard", "home", "முகப்பு", "டாஷ்போர்டு", "डैशबोर्ड", "होम"],
        adminRoute: "/admin/dashboard",
        facultyRoute: "/faculty/dashboard",
        name: "Dashboard",
      },
      // Book Venue
      {
        keys: ["book venue", "book a venue", "book hall", "reserve hall", "find available venues", "available venues", "அரங்கம் முன்பதிவு", "முன்பதிவு", "வேனியூ முன்பதிவு", "वेन्यू बुक", "हॉल बुक"],
        adminRoute: "/admin/book-venue",
        facultyRoute: "/faculty/book-venue",
        name: "Book Venue",
      },
      // My Bookings / Bookings
      {
        keys: ["my bookings", "open my bookings", "show my bookings", "view my bookings", "my booking", "எனது முன்பதிவுகள்", "मेरी बुकिंग"],
        adminRoute: "/admin/bookings",
        facultyRoute: "/faculty/my-bookings",
        name: "My Bookings",
      },
      // Profile
      {
        keys: [
          "open profile",
          "go to profile",
          "edit my profile",
          "edit profile",
          "change password",
          "update password",
          "profile",
          "my profile",
          "my account",
          "view profile",
          "என் profile திற",
          "புரொஃபைல் திற",
          "புரொபைல் திற",
          "சுயவிவரம் திற",
          "சுயவிவரம்",
          "password மாற்று",
          "கடவுச்சொல் மாற்று",
          "profile open pannu",
          "en profile open pannu",
          "password change pannu",
          "password mathu",
          "प्रोफ़ाइल खोलें",
          "मेरी प्रोफ़ाइल",
          "प्रोफ़ाइल",
          "पासवर्ड बदलें"
        ],
        adminRoute: "/admin/profile",
        facultyRoute: "/faculty/profile",
        name: "Profile",
      },
      // Admin only: Venue Management
      {
        keys: ["venue management", "manage venue", "manage venues", "halls management", "அரங்க மேலாண்மை", "वेन्यू प्रबंधन"],
        adminRoute: "/venue-management",
        adminOnly: true,
        name: "Venue Management",
      },
      // Admin only: Faculty Management
      {
        keys: ["faculty management", "manage faculty", "manage staff", "ஆசிரியர்கள் மேலாண்மை", "फैकल्टी प्रबंधन"],
        adminRoute: "/faculty-management",
        adminOnly: true,
        name: "Faculty Management",
      },
      // Admin only: Timetable
      {
        keys: ["open timetable", "timetable", "schedule", "time table", "கால அட்டவணை", "समय सारणी"],
        adminRoute: "/admin/timetable",
        adminOnly: true,
        name: "Timetable",
      },
      // Admin only: Venue Analytics & Utilization
      {
        keys: [
          "open analytics",
          "analytics",
          "venue analytics",
          "show venue utilization",
          "venue utilization",
          "utilization",
          "availability heatmap",
          "heatmap",
          "பகுப்பாய்வு",
          "பயன்பாட்டு பகுப்பாய்வு",
          "एनालिटिक्स",
          "स्थान उपयोग"
        ],
        adminRoute: "/admin/analytics",
        adminOnly: true,
        name: "Venue Analytics",
      },
      // Admin only: Reports
      {
        keys: ["reports", "report", "அறிக்கைகள்", "रिपोर्ट्स"],
        adminRoute: "/admin/reports",
        adminOnly: true,
        name: "Reports",
      },
      // Admin only: Bookings Management
      {
        keys: ["all bookings", "admin bookings", "manage bookings", "அனைத்து முன்பதிவுகள்", "सभी बुकिंग"],
        adminRoute: "/admin/bookings",
        adminOnly: true,
        name: "Admin Bookings",
      },
    ];

    let matched = false;

    for (const item of routesMap) {
      if (item.keys.some((key) => cmd.includes(key))) {
        matched = true;

        if (item.adminOnly && userRole !== "admin") {
          toast.error(t("voice.accessDenied"));
        } else {
          const targetRoute =
            userRole === "admin"
              ? item.adminRoute
              : item.facultyRoute || item.adminRoute;

          const isPasswordCmd =
            cmd.includes("change password") ||
            cmd.includes("password மாற்று") ||
            cmd.includes("password change pannu") ||
            cmd.includes("கடவுச்சொல் மாற்று") ||
            cmd.includes("पासवर्ड बदलें");

          const isEditCmd =
            cmd.includes("edit my profile") ||
            cmd.includes("edit profile");

          const navState = isPasswordCmd
            ? { openPasswordModal: true }
            : isEditCmd
            ? { openEdit: true }
            : undefined;

          toast.success(`🚀 Navigating to ${item.name}`);
          navigate(targetRoute, { state: navState });
        }
        break;
      }
    }

    if (!matched) {
      toast.warning(t("voice.commandNotRecognized", { command: text }));
    }

    setIsProcessing(false);
  };

  const handleConfirmAction = () => {
    if (pendingAction) {
      if (pendingAction.type === "CANCEL_BOOKING") {
        toast.info("Navigating to My Bookings to confirm cancellation");
        navigate(userRole === "admin" ? "/admin/bookings" : "/faculty/my-bookings");
      }
    }
    setPendingAction(null);
  };

  return (
    <>
      <div className="relative flex items-center shrink-0">
        <button
          type="button"
          onClick={toggleListening}
          className={`flex items-center justify-center gap-2 p-2.5 lg:px-3 lg:py-1.5 rounded-full border text-xs font-semibold transition-all duration-300 cursor-pointer shrink-0 ${
            isListening
              ? "bg-red-500 text-white border-red-600 animate-pulse shadow-lg shadow-red-200"
              : isProcessing
              ? "bg-amber-100 text-amber-800 border-amber-300"
              : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
          }`}
          title={isListening ? t("voice.listening") : t("voice.start")}
          aria-label={t("voice.start")}
        >
          {isProcessing ? (
            <Loader2 size={16} className="animate-spin text-amber-700 shrink-0" />
          ) : isListening ? (
            <Mic size={16} className="animate-bounce shrink-0" />
          ) : (
            <Mic size={16} className="shrink-0" />
          )}

          <span className="hidden lg:inline truncate max-w-[120px]">
            {isListening
              ? t("voice.listening")
              : isProcessing
              ? t("voice.processing")
              : t("voice.start")}
          </span>
        </button>

        {isListening && (
          <div className="absolute right-0 top-10 z-50 w-64 bg-slate-900/90 text-white p-3 rounded-xl shadow-xl text-xs backdrop-blur border border-slate-700 animate-in fade-in">
            <div className="flex items-center gap-2 mb-1 text-red-400 font-semibold">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
              {t("voice.listening")}
            </div>
            <p className="text-slate-300 italic">{t("voice.speakInstruction")}</p>
          </div>
        )}
      </div>

      <VoiceConfirmationModal
        isOpen={Boolean(pendingAction)}
        actionText={pendingAction?.text || ""}
        onConfirm={handleConfirmAction}
        onCancel={() => setPendingAction(null)}
      />
    </>
  );
};

export default VoiceNavControl;
