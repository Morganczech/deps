import { Package } from '../types';
import { texts } from '../i18n/texts';
import './PackageDetails.css';

interface PackageDetailsProps {
    pkg: Package | null;
    isUpdating: boolean;
    onUpdate: (pkg: Package, version: string) => void;
    onInstallSpecific: (pkg: Package) => void;
}

export const PackageDetails: React.FC<PackageDetailsProps> = ({ pkg, isUpdating, onUpdate, onInstallSpecific }) => {
    if (!pkg) {
        return (
            <div className="details-panel empty">
                <p>{texts.details.empty}</p>
            </div>
        );
    }

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
                        className="btn-primary"
                        onClick={() => onUpdate(pkg, pkg.wanted_version || pkg.latest_version || "")}
                        disabled={isUpdating}
                    >
                        {texts.details.updateTo} {pkg.wanted_version || pkg.latest_version}
                    </button>
                )}

                {pkg.update_status === 'Major' && (
                    <button
                        className="btn-warning"
                        onClick={() => onUpdate(pkg, pkg.latest_version || "")}
                        disabled={isUpdating}
                    >
                        {texts.details.forceUpdate} {pkg.latest_version} (Major)
                    </button>
                )}
            </div>

            <div className="details-actions-secondary">
                <button
                    className="btn-text"
                    onClick={() => onInstallSpecific(pkg)}
                    disabled={isUpdating}
                >
                    {texts.details.installSpecific}
                </button>
            </div>

            <div className="links">
                <a href="#">GitHub</a> | <a href="#">Homepage</a> | <a href="#">npm</a>
            </div>
        </div>
    );
};
