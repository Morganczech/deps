import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Project, Package } from "./types";
import { Terminal } from "./components/Terminal";
import { PackageTable } from "./components/PackageTable";
import { PackageDetails } from "./components/PackageDetails";
import { ConfirmationModal } from "./components/ConfirmationModal";
import { VersionInputModal } from "./components/VersionInputModal";
import { Toast } from "./components/Toast";
import { EmptyWorkspace } from "./components/EmptyWorkspace";
import { api } from "./lib/api";
import { texts } from "./i18n/texts";
import "./App.css";

function App() {
    const [workspacePath, setWorkspacePath] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProject, setActiveProject] = useState<Project | null>(null);
    const [packages, setPackages] = useState<Package[]>([]);
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'success' | 'error'>('success');
    const [lastUpdatedPackage, setLastUpdatedPackage] = useState<string | null>(null);

    // Update Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isInputModalOpen, setIsInputModalOpen] = useState(false);
    const [packageToUpdate, setPackageToUpdate] = useState<Package | null>(null);
    const [targetVersion, setTargetVersion] = useState("");
    const [customWarning, setCustomWarning] = useState<string | null>(null);

    const [showTerminal, setShowTerminal] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [terminalOutput, setTerminalOutput] = useState<string[]>(["> Ready."]);

    // Load last workspace on mount
    useEffect(() => {
        const loadWorkspace = async () => {
            const lastPath = await api.getLastWorkspace();
            if (lastPath) {
                setWorkspacePath(lastPath);
                await handleScanWorkspace(lastPath);
            }
        };
        loadWorkspace();
    }, []);

    const handleScanWorkspace = async (path: string) => {
        setIsScanning(true);
        setProjects([]);
        setActiveProject(null);
        setError(null);

        try {
            const result = await api.scanProjects(path);
            setProjects(result);
            if (result.length > 0) setActiveProject(result[0]);
        } catch (e) {
            console.error("Failed to scan projects:", e);
            setError(typeof e === 'string' ? e : "Failed to scan projects");
        } finally {
            setIsScanning(false);
        }
    };

    const handleOpenFolder = async () => {
        try {
            const selected = await api.selectFolder();

            if (selected) {
                setWorkspacePath(selected);
                await api.saveWorkspace(selected);
                await handleScanWorkspace(selected);
            }
        } catch (e) {
            console.error("Failed to open folder", e);
            setError(typeof e === 'string' ? e : "Failed to open folder");
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
        setCustomWarning(null); // standard update
        setIsModalOpen(true);
    };

    const handleInstallSpecific = (pkg: Package) => {
        setPackageToUpdate(pkg);
        setIsInputModalOpen(true);
    };

    const compareVersions = (v1: string, v2: string) => {
        // Remove 'v' prefix or similar if present, though we expect clean semver
        const cleanV1 = v1.replace(/[^0-9.]/g, '');
        const cleanV2 = v2.replace(/[^0-9.]/g, '');
        const p1 = cleanV1.split('.').map(Number);
        const p2 = cleanV2.split('.').map(Number);
        for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
            const n1 = p1[i] || 0;
            const n2 = p2[i] || 0;
            if (n1 > n2) return 1;
            if (n1 < n2) return -1;
        }
        return 0;
    };

    const handleVersionInputConfirm = (version: string) => {
        setIsInputModalOpen(false);
        setTargetVersion(version);

        // Downgrade Check
        if (packageToUpdate && compareVersions(version, packageToUpdate.current_version) < 0) {
            setCustomWarning(texts.states.downgradeWarning);
        } else {
            setCustomWarning(null);
        }

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
            setToastType('success');
            setToastMessage("Update completed");
            setLastUpdatedPackage(packageToUpdate.name);

            // Refresh logic
            fetchPackages(activeProject);

        } catch (e) {
            const endTimestamp = new Date().toLocaleTimeString();
            const errMsg = typeof e === 'string' ? e : "Unknown error during update";
            setTerminalOutput(prev => [...prev, `[${endTimestamp}] ❌ Error: ${errMsg}`]);
            setToastType('error');
            setToastMessage("Update failed");
            setShowTerminal(true); // Automaticky otevře terminál při chybě
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
                {!workspacePath ? (
                    <EmptyWorkspace onSelectWorkspace={handleOpenFolder} />
                ) : isScanning ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Scanning projects...</p>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="empty-project-state">
                        <div className="empty-content">
                            <h3>No Node.js Projects Found</h3>
                            <p>No package.json files found in {workspacePath}</p>
                            <button className="btn-secondary" onClick={handleOpenFolder}>
                                Select Different Folder
                            </button>
                        </div>
                    </div>
                ) : activeProject ? (
                    <div className="project-view">
                        <header className="project-header">
                            <h2>{activeProject.name}</h2>
                            <span className="project-version">v{activeProject.version}</span>
                            {!activeProject.is_writable && (
                                <span className="badge-readonly" title={texts.app.readOnlyTooltip}>
                                    {texts.app.readOnly}
                                </span>
                            )}
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
                                        isReadOnly={!activeProject.is_writable}
                                        onUpdate={handleUpdateClick}
                                        onInstallSpecific={handleInstallSpecific}
                                        onReadOnlyWarning={() => setToastMessage(texts.app.readOnlyTooltip)}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                ) : null}
            </main>
            <Terminal
                isVisible={showTerminal}
                output={terminalOutput}
                onToggle={() => {/* Toggle handled internally in Terminal */ }}
            />
            <ConfirmationModal
                isOpen={isModalOpen}
                packageToUpdate={packageToUpdate}
                targetVersion={targetVersion}
                customWarning={customWarning}
                onConfirm={handleConfirmUpdate}
                onCancel={() => setIsModalOpen(false)}
            />
            <VersionInputModal
                isOpen={isInputModalOpen}
                packageName={packageToUpdate?.name || ""}
                onConfirm={handleVersionInputConfirm}
                onCancel={() => setIsInputModalOpen(false)}
            />
            <Toast
                message={toastMessage}
                type={toastType}
                onClose={() => setToastMessage(null)}
                onShowOutput={() => setShowTerminal(true)}
            />
        </div>
    );
}

export default App;
