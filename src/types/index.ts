export interface Project {
    name: string;
    path: string;
    version: string;
    is_writable: boolean;
    has_node_modules: boolean;
}

export type UpdateStatus = 'UpToDate' | 'Minor' | 'Major' | 'Error' | 'NotInstalled';

export interface Package {
    name: string;
    current_version: string;
    wanted_version?: string;
    latest_version?: string;
    update_status: UpdateStatus;
    is_dev: boolean;
    repository?: string;
    homepage?: string;
}

export interface PackageHistoryEntry {
    type: 'upgrade' | 'downgrade' | 'rollback' | 'external';
    from: string;
    to: string;
    date: string;
    note?: string;
}

export interface GlobalSearchResult {
    project: Project;
    package: Package;
}
