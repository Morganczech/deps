import React from 'react';
import { Package } from '../types';
import { texts } from '../i18n/texts';
import './ConfirmationModal.css';

interface ConfirmationModalProps {
    isOpen: boolean;
    packageToUpdate: Package | null;
    targetVersion: string;
    customWarning?: string | null;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    packageToUpdate,
    targetVersion,
    customWarning,
    onConfirm,
    onCancel
}) => {
    const [isConfirmed, setIsConfirmed] = React.useState(false);

    // Reset state when modal opens
    React.useEffect(() => {
        if (isOpen) setIsConfirmed(false);
    }, [isOpen]);

    if (!isOpen || !packageToUpdate) return null;

    const isMajor = packageToUpdate.update_status === 'Major';
    const showWarning = isMajor || !!customWarning;
    const canConfirm = !showWarning || isConfirmed;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3 className="modal-title">Confirm Update</h3>
                <div className="modal-body">
                    <p>
                        Are you sure you want to update <strong>{packageToUpdate.name}</strong>?
                    </p>
                    <div className="version-diff">
                        <span className="version-old">{packageToUpdate.current_version}</span>
                        <span className="arrow">→</span>
                        <span className="version-new">{targetVersion}</span>
                    </div>
                    {showWarning && (
                        <div className="modal-warning">
                            <p>{customWarning || texts.details.majorWarning}</p>
                            <label className="confirmation-checkbox">
                                <input
                                    type="checkbox"
                                    checked={isConfirmed}
                                    onChange={(e) => setIsConfirmed(e.target.checked)}
                                />
                                I understand the risk.
                            </label>
                        </div>
                    )}
                </div>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onCancel}>Cancel</button>
                    <button
                        className="btn-primary"
                        onClick={onConfirm}
                        disabled={!canConfirm}
                    >
                        Update
                    </button>
                </div>
            </div>
        </div>
    );
};
