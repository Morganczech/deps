import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Package } from '../types';
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
    const { t } = useTranslation();
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
                <h3 className="modal-title">{t('modal.confirmTitle')}</h3>
                <div className="modal-body">
                    <p>
                        <Trans i18nKey="modal.confirmMessage" values={{ name: packageToUpdate.name, defaultValue: "Are you sure you want to update <strong>{{name}}</strong>?" }} components={{ strong: <strong /> }}>
                            Are you sure you want to update <strong>{packageToUpdate.name}</strong>?
                        </Trans>
                    </p>
                    <div className="version-diff">
                        <span className="version-old">{packageToUpdate.current_version}</span>
                        <span className="arrow">→</span>
                        <span className="version-new">{targetVersion}</span>
                    </div>
                    {showWarning && (
                        <div className="modal-warning">
                            <p>{customWarning || t('details.majorWarning')}</p>
                            <label className="confirmation-checkbox">
                                <input
                                    type="checkbox"
                                    checked={isConfirmed}
                                    onChange={(e) => setIsConfirmed(e.target.checked)}
                                />
                                {t('modal.confirmCheckbox')}
                            </label>
                        </div>
                    )}
                </div>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onCancel}>{t('modal.cancel')}</button>
                    <button
                        className="btn-primary"
                        onClick={onConfirm}
                        disabled={!canConfirm}
                    >
                        {t('modal.update')}
                    </button>
                </div>
            </div>
        </div>
    );
};
