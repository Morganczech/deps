import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { open } from "@tauri-apps/plugin-shell";
import { Project, Package } from "../types";

export const api = {
    selectFolder: async (): Promise<string | null> => {
        const result = await openDialog({
            directory: true,
            multiple: false,
            title: "Select Workspace Folder"
        });
        return result;
    },

    getLastWorkspace: async (): Promise<string | null> => {
        try {
            return await invoke<string | null>("get_last_workspace");
        } catch (e) {
            console.error("Failed to get last workspace:", e);
            return null;
        }
    },

    saveWorkspace: async (path: string): Promise<void> => {
        try {
            await invoke("save_workspace", { path });
        } catch (e) {
            console.error("Failed to save workspace:", e);
        }
    },

    scanProjects: async (rootPath: string): Promise<Project[]> => {
        return await invoke<Project[]>("scan_projects", { rootPath });
    },

    async getPackages(projectPath: string): Promise<Package[]> {
        return invoke('get_packages', { projectPath });
    },

    async updatePackage(projectPath: string, packageName: string, version: string): Promise<void> {
        return invoke('update_package', { projectPath, packageName, version });
    },

    async installDependencies(projectPath: string): Promise<void> {
        return invoke('install_dependencies', { projectPath });
    },

    async runAudit(projectPath: string): Promise<{
        counts: {
            info: number;
            low: number;
            moderate: number;
            high: number;
            critical: number;
            total: number;
        };
        vulnerable_packages: Array<{
            name: string;
            severity: string;
            title: string;
            range: string;
        }>;
    }> {
        return invoke('run_audit', { projectPath });
    },

    async auditFix(projectPath: string): Promise<void> {
        return invoke('run_audit_fix', { projectPath });
    },

    async openUrl(url: string): Promise<void> {
        // Use the shell plugin for system browser
        await open(url);
    }
};
