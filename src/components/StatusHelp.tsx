import React, { useState } from 'react';
import './StatusHelp.css';

export const StatusHelp: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    const handleClick = () => {
        setIsVisible(!isVisible);
    };

    const handleMouseEnter = () => {
        setIsVisible(true);
    };

    const handleMouseLeave = () => {
        setIsVisible(false);
    };

    return (
        <span className="status-help">
            <button
                className="help-icon"
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                aria-label="Package status help"
            >
                ?
            </button>
            {isVisible && (
                <div className="help-tooltip">
                    <div className="tooltip-title">Package update statuses</div>
                    <div className="tooltip-content">
                        <div className="tooltip-item">
                            <span className="status-emoji">🟢</span>
                            <div>
                                <strong>Up to date</strong>
                                <p>You are using the latest compatible version.</p>
                            </div>
                        </div>
                        <div className="tooltip-item">
                            <span className="status-emoji">🔵</span>
                            <div>
                                <strong>Minor update</strong>
                                <p>A newer version is available within the same major version. Safe to update.</p>
                            </div>
                        </div>
                        <div className="tooltip-item">
                            <span className="status-emoji">🔴</span>
                            <div>
                                <strong>Major update</strong>
                                <p>A new major version is available. This update may introduce breaking changes.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </span>
    );
};
