import { useState, useEffect } from "react";
import { listen } from '@tauri-apps/api/event';

// We don't expose fetchPackages directly anymore...
import { Sidebar } from "./components/Sidebar";
import { Project, Package } from "./types";
import { Terminal } from "./components/Terminal";
import { PackageTable } from "./components/PackageTable";
import { PackageDetails } from "./components/PackageDetails";
import { ConfirmationModal } from "./components/ConfirmationModal";
import { VersionInputModal } from "./components/VersionInputModal";
import { Toast } from "./components/Toast";
import { EmptyWorkspace } from "./components/EmptyWorkspace";
import { AuditModal } from "./components/AuditModal";
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
    const [isInstalling, setIsInstalling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
    const [lastUpdatedPackage, setLastUpdatedPackage] = useState<string | null>(null);

    // Audit State
    const [isAuditOpen, setIsAuditOpen] = useState(false);
    const [isAuditing, setIsAuditing] = useState(false);
    const [auditResult, setAuditResult] = useState<{
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
    } | null>(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");

    const filteredPackages = packages.filter(pkg =>
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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

    // Listen for npm install output events
    useEffect(() => {
        const unlisten = listen<string>('npm-install-output', (event) => {
            setTerminalOutput(prev => [...prev, event.payload]);
        });

        return () => {
            unlisten.then(f => f());
        };
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

    const handleInstallDependencies = async () => {
        if (!activeProject) return;

        setIsInstalling(true);
        setShowTerminal(true);

        const timestamp = new Date().toLocaleTimeString();
        // Clear terminal or separate entries? Separator is better.
        setTerminalOutput(prev => [...prev, `[${timestamp}] > npm install in ${activeProject.name}`]);

        try {
            await api.installDependencies(activeProject.path);

            const endTimestamp = new Date().toLocaleTimeString();
            setTerminalOutput(prev => [...prev, `[${endTimestamp}] ✅ Dependencies installed successfully.`]);
            setToastType('success');
            setToastMessage("Dependencies installed");

            // Refresh project to update has_node_modules
            const result = await api.scanProjects(workspacePath!);
            const updated = result.find(p => p.path === activeProject.path);
            if (updated) {
                setProjects(result);
                setActiveProject(updated);
            }
        } catch (e) {
            const endTimestamp = new Date().toLocaleTimeString();
            const errMsg = typeof e === 'string' ? e : "Unknown error during install";
            setTerminalOutput(prev => [...prev, `[${endTimestamp}] ❌ Error: ${errMsg}`]);
            setToastType('error');
            setToastMessage("Install failed");
            console.error(e);
        } finally {
            setIsInstalling(false);
        }
    };

    const handleRunAudit = async () => {
        if (!activeProject) return;

        setIsAuditOpen(true);
        setIsAuditing(true);
        setAuditResult(null);

        try {
            const result = await api.runAudit(activeProject.path);
            setAuditResult(result);
        } catch (e) {
            console.error("Audit failed", e);
            // Error handling handled by modal empty state or we can show toast
            setToastType('error');
            setToastMessage("Audit failed (check console)");
        } finally {
            setIsAuditing(false);
        }
    };

    // We don't expose fetchPackages directly anymore to avoid race conditions.
    // Instead we rely on the useEffect below reacting to activeProject changes.

    // Unified fetch logic with cancellation via useEffect
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        let isCurrent = true;
        let timer: ReturnType<typeof setTimeout>;

        if (activeProject) {
            // Debounce to prevent double-firing in StrictMode and rapid clicks
            timer = setTimeout(() => {
                setIsLoading(true);
                setError(null);
                setPackages([]);
                setSearchQuery(""); // Reset search on project switch
                setSelectedPackage(null);

                // Fetch packages for the active project
                api.getPackages(activeProject.path)
                    .then((pkgs) => {
                        if (isCurrent) {
                            setPackages(pkgs);
                            if (pkgs.length > 0) setSelectedPackage(pkgs[0]);
                            setIsLoading(false);
                        }
                    })
                    .catch((err) => {
                        if (isCurrent) {
                            console.error(err);
                            setError(typeof err === 'string' ? err : "Failed to load packages");
                            setIsLoading(false);
                        }
                    });
            }, 100);
        }

        return () => {
            isCurrent = false;
            if (timer) clearTimeout(timer);
        };
    }, [activeProject, refreshTrigger]);

    // Helper to force refresh for current project
    const refreshCurrentProject = () => {
        setRefreshTrigger(t => t + 1);
    };

    const handleProjectSelect = (p: Project) => {
        if (activeProject?.path === p.path) {
            // Refresh if clicking active
            refreshCurrentProject();
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

        // Immediate feedback
        setToastType('info');
        setToastMessage(`Updating ${packageToUpdate.name} to ${targetVersion}...`);

        try {
            await api.updatePackage(activeProject.path, packageToUpdate.name, targetVersion);

            const endTimestamp = new Date().toLocaleTimeString();
            setTerminalOutput(prev => [...prev, `[${endTimestamp}] ✅ Update completed successfully.`]);
            setToastType('success');
            setToastMessage("Update completed");
            setLastUpdatedPackage(packageToUpdate.name);

            // Refresh logic
            refreshCurrentProject();

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
            <div className="workspace-wrapper">
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
                                {!activeProject.has_node_modules && (
                                    <>
                                        <span className="dependency-warning" title="node_modules folder not found">
                                            ⚠ Dependencies not installed
                                        </span>
                                        <button
                                            className="btn-primary btn-install"
                                            onClick={handleInstallDependencies}
                                            disabled={!activeProject.is_writable || isInstalling}
                                            title={!activeProject.is_writable ? "Project is read-only. Cannot install dependencies." : "Runs npm install in the project directory"}
                                        >
                                            {isInstalling ? (
                                                <>
                                                    <span className="spinner-small"></span>
                                                    Installing dependencies...
                                                </>
                                            ) : "Install dependencies"}
                                        </button>
                                    </>
                                )}
                                {activeProject.has_node_modules && (
                                    <button
                                        className="btn-text btn-audit"
                                        onClick={handleRunAudit}
                                        title="Run Security Audit (npm audit)"
                                    >
                                        🛡️ Audit
                                    </button>
                                )}
                            </header>
                            <div className="content-split">
                                <div className="filter-bar">
                                    <input
                                        type="text"
                                        className="search-input"
                                        placeholder={texts.app.searchPlaceholder}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        autoFocus
                                    />
                                </div>
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
                                        <button className="btn-secondary" onClick={() => activeProject && refreshCurrentProject()}>
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
                                    <div className="main-split-view">
                                        <PackageTable
                                            packages={filteredPackages}
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
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </main>
            </div>
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
            <AuditModal
                isOpen={isAuditOpen}
                result={auditResult}
                isLoading={isAuditing}
                onClose={() => setIsAuditOpen(false)}
            />
            <Toast
                message={toastMessage}
                type={toastType}
                onClose={() => setToastMessage(null)}
                onShowOutput={() => setShowTerminal(true)}
                onAction={
                    toastType === 'error' && toastMessage === "Update failed"
                        ? handleConfirmUpdate
                        : undefined
                }
                actionLabel="Retry"
            />
        </div>
    );
}

export default App;
