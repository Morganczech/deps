import { Package, UpdateStatus } from '../types';
import { texts } from '../i18n/texts';
import { StatusHelp } from './StatusHelp';
import './PackageTable.css';

interface PackageTableProps {
    packages: Package[];
    selectedPackage: Package | null;
    lastUpdatedPackage: string | null;
    onSelect: (pkg: Package) => void;
}

export const PackageTable: React.FC<PackageTableProps> = ({ packages, selectedPackage, lastUpdatedPackage, onSelect }) => {

    const getStatusBadge = (status: UpdateStatus) => {
        switch (status) {
            case 'Major': return <span className="badge badge-major">{texts.table.badges.major}</span>;
            case 'Minor': return <span className="badge badge-minor">{texts.table.badges.minor}</span>;
            case 'UpToDate': return <span className="badge badge-ok">{texts.table.badges.upToDate}</span>;
            case 'NotInstalled': return <span className="badge badge-gray">Not Installed</span>;
            default: return null;
        }
    };

    return (
        <div className="table-container">
            <table className="package-table">
                <thead>
                    <tr>
                        <th>{texts.table.headers.package}</th>
                        <th>{texts.table.headers.current}</th>
                        <th>{texts.table.headers.wanted}</th>
                        <th>{texts.table.headers.latest}</th>
                        <th>
                            {texts.table.headers.status}
                            <StatusHelp />
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {packages.map((pkg) => (
                        <tr
                            key={pkg.name}
                            className={`
                                ${selectedPackage?.name === pkg.name ? 'selected' : ''}
                                ${lastUpdatedPackage === pkg.name ? 'flash-update' : ''}
                                ${pkg.update_status === 'NotInstalled' ? 'row-not-installed' : ''}
                            `}
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
