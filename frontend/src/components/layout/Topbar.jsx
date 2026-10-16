import { Menu, UserCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSelector from "../common/LanguageSelector";
import VoiceNavControl from "../common/VoiceNavControl";
import NotificationBell from "../common/NotificationBell";

const Topbar = ({ toggleSidebar }) => {
  const { t, i18n } = useTranslation();
  const today = new Date();

  const locale = i18n.language.startsWith("ta") ? "ta-IN" : i18n.language.startsWith("hi") ? "hi-IN" : "en-IN";

  const formattedDate = today.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="app-header flex min-h-16 items-center justify-between gap-3 bg-white px-4 py-2 shadow-sm sm:px-6">

      {/* Left Section */}
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-4 flex-1">

        <button
          type="button"
          onClick={toggleSidebar}
          className="ui-icon-button shrink-0 text-gray-600 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
          aria-label="Toggle navigation"
          title="Toggle Menu"
        >
          <Menu size={24} />
        </button>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm sm:text-lg font-bold text-gray-800 leading-tight break-words">
            {t("topbar.adminTitle")}
          </h2>

          <p className="hidden text-xs text-gray-500 sm:block mt-0.5 truncate">
            {formattedDate}
          </p>
        </div>

      </div>

      {/* Right Section */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">

        <VoiceNavControl />
        <LanguageSelector />

        <NotificationBell />

        <Link
          to="/admin/profile"
          className="flex items-center gap-2 shrink-0 p-1 rounded-xl hover:bg-slate-50 transition cursor-pointer"
          title={t("profile.title")}
        >
          <UserCircle size={32} className="text-blue-700 shrink-0" />

          <div className="hidden lg:block text-left">
            <p className="font-semibold text-xs text-gray-700 leading-tight">
              {t("topbar.admin")}
            </p>

            <p className="text-[11px] text-gray-500">
              {t("topbar.administrator")}
            </p>
          </div>
        </Link>

      </div>

    </header>
  );
};

export default Topbar;
