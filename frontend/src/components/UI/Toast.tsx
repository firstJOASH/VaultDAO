import React, { useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type,
  onClose,
  duration = 5000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle className="text-green-400" size={20} />,
    error: <AlertCircle className="text-red-400" size={20} />,
    info: <Info className="text-blue-400" size={20} />,
    warning: <AlertCircle className="text-yellow-400" size={20} />,
  };

  const bgColors = {
    success: "bg-green-900/20 border-green-500/50",
    error: "bg-red-900/20 border-red-500/50",
    info: "bg-blue-900/20 border-blue-500/50",
    warning: "bg-yellow-900/20 border-yellow-500/50",
  };

  return (
    <div
      className={`fixed bottom-6 right-6 flex items-center p-4 rounded-xl border backdrop-blur-md z-[100] animate-in fade-in slide-in-from-bottom-5 duration-300 ${bgColors[type]}`}
    >
      <div className="mr-3">{icons[type]}</div>
      <p className="text-sm font-medium text-white pr-8">{message}</p>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
