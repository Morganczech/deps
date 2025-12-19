import React, { useEffect } from 'react';
import './Toast.css';

interface ToastProps {
    message: string | null;
    type?: 'success' | 'error' | 'info';
    onClose: () => void;
    onShowOutput?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose, onShowOutput }) => {
    useEffect(() => {
        if (message && (type === 'success' || type === 'info')) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
        // Error toasts nezmizí automaticky
    }, [message, type, onClose]);

    if (!message) return null;

    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';

    return (
        <div className={`toast-container toast-${type}`}>
            <div className="toast-message">
                <span className="toast-icon">{icon}</span>
                <span className="toast-text">{message}</span>
                {type === 'error' && onShowOutput && (
                    <button className="toast-btn" onClick={onShowOutput}>
                        Show output
                    </button>
                )}
                <button className="toast-close" onClick={onClose}>×</button>
            </div>
        </div>
    );
};
