import React from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

const languages = [
  { code: "en", label: "English" },
  { code: "ta", label: "தமிழ்" },
  { code: "hi", label: "हिन्दी" },
];

const LanguageSelector = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || "en";

  const handleLanguageChange = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem("app_language", code);
  };

  return (
    <div className="flex items-center shrink-0">
      {/* Desktop / Tablet View (Pill format) */}
      <div className="hidden sm:flex items-center gap-0.5 bg-slate-100 p-1 rounded-full border border-slate-200 shadow-inner shrink-0">
        <Globe size={15} className="text-slate-500 ml-1.5 mr-1 shrink-0" />
        {languages.map((lang, index) => (
          <React.Fragment key={lang.code}>
            <button
              type="button"
              onClick={() => handleLanguageChange(lang.code)}
              className={`px-2 py-0.5 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer ${
                currentLang.startsWith(lang.code)
                  ? "bg-blue-700 text-white shadow-sm"
                  : "text-slate-600 hover:text-blue-700 hover:bg-slate-200/70"
              }`}
              title={`Switch language to ${lang.label}`}
            >
              {lang.label}
            </button>
            {index < languages.length - 1 && (
              <span className="text-slate-300 text-xs px-0.5 font-light">|</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Mobile View (Compact dropdown) */}
      <div className="sm:hidden relative flex items-center bg-slate-100 px-2 py-1.5 rounded-full border border-slate-200 shadow-inner shrink-0">
        <Globe size={15} className="text-blue-700 mr-1 shrink-0" />
        <select
          value={languages.find((l) => currentLang.startsWith(l.code))?.code || "en"}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer pr-1"
          aria-label="Select Language"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default LanguageSelector;
