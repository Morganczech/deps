import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Project, Package } from "./types";
import { Terminal } from "./components/Terminal";
import { PackageTable } from "./components/PackageTable";
import { PackageDetails } from "./components/PackageDetails";
import { ConfirmationModal } from "./components/ConfirmationModal";
import { Toast } from "./components/Toast";
import { api } from "./lib/api";
import { texts } from "./i18n/texts";
import "./App.css";

function App() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProject, setActiveProject] = useState<Project | null>(null);
    const [packages, setPackages] = useState<Package[]>([]);
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [lastUpdatedPackage, setLastUpdatedPackage] = useState<string | null>(null);

    // Update Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [packageToUpdate, setPackageToUpdate] = useState<Package | null>(null);
    const [targetVersion, setTargetVersion] = useState("");

    const [showTerminal, setShowTerminal] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [terminalOutput, setTerminalOutput] = useState<string[]>(["> Ready."]);

    const handleOpenFolder = async () => {
        try {
            const selected = await api.selectFolder();

            if (selected) {
                const result = await api.scanProjects(selected);
                setProjects(result);
                if (result.length > 0) setActiveProject(result[0]);
            }
        } catch (e) {
            console.error("Failed to open folder", e);
        }
    };

    const fetchPackages = (project: Project) => {
        setIsLoading(true);
        setError(null);
        setPackages([]);
        setSelectedPackage(null);

        api.getPackages(project.path)
            .then((pkgs) => {
                setPackages(pkgs);
                if (pkgs.length > 0) setSelectedPackage(pkgs[0]);
            })
            .catch((err) => {
                console.error(err);
                setError(typeof err === 'string' ? err : "Failed to load packages");
            })
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        if (activeProject) {
            fetchPackages(activeProject);
        }
    }, [activeProject]);

    const handleProjectSelect = (p: Project) => {
        if (activeProject?.path === p.path) {
            // Refresh if clicking active
            fetchPackages(p);
        } else {
            setActiveProject(p);
        }
    };

    const handleUpdateClick = (pkg: Package, version: string) => {
        setPackageToUpdate(pkg);
        setTargetVersion(version);
        setIsModalOpen(true);
    };

    const handleConfirmUpdate = async () => {
        if (!packageToUpdate || !activeProject) return;

        setIsModalOpen(false);
        setShowTerminal(true);
        setIsUpdating(true);

        const timestamp = new Date().toLocaleTimeString();
        const cmd = `[${timestamp}] > npm install ${packageToUpdate.name}@${targetVersion}`;
        setTerminalOutput(prev => [...prev, cmd, `[${timestamp}] Starting update...`]);

        try {
            await api.updatePackage(activeProject.path, packageToUpdate.name, targetVersion);

            const endTimestamp = new Date().toLocaleTimeString();
            setTerminalOutput(prev => [...prev, `[${endTimestamp}] ✅ Update completed successfully.`]);
            setToastMessage("Update completed");
            setLastUpdatedPackage(packageToUpdate.name);

            // Refresh logic
            fetchPackages(activeProject);

        } catch (e) {
            const endTimestamp = new Date().toLocaleTimeString();
            const errMsg = typeof e === 'string' ? e : "Unknown error during update";
            setTerminalOutput(prev => [...prev, `[${endTimestamp}] ❌ Error: ${errMsg}`]);
            console.error(e);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="app-container">
            <Sidebar
                projects={projects}
                activeProject={activeProject}
                onSelectProject={handleProjectSelect}
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
                            {isLoading ? (
                                <div className="loading-state">
                                    <div className="spinner"></div>
                                    <p>{texts.states.loading}</p>
                                </div>
                            ) : error ? (
                                <div className="error-state">
                                    <h3>{texts.states.errorHeader}</h3>
                                    <p className="error-message">{error}</p>
                                    {error.includes("npm install") && (
                                        <div className="error-actions">
                                            <p className="hint">{texts.states.nodeModulesMissing}</p>
                                            <button className="btn-primary" onClick={() => alert(texts.states.installHint)}>
                                                {texts.states.installDependencies}
                                            </button>
                                        </div>
                                    )}
                                    <button className="btn-secondary" onClick={() => activeProject && fetchPackages(activeProject)}>
                                        {texts.app.retry}
                                    </button>
                                </div>
                            ) : packages.length === 0 ? (
                                <div className="empty-project-state">
                                    <div className="empty-content">
                                        <h3>{texts.states.noDependenciesHeader}</h3>
                                        <p>{texts.states.noDependenciesMessage}</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <PackageTable
                                        packages={packages}
                                        selectedPackage={selectedPackage}
                                        onSelect={setSelectedPackage}
                                        lastUpdatedPackage={lastUpdatedPackage}
                                    />
                                    <PackageDetails
                                        pkg={selectedPackage}
                                        isUpdating={isUpdating}
                                        onUpdate={handleUpdateClick}
                                    />
                                </>
                            )}
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
            <ConfirmationModal
                isOpen={isModalOpen}
                packageToUpdate={packageToUpdate}
                targetVersion={targetVersion}
                onConfirm={handleConfirmUpdate}
                onCancel={() => setIsModalOpen(false)}
            />
            <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
        </div>
    );
}

export default App;
