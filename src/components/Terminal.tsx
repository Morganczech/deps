import React, { useState, useRef, useEffect } from 'react';
import './Terminal.css';

interface TerminalProps {
    output: string[];
    isVisible: boolean;
    onClose: () => void;
    onToggle: () => void;
}

export const Terminal: React.FC<TerminalProps> = ({ output, isVisible, onClose, onToggle }) => {
    const [height, setHeight] = useState(120); // Výchozí nízká výška
    const [isCollapsed, setIsCollapsed] = useState(true); // Defaultně sbalený
    const [isResizing, setIsResizing] = useState(false);
    const terminalRef = useRef<HTMLDivElement>(null);

    const MIN_HEIGHT = 80;
    const MAX_HEIGHT_PERCENT = 0.6; // 60% výšky okna

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const windowHeight = window.innerHeight;
            const newHeight = windowHeight - e.clientY;
            const maxHeight = windowHeight * MAX_HEIGHT_PERCENT;

            const clampedHeight = Math.min(Math.max(newHeight, MIN_HEIGHT), maxHeight);
            setHeight(clampedHeight);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    useEffect(() => {
        if (isResizing) {
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
        } else {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    }, [isResizing]);

    if (!isVisible) return null;

    const handleToggle = () => {
        setIsCollapsed(!isCollapsed);
        onToggle();
    };

    const displayHeight = isCollapsed ? 32 : height; // Pouze hlavička když collapsed

    return (
        <div
            ref={terminalRef}
            className="terminal-drawer"
            style={{ height: `${displayHeight}px` }}
        >
            <div
                className="resize-handle"
                onMouseDown={() => !isCollapsed && setIsResizing(true)}
                style={{ cursor: isCollapsed ? 'default' : 'row-resize' }}
            />
            <div className="terminal-header">
                <div className="terminal-title">
                    <span className="terminal-prompt">_&lt;</span>
                    <button
                        className="toggle-btn"
                        onClick={handleToggle}
                        title={isCollapsed ? "Rozbalit terminál" : "Sbalit terminál"}
                    >
                        {isCollapsed ? '▲' : '▼'}
                    </button>
                    <span>VÝSTUP PŘÍKAZU (npm)</span>
                </div>
                <div className="terminal-controls">
                    <button className="icon-btn" onClick={onClose} title="Zavřít terminál">×</button>
                </div>
            </div>
            {!isCollapsed && (
                <div className="terminal-content">
                    {output.map((line, i) => (
                        <div key={i} className="terminal-line">{line}</div>
                    ))}
                    {output.length === 0 && <div className="terminal-line text-muted">Žádný výstup...</div>}
                </div>
            )}
        </div>
    );
};
