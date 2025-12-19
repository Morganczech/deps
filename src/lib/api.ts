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

    getPackages: async (projectPath: string): Promise<Package[]> => {
        return await invoke<Package[]>("get_packages", { projectPath });
    },

    updatePackage: async (projectPath: string, packageName: string, version: string): Promise<void> => {
        return await invoke<void>("update_package", { projectPath, packageName, version });
    },

    installDependencies: async (projectPath: string): Promise<void> => {
        return await invoke<void>("install_dependencies", { projectPath });
    },

    openUrl: async (url: string): Promise<void> => {
        try {
            await open(url);
        } catch (e) {
            console.error("Failed to open URL:", e);
        }
    }
};
