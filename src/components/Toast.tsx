import React, { useEffect } from 'react';
import './Toast.css';

interface ToastProps {
    message: string | null;
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [message, onClose]);

    if (!message) return null;

    return (
        <div className="toast-container">
            <div className="toast-message">
                ✅ {message}
            </div>
        </div>
    );
};
