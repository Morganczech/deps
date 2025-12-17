import React, { useState, useEffect } from "react";
import { Package } from '../types';
import { texts } from '../i18n/texts';
import './PackageDetails.css';

interface PackageDetailsProps {
    pkg: Package | null;
    isUpdating: boolean;
    isReadOnly: boolean;
    onUpdate: (pkg: Package, version: string) => void;
    onInstallSpecific: (pkg: Package) => void;
    onReadOnlyWarning: () => void;
}

export const PackageDetails: React.FC<PackageDetailsProps> = ({
    pkg,
    isUpdating,
    isReadOnly,
    onUpdate,
    onInstallSpecific,
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
                {pkg.update_status !== 'UpToDate' && (
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
                    disabled={isUpdating}
                >
                    {texts.details.installSpecific}
                </button>
            </div>

            <div className="links">
                <a
                    href={`https://www.npmjs.com/package/${pkg.name}`}
                    target="_blank"
                    rel="noreferrer"
                >
                    {texts.details.links.npm}
                </a>
                {pkg.repository && (
                    <>
                        {" | "}
                        <a
                            href={pkg.repository}
                            target="_blank"
                            rel="noreferrer"
                        >
                            {texts.details.links.github}
                        </a>
                    </>
                )}
                {pkg.homepage && pkg.homepage !== pkg.repository && (
                    <>
                        {" | "}
                        <a
                            href={pkg.homepage}
                            target="_blank"
                            rel="noreferrer"
                        >
                            {texts.details.links.homepage}
                        </a>
                    </>
                )}
            </div>
        </div>
    );
};
