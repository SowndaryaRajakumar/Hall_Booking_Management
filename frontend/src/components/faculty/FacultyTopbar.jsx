import { Menu, UserCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSelector from "../common/LanguageSelector";
import VoiceNavControl from "../common/VoiceNavControl";
import NotificationBell from "../common/NotificationBell";

const FacultyTopbar = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const facultyName =
    typeof window !== "undefined"
      ? localStorage.getItem("facultyName") ||
        localStorage.getItem("staffName") ||
        localStorage.getItem("name") ||
        "Faculty Member"
      : "Faculty Member";

  const today = new Date();
  const locale = i18n.language.startsWith("ta") ? "ta-IN" : i18n.language.startsWith("hi") ? "hi-IN" : "en-IN";

  const formattedDate = today.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="app-header border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
      <div className="flex items-center justify-between gap-3">

        {/* LEFT */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            className="rounded-full p-2 shrink-0 text-slate-600 transition hover:bg-slate-100 hover:text-blue-700 cursor-pointer"
            onClick={toggleSidebar}
            aria-label="Toggle navigation"
            title="Toggle Menu"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-lg font-bold text-slate-800 leading-tight break-words">
              {t("topbar.welcome")}, {facultyName}
            </h2>

            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {formattedDate}
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <VoiceNavControl />
          <LanguageSelector />

          {/* Database-backed Notification Bell */}
          <NotificationBell />

          {/* PROFILE BUTTON */}
          <button
            type="button"
            onClick={() => navigate("/faculty/profile")}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-blue-50 transition cursor-pointer text-left"
            title={t("profile.title")}
          >
            <UserCircle2
              size={28}
              className="text-blue-700"
            />

            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-700">
                {facultyName}
              </p>
              <p className="text-xs text-slate-500">
                {t("topbar.faculty", "Faculty")}
              </p>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};

export default FacultyTopbar;
