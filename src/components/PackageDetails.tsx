import React, { useState, useEffect } from "react";
import { Package } from '../types';
import { api } from '../lib/api';
import { texts } from '../i18n/texts';
import { PackageHistory } from './PackageHistory';
import './PackageDetails.css';

interface PackageDetailsProps {
    pkg: Package | null;
    projectPath: string;
    isUpdating: boolean;
    isReadOnly: boolean;
    lastUpdated?: number;
    onUpdate: (pkg: Package, version: string) => void;
    onInstallSpecific: (pkg: Package) => void;
    onRollback: (version: string) => void;
    onReadOnlyWarning: () => void;
}

export const PackageDetails: React.FC<PackageDetailsProps> = ({
    pkg,
    projectPath,
    isUpdating,
    isReadOnly,
    lastUpdated,
    onUpdate,
    onInstallSpecific,
    onRollback,
    onReadOnlyWarning
}) => {
    const [shakingPkg, setShakingPkg] = useState<string | null>(null);

    useEffect(() => {
        if (shakingPkg) {
            const timer = setTimeout(() => setShakingPkg(null), 500);
            return () => clearTimeout(timer);
        }
    }, [shakingPkg]);

    if (!pkg) {
        return (
            <div className="details-panel empty">
                <p>{texts.details.empty}</p>
            </div>
        );
    }

    const handleAction = (action: () => void) => {
        if (isUpdating) return; // Should be handled by native disabled
        if (isReadOnly) {
            setShakingPkg(pkg.name);
            onReadOnlyWarning();
            return;
        }
        action();
    };

    // If updating, native disable. If ReadOnly, custom locked class + clickable.
    const isLocked = isReadOnly && !isUpdating;
    const btnClass = (base: string) =>
        `${base} ${isLocked ? 'btn-locked' : ''} ${shakingPkg === pkg.name ? 'shake' : ''}`;

    return (
        <div className="details-panel">
            <div className="details-header">
                <h2>{pkg.name}</h2>
                <span className="version-pill">{pkg.current_version}</span>
            </div>

            {pkg.update_status === 'Major' && (
                <div className="alert-major">
                    {texts.details.majorWarning}
                </div>
            )}

            <div className="details-actions">
                {pkg.update_status !== 'UpToDate' && pkg.update_status !== 'NotInstalled' && (
                    <button
                        className={btnClass("btn-primary")}
                        onClick={() => handleAction(() => onUpdate(pkg, pkg.wanted_version || pkg.latest_version || ""))}
                        disabled={isUpdating}
                    >
                        {texts.details.updateTo} {pkg.wanted_version || pkg.latest_version}
                    </button>
                )}

                {pkg.update_status === 'Major' && (
                    <button
                        className={btnClass("btn-warning")}
                        onClick={() => handleAction(() => onUpdate(pkg, pkg.latest_version || ""))}
                        disabled={isUpdating}
                    >
                        {texts.details.forceUpdate} {pkg.latest_version} (Major)
                    </button>
                )}
            </div>

            <div className="details-actions-secondary">
                <button
                    className={btnClass("btn-text")}
                    onClick={() => handleAction(() => onInstallSpecific(pkg))}
                    disabled={isUpdating || pkg.update_status === 'NotInstalled'}
                >
                    {texts.details.installSpecific}
                </button>
            </div>

            <div className="links-section">
                <h4>Links</h4>
                <div className="links-list">
                    <button
                        className="link-badge npm"
                        onClick={() => api.openUrl(`https://www.npmjs.com/package/${pkg.name}`)}
                        title="Open NPM Registry"
                    >
                        NPM
                    </button>

                    {pkg.repository ? (
                        <button
                            className="link-badge repo"
                            onClick={() => api.openUrl(pkg.repository!)}
                            title={pkg.repository}
                        >
                            {texts.details.links.github}
                        </button>
                    ) : (
                        <span className="no-info">No repository info</span>
                    )}

                    {pkg.homepage && pkg.homepage !== pkg.repository && (
                        <button
                            className="link-badge home"
                            onClick={() => api.openUrl(pkg.homepage!)}
                            title={pkg.homepage}
                        >
                            {texts.details.links.homepage}
                        </button>
                    )}
                </div>
            </div>

            <PackageHistory
                projectPath={projectPath}
                packageName={pkg.name}
                onRollback={onRollback}
                lastUpdated={lastUpdated}
            />
        </div>
    );
};
