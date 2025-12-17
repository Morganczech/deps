import React, { useState } from 'react';
import './VersionInputModal.css';

interface VersionInputModalProps {
    isOpen: boolean;
    packageName: string;
    onConfirm: (version: string) => void;
    onCancel: () => void;
}

export const VersionInputModal: React.FC<VersionInputModalProps> = ({
    isOpen,
    packageName,
    onConfirm,
    onCancel
}) => {
    const [version, setVersion] = useState("");
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const validateVersion = (v: string) => {
        // Basic semver regex (x.y.z)
        const isValid = /^\d+\.\d+\.\d+(-[\w\d.]+)?$/.test(v);
        return isValid;
    };

    const handleSubmit = () => {
        if (!validateVersion(version)) {
            setError("Invalid version format (e.g., 1.0.0)");
            return;
        }
        setError(null);
        onConfirm(version);
        setVersion(""); // Reset for next time
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content input-modal">
                <h3 className="modal-title">Install Specific Version</h3>
                <div className="modal-body">
                    <p>Enter the version of <strong>{packageName}</strong> to install:</p>
                    <input
                        type="text"
                        className="version-input"
                        placeholder="e.g., 1.2.3"
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    />
                    {error && <p className="input-error">{error}</p>}
                </div>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onCancel}>Cancel</button>
                    <button className="btn-primary" onClick={handleSubmit}>Next</button>
                </div>
            </div>
        </div>
    );
};
