import { useTranslation } from "react-i18next";
import { AlertTriangle, Mic } from "lucide-react";

const VoiceConfirmationModal = ({ isOpen, actionText, onConfirm, onCancel }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
        <div className="flex items-center gap-3 text-amber-600 border-b border-slate-100 pb-3">
          <div className="p-2.5 bg-amber-50 rounded-full">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {t("voice.confirmationTitle")}
            </h3>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Mic size={12} className="text-blue-600" /> Spoken command action
            </p>
          </div>
        </div>

        <p className="text-slate-700 text-sm leading-relaxed">
          {t("voice.confirmPrompt", { action: actionText })}
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            {t("voice.confirmNo")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold bg-red-600 text-white hover:bg-red-700 rounded-xl shadow-md transition cursor-pointer"
          >
            {t("voice.confirmYes")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceConfirmationModal;
