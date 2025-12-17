export interface Project {
    name: string;
    path: string;
    version: string;
    is_writable: boolean;
}

export type UpdateStatus = 'UpToDate' | 'Minor' | 'Major' | 'Error';

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
