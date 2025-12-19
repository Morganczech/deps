import { Package, UpdateStatus } from '../types';
import { useTranslation } from 'react-i18next';
import { StatusHelp } from './StatusHelp';
import './PackageTable.css';

interface PackageTableProps {
    packages: Package[];
    selectedPackage: Package | null;
    lastUpdatedPackage: string | null;
    onSelect: (pkg: Package) => void;
}

export const PackageTable: React.FC<PackageTableProps> = ({ packages, selectedPackage, lastUpdatedPackage, onSelect }) => {
    const { t } = useTranslation();

    const getStatusBadge = (status: UpdateStatus) => {
        switch (status) {
            case 'Major': return <span className="badge badge-major">{t('status.major')}</span>;
            case 'Minor': return <span className="badge badge-minor">{t('status.minor')}</span>;
            case 'UpToDate': return <span className="badge badge-ok">{t('status.upToDate')}</span>;
            case 'NotInstalled': return <span className="badge badge-gray">{t('status.notInstalled')}</span>;
            default: return null;
        }
    };

    return (
        <div className="table-container">
            <table className="package-table">
                <thead>
                    <tr>
                        <th>{t('table.package')}</th>
                        <th>{t('table.current')}</th>
                        <th>{t('table.wanted')}</th>
                        <th>{t('table.latest')}</th>
                        <th>
                            {t('table.status')}
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
