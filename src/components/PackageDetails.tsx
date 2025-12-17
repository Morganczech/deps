import React from 'react';
import { Package } from '../types';
import './PackageDetails.css';

interface PackageDetailsProps {
    pkg: Package | null;
}

export const PackageDetails: React.FC<PackageDetailsProps> = ({ pkg }) => {
    if (!pkg) {
        return (
            <div className="details-panel empty">
                <p>Select a package to view details</p>
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
                    ⚠️ Existuje major aktualizace s možnými breaking changes.
                </div>
            )}

            <div className="details-actions">
                {pkg.update_status !== 'UpToDate' && (
                    <button className="btn-primary">
                        Aktualizovat na {pkg.wanted_version || pkg.latest_version}
                    </button>
                )}

                {pkg.update_status === 'Major' && (
                    <button className="btn-warning">
                        Vynutit aktualizaci na {pkg.latest_version} (Major)
                    </button>
                )}
            </div>

            <div className="links">
                <a href="#">GitHub</a> | <a href="#">Homepage</a> | <a href="#">npm</a>
            </div>
        </div>
    );
};
