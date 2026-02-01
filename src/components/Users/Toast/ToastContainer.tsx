import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { Toast, ToastType } from '../../types/toast';

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onRemove,
}) => {
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-3 max-w-md w-full px-4 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          gradient: 'from-green-500 via-emerald-600 to-teal-700',
          icon: CheckCircle,
          iconColor: 'text-green-100',
          glowColor: 'bg-green-400/30',
        };
      case 'error':
        return {
          gradient: 'from-red-500 via-rose-600 to-pink-700',
          icon: XCircle,
          iconColor: 'text-red-100',
          glowColor: 'bg-red-400/30',
        };
      case 'warning':
        return {
          gradient: 'from-amber-500 via-orange-600 to-yellow-700',
          icon: AlertTriangle,
          iconColor: 'text-amber-100',
          glowColor: 'bg-amber-400/30',
        };
      case 'info':
        return {
          gradient: 'from-blue-500 via-indigo-600 to-purple-700',
          icon: Info,
          iconColor: 'text-blue-100',
          glowColor: 'bg-blue-400/30',
        };
    }
  };

  const {
    gradient,
    icon: Icon,
    iconColor,
    glowColor,
  } = getToastStyles(toast.type);

  return (
    <div
      className="relative animate-slideInRight pointer-events-auto"
      style={{
        animation: 'slideInRight 0.4s ease-out forwards',
      }}
    >
      {/* Background gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-95 rounded-2xl`}
      />

      {/* Glassmorphism layer */}
      <div className="absolute inset-0 backdrop-blur-xl bg-white/10 rounded-2xl" />

      {/* Glow effects */}
      <div
        className={`absolute -top-2 -left-2 w-24 h-24 ${glowColor} rounded-full blur-2xl animate-pulse`}
        style={{ animationDuration: '3s' }}
      />
      <div
        className={`absolute -bottom-2 -right-2 w-20 h-20 ${glowColor} rounded-full blur-xl animate-pulse`}
        style={{ animationDuration: '4s', animationDelay: '1s' }}
      />

      {/* Content */}
      <div className="relative flex items-start gap-3 p-4 pr-12">
        {/* Icon avec glow */}
        <div className="relative flex-shrink-0">
          <div
            className={`absolute inset-0 ${glowColor} rounded-full blur-md`}
          />
          <div className="relative w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40 shadow-lg">
            <Icon className={`w-5 h-5 ${iconColor} drop-shadow-lg`} />
          </div>
        </div>

        {/* Message */}
        <div className="flex-1 pt-1.5">
          <p className="text-white font-medium drop-shadow-lg text-[15px] leading-relaxed">
            {toast.message}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={() => onRemove(toast.id)}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/15 backdrop-blur-md hover:bg-white/25 transition-all duration-200 border border-white/30 hover:scale-110 group"
        >
          <X className="w-4 h-4 text-white/90 group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="relative h-1 bg-white/10 rounded-b-2xl overflow-hidden">
        <div
          className="h-full bg-white/40 backdrop-blur-sm shadow-lg"
          style={{
            animation: `shrink ${toast.duration || 4000}ms linear forwards`,
          }}
        />
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};

export default ToastContainer;
