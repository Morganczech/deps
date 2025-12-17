import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/dialog";
import { Project, Package } from "../types";

const isTauri = () => {
    return "__TAURI_IPC__" in window;
};

// Mock data for Web Mode
const MOCK_PROJECTS: Project[] = [
    { name: "demo-project", path: "/home/user/demo/demo-project", version: "1.0.0", is_writable: true },
    { name: "another-app", path: "/home/user/demo/another-app", version: "0.5.0", is_writable: false } // Test Read-only
];

const MOCK_PACKAGES: Package[] = [
    {
        name: "react",
        current_version: "18.2.0",
        wanted_version: "18.2.0",
        latest_version: "18.3.0",
        update_status: "UpToDate",
        is_dev: false,
        repository: "https://github.com/facebook/react",
    },
    {
        name: "typescript",
        current_version: "4.9.5",
        wanted_version: "4.9.5",
        latest_version: "5.3.3",
        update_status: "Major",
        is_dev: true,
        repository: "https://github.com/microsoft/TypeScript",
    },
    {
        name: "vite",
        current_version: "5.0.0",
        wanted_version: "5.0.4",
        latest_version: "5.1.0",
        update_status: "Minor",
        is_dev: true,
        repository: "https://github.com/vitejs/vite",
    },
    {
        name: "axios",
        current_version: "0.21.1",
        wanted_version: "0.21.4",
        latest_version: "1.6.0",
        update_status: "Major",
        is_dev: false,
    }
];

export const api = {
    selectFolder: async (): Promise<string | null> => {
        if (isTauri()) {
            try {
                const selected = await open({
                    directory: true,
                    multiple: false,
                    recursive: false,
                });
                if (selected === null) return null;
                return typeof selected === 'string' ? selected : selected[0];
            } catch (e) {
                console.error("Tauri dialog failed", e);
                return null;
            }
        } else {
            // Web fallback
            console.warn("Running in Web Mode: returning mock folder path");
            return "/home/user/demo";
        }
    },

    scanProjects: async (rootPath: string): Promise<Project[]> => {
        if (isTauri()) {
            return await invoke<Project[]>("scan_projects", { rootPath });
        } else {
            console.warn("Running in Web Mode: returning mock projects");
            // Simulate network delay
            await new Promise(r => setTimeout(r, 500));
            return MOCK_PROJECTS;
        }
    },

    getPackages: async (projectPath: string): Promise<Package[]> => {
        if (isTauri()) {
            return await invoke<Package[]>("get_packages", { projectPath });
        } else {
            console.warn("Running in Web Mode: returning mock packages");
            await new Promise(r => setTimeout(r, 800));
            return MOCK_PACKAGES;
        }
    },

    updatePackage: async (projectPath: string, packageName: string, version: string): Promise<void> => {
        if (isTauri()) {
            return await invoke<void>("update_package", { projectPath, packageName, version });
        } else {
            console.warn(`Running in Web Mode: Simulating update for ${packageName}@${version}`);
            await new Promise(r => setTimeout(r, 2000)); // Simulate mock install time
            // In a real mock scenario, we might want to update MOCK_PACKAGES here
            return;
        }
    }
};
