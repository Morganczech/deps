import React from 'react';
import './Terminal.css';

interface TerminalProps {
    output: string[];
    isVisible: boolean;
    onClose: () => void;
}

export const Terminal: React.FC<TerminalProps> = ({ output, isVisible, onClose }) => {
    if (!isVisible) return null;

    return (
        <div className="terminal-drawer">
            <div className="terminal-header">
                <span>VÝSTUP PŘÍKAZU (npm)</span>
                <div className="terminal-controls">
                    <button className="icon-btn" onClick={onClose}>×</button>
                </div>
            </div>
            <div className="terminal-content">
                {output.map((line, i) => (
                    <div key={i} className="terminal-line">{line}</div>
                ))}
                {output.length === 0 && <div className="terminal-line text-muted">No output...</div>}
            </div>
        </div>
    );
};
