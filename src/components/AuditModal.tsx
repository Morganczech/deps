import React from 'react';
import './AuditModal.css';

interface AuditResult {
    counts: {
        info: number;
        low: number;
        moderate: number;
        high: number;
        critical: number;
        total: number;
    };
    vulnerable_packages: Array<{
        name: string;
        severity: string;
        title: string;
        range: string;
    }>;
}

interface AuditModalProps {
    isOpen: boolean;
    result: AuditResult | null;
    isLoading: boolean;
    onClose: () => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({ isOpen, result, isLoading, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="audit-modal-overlay" onClick={onClose}>
            <div className="audit-modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Security Audit</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {isLoading ? (
                        <div className="audit-loading">
                            <div className="spinner"></div>
                            <p>Analyzing vulnerabilities...</p>
                            <span className="hint">This runs `npm audit` and may take a moment.</span>
                            <button className="btn-secondary btn-cancel" onClick={onClose}>
                                Cancel
                            </button>
                        </div>
                    ) : result ? (
                        <div className="audit-results">
                            <div className="audit-summary-ring">
                                <div className={`security-shield ${result.counts.total === 0 ? 'secure' : 'vulnerable'}`}>
                                    {result.counts.total === 0 ? '🛡️' : '⚠️'}
                                </div>
                                <h4>{result.counts.total === 0 ? "No vulnerabilities found!" : "Vulnerabilities Detected"}</h4>
                            </div>

                            {result.counts.total > 0 && (
                                <>
                                    <div className="vulnerability-grid">
                                        <div className="vuln-item critical">
                                            <span className="count">{result.counts.critical}</span>
                                            <span className="label">Critical</span>
                                        </div>
                                        <div className="vuln-item high">
                                            <span className="count">{result.counts.high}</span>
                                            <span className="label">High</span>
                                        </div>
                                        <div className="vuln-item moderate">
                                            <span className="count">{result.counts.moderate}</span>
                                            <span className="label">Moderate</span>
                                        </div>
                                        <div className="vuln-item low">
                                            <span className="count">{result.counts.low}</span>
                                            <span className="label">Low</span>
                                        </div>
                                    </div>

                                    <div className="affected-packages">
                                        <h5>Affected Packages ({result.vulnerable_packages.length})</h5>
                                        <ul className="vuln-list">
                                            {result.vulnerable_packages.map((pkg, idx) => (
                                                <li key={idx} className={`vuln-row ${pkg.severity}`}>
                                                    <span className="pkg-name">{pkg.name}</span>
                                                    <span className="pkg-severity">{pkg.severity}</span>
                                                    <span className="pkg-title" title={pkg.title}>{pkg.title}</span>
                                                </li>
                                            ))}
                                            {result.vulnerable_packages.length === 0 && (
                                                <li className="vuln-row empty">Details not available in summary</li>
                                            )}
                                        </ul>
                                    </div>
                                </>
                            )}

                            <div className="audit-advice">
                                <p>
                                    {result.counts.total === 0
                                        ? "Your dependencies look safe and sound."
                                        : "Run `npm audit fix` in your terminal to address these issues automatically."}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="error-state">
                            <p>Failed to load audit results.</p>
                        </div>
                    )}
                </div>

                <div className="modal-actions">
                    <button className="btn-primary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};
