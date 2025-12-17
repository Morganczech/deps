import React from 'react';
import { Package, UpdateStatus } from '../types';
import './PackageTable.css';

interface PackageTableProps {
    packages: Package[];
    selectedPackage: Package | null;
    onSelect: (pkg: Package) => void;
}

export const PackageTable: React.FC<PackageTableProps> = ({ packages, selectedPackage, onSelect }) => {

    const getStatusBadge = (status: UpdateStatus) => {
        switch (status) {
            case 'Major': return <span className="badge badge-major">Major</span>;
            case 'Minor': return <span className="badge badge-minor">Minor</span>;
            case 'UpToDate': return <span className="badge badge-ok">Aktuální</span>;
            default: return null;
        }
    };

    return (
        <div className="table-container">
            <table className="package-table">
                <thead>
                    <tr>
                        <th>BALÍČEK</th>
                        <th>AKTUÁLNÍ</th>
                        <th>POŽADOVANÁ</th>
                        <th>NEJNOVĚJŠÍ</th>
                        <th>STAV</th>
                    </tr>
                </thead>
                <tbody>
                    {packages.map((pkg) => (
                        <tr
                            key={pkg.name}
                            className={selectedPackage?.name === pkg.name ? 'selected' : ''}
                            onClick={() => onSelect(pkg)}
                        >
                            <td className="col-name">{pkg.name}</td>
                            <td className="col-ver">{pkg.current_version}</td>
                            <td className="col-ver">{pkg.wanted_version}</td>
                            <td className="col-ver">{pkg.latest_version}</td>
                            <td className="col-status">{getStatusBadge(pkg.update_status)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
