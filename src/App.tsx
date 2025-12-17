import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/dialog";
import { Sidebar } from "./components/Sidebar";
import { Project, Package } from "./types";
import { Terminal } from "./components/Terminal";
import { PackageTable } from "./components/PackageTable";
import { PackageDetails } from "./components/PackageDetails";
import "./App.css";

function App() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProject, setActiveProject] = useState<Project | null>(null);
    const [packages, setPackages] = useState<Package[]>([]);
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

    const [showTerminal, setShowTerminal] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [terminalOutput, _setTerminalOutput] = useState<string[]>(["> Ready."]);

    const handleOpenFolder = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                recursive: false,
            });

            if (selected && typeof selected === "string") {
                const result = await invoke<Project[]>("scan_projects", { rootPath: selected });
                setProjects(result);
                if (result.length > 0) setActiveProject(result[0]);
            }
        } catch (e) {
            console.error("Failed to open folder", e);
        }
    };

    useEffect(() => {
        if (activeProject) {
            // Fetch packages for the active project
            invoke<Package[]>("get_packages", { projectPath: activeProject.path })
                .then((pkgs) => {
                    setPackages(pkgs);
                    if (pkgs.length > 0) setSelectedPackage(pkgs[0]);
                })
                .catch(console.error);
        }
    }, [activeProject]);

    return (
        <div className="app-container">
            <Sidebar
                projects={projects}
                activeProject={activeProject}
                onSelectProject={setActiveProject}
                onOpenFolder={handleOpenFolder}
            />
            <main className="main-content">
                {activeProject ? (
                    <div className="project-view">
                        <header className="project-header">
                            <h2>{activeProject.name}</h2>
                            <span className="project-version">v{activeProject.version}</span>
                        </header>
                        <div className="content-split">
                            <PackageTable
                                packages={packages}
                                selectedPackage={selectedPackage}
                                onSelect={setSelectedPackage}
                            />
                            <PackageDetails pkg={selectedPackage} />
                        </div>
                    </div>
                ) : (
                    <div className="empty-state">
                        <h1>Welcome to Deps</h1>
                        <p>Open a folder containing Node.js projects to get started.</p>
                        <button onClick={handleOpenFolder}>Select Folder</button>
                    </div>
                )}
            </main>
            <Terminal
                isVisible={showTerminal}
                output={terminalOutput}
                onClose={() => setShowTerminal(false)}
            />
        </div>
    );
}

export default App;
