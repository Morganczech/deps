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
    onFix?: () => void;
    isFixing?: boolean;
    directDependencies?: Set<string>;
    onSelectPackage?: (name: string) => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({
    isOpen, result, isLoading, onClose, onFix, isFixing, directDependencies, onSelectPackage
}) => {
    if (!isOpen) return null;

    // ... (rest of component render)

    return (
        <div className="audit-modal-overlay" onClick={isFixing ? undefined : onClose}>
            <div className="audit-modal-content" onClick={e => e.stopPropagation()}>
                {/* ... header ... */}
                <div className="modal-header">
                    <h3>{isFixing ? "Fixing Vulnerabilities..." : "Security Audit"}</h3>
                    {!isFixing && <button className="close-btn" onClick={onClose}>×</button>}
                </div>

                <div className="modal-body">
                    {/* ... loading states ... */}
                    {isLoading ? (
                        <div className="audit-loading">
                            <div className="spinner"></div>
                            <p>Analyzing vulnerabilities...</p>
                            <span className="hint">This runs `npm audit` and may take a moment.</span>
                            <button className="btn-secondary btn-cancel" onClick={onClose}>
                                Cancel
                            </button>
                        </div>
                    ) : isFixing ? (
                        <div className="audit-loading">
                            <div className="spinner"></div>
                            <p>Running `npm audit fix`...</p>
                            <span className="hint">Check the terminal for details.</span>
                        </div>
                    ) : result ? (
                        <div className="audit-results">
                            {/* ... summary ring ... */}
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
                                            {result.vulnerable_packages.map((pkg, idx) => {
                                                const isDirect = directDependencies?.has(pkg.name);
                                                const isClickable = isDirect && onSelectPackage;

                                                return (
                                                    <li
                                                        key={idx}
                                                        className={`vuln-row ${pkg.severity} ${isClickable ? 'clickable' : ''}`}
                                                        onClick={() => isClickable && onSelectPackage && onSelectPackage(pkg.name)}
                                                        title={isDirect ? "Click to view package details" : "Transitive dependency"}
                                                    >
                                                        <span className="pkg-type" title={isDirect ? "Direct Dependency" : "Transitive Dependency"}>
                                                            {isDirect ? '📦' : '🔗'}
                                                        </span>
                                                        <span className="pkg-name">{pkg.name}</span>
                                                        <span className="pkg-severity">{pkg.severity}</span>
                                                        <span className="pkg-title" title={pkg.title}>{pkg.title}</span>
                                                    </li>
                                                );
                                            })}
                                            {result.vulnerable_packages.length === 0 && (
                                                <li className="vuln-row empty">Details not available in summary</li>
                                            )}
                                        </ul>
                                    </div>
                                </>
                            )}
                            {/* ... advice ... */}
                            <div className="audit-advice">
                                <p>
                                    {result.counts.total === 0
                                        ? "Your dependencies look safe and sound."
                                        : "Run `npm audit fix` to address these issues automatically."}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="error-state">
                            <p>Failed to load audit results.</p>
                        </div>
                    )}
                </div>

                {/* ... actions ... */}
                {!isLoading && !isFixing && (
                    <div className="modal-actions">
                        {result && result.counts.total > 0 && onFix && (
                            <button className="btn-primary" onClick={onFix}>
                                Run `npm audit fix`
                            </button>
                        )}
                        <button className="btn-secondary" onClick={onClose}>Close</button>
                    </div>
                )}
            </div>
        </div>
    );
};
