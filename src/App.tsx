import React, { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { listen } from '@tauri-apps/api/event';

import { Sidebar } from "./components/Sidebar";
import { Project, Package, GlobalSearchResult } from "./types";
import { Terminal } from "./components/Terminal";
import { PackageTable } from "./components/PackageTable";
import { PackageDetails } from "./components/PackageDetails";
import { ConfirmationModal } from "./components/ConfirmationModal";
import { VersionInputModal } from "./components/VersionInputModal";
import { Toast } from "./components/Toast";
import { EmptyWorkspace } from "./components/EmptyWorkspace";
import { AuditModal } from "./components/AuditModal";
import { GlobalSearchResults } from "./components/GlobalSearchResults";
import { api } from "./lib/api";
import "./App.css";

// Global watcher unlisten function (unused, removed)

function App() {
    const { t } = useTranslation();
    const [workspacePath, setWorkspacePath] = useState<string | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProject, setActiveProject] = useState<Project | null>(null);
    const [packages, setPackages] = useState<Package[]>([]);
    const [filteredPackages, setFilteredPackages] = useState<Package[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Missing state restored
    const [isUpdating, setIsUpdating] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [isAuditFixing, setIsAuditFixing] = useState(false);
    const [packageToUpdate, setPackageToUpdate] = useState<Package | null>(null);
    const [targetVersion, setTargetVersion] = useState<string>("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isInputModalOpen, setIsInputModalOpen] = useState(false);
    const [customWarning, setCustomWarning] = useState<string | null>(null);
    const [showTerminal, setShowTerminal] = useState(false);
    const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
    const [lastHistoryUpdate, setLastHistoryUpdate] = useState<number>(0);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Global Search State
    const [searchScope, setSearchScope] = useState<'current' | 'all'>('current');
    const [globalResults, setGlobalResults] = useState<GlobalSearchResult[]>([]);
    const [isGlobalSearching, setIsGlobalSearching] = useState(false);
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
            // fixed potential missing property from previous usage if any, but type seems correct from view_file
        };
        vulnerable_packages: Array<{
            name: string;
            severity: string;
            title: string;
            range: string;
        }>;
    } | null>(null);


    // Load packages function
    const loadPackages = async (projectPath: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const pkgs = await api.getPackages(projectPath);
            setPackages(pkgs);
            // Default filtering to all
            setFilteredPackages(pkgs);
        } catch (e) {
            console.error("Failed to load packages", e);
            setError(typeof e === 'string' ? e : "Failed to load packages");
        } finally {
            setIsLoading(false);
        }
    };


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

    // Watch project file changes
    useEffect(() => {
        let unlistenFileChange: Promise<() => void> | null = null;

        const setupWatcher = async () => {
            if (activeProject) {
                try {
                    await api.watchProject(activeProject.path);
                    unlistenFileChange = listen('project-file-change', () => {
                        // Debounce is good, but simple refresh is fine for now
                        console.log("File changed, refreshing...");
                        refreshCurrentProject();
                        setToastMessage("Project updated externally");
                        setToastType('info');
                    });
                } catch (e) {
                    console.error("Failed to start watcher", e);
                }
            }
        };

        setupWatcher();

        return () => {
            if (activeProject) {
                api.unwatchProject().catch(console.error);
            }
            if (unlistenFileChange) {
                unlistenFileChange.then(f => f());
            }
        };
    }, [activeProject?.path]);

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



    const handleAuditFix = async () => {
        if (!activeProject) return;

        // Close modal so user can see terminal
        setIsAuditOpen(false);
        setIsAuditFixing(true);
        setShowTerminal(true);
        const timestamp = new Date().toLocaleTimeString();
        setTerminalOutput(prev => [...prev, `[${timestamp}] > npm audit fix`]);

        try {
            await api.auditFix(activeProject.path);

            setTerminalOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✅ Audit fix completed.`]);
            setToastType('success');
            setToastMessage("Audit fix completed");

            // Re-run audit to see results
            handleRunAudit();
        } catch (e) {
            console.error("Audit fix failed", e);
            setToastType('error');
            setToastMessage("Audit fix failed");
            setTerminalOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Audit fix failed: ${e}`]);
        } finally {
            setIsAuditFixing(false);
        }
    };

    // We don't expose fetchPackages directly anymore to avoid race conditions.
    // Instead we rely on the useEffect below reacting to activeProject changes.

    // Unified fetch logic with cancellation via useEffect
    // Track previous packages for detection
    const previousPackagesRef = React.useRef<Package[]>([]);

    useEffect(() => {
        let isCurrent = true;
        let timer: ReturnType<typeof setTimeout>;

        if (activeProject) {
            // Debounce to prevent double-firing
            timer = setTimeout(() => {
                setIsLoading(true);
                setError(null);
                setSearchQuery(""); // Reset search on project switch (optional, maybe keep it?)
                // Actually, reseting search on refresh is annoying if filtering.
                // Let's NOT reset search query here if we are just refreshing data.
                // But this effect runs on activeProject change too.
                // We can't distinguish easy.

                // Let's allow search query persistence?
                // The issue: "refreshCurrentProject" triggers this.
                // If I switch project, activeProject changes.
                // If I refresh, activeProject object reference might change if I update it? 
                // refreshCurrentProject updates `refreshTrigger`.

                // Let's reset search only if project path changed.
                // But here we rely on activeProject dependency.

                api.getPackages(activeProject.path)
                    .then(async (pkgs) => {
                        if (isCurrent) {
                            // DETECTION LOGIC
                            // If we are NOT updating/installing via UI, check for changes
                            if (!isUpdating && !isInstalling && previousPackagesRef.current.length > 0) {
                                for (const newPkg of pkgs) {
                                    const oldPkg = previousPackagesRef.current.find(p => p.name === newPkg.name);
                                    if (oldPkg && oldPkg.current_version !== newPkg.current_version) {
                                        // Version changed externally!
                                        console.log(`Detected external change for ${newPkg.name}: ${oldPkg.current_version} -> ${newPkg.current_version}`);

                                        // Save history
                                        // We assume it is 'external' type
                                        try {
                                            await api.savePackageHistory(activeProject.path, newPkg.name, {
                                                type: 'external',
                                                from: oldPkg.current_version,
                                                to: newPkg.current_version,
                                                date: new Date().toISOString()
                                            });
                                            setLastHistoryUpdate(Date.now());
                                        } catch (e) {
                                            console.error("Failed to save external history", e);
                                        }
                                    }
                                }
                            }

                            previousPackagesRef.current = pkgs;
                            setPackages(pkgs);

                            setSelectedPackage(prev => {
                                if (prev) {
                                    const found = pkgs.find(p => p.name === prev.name);
                                    if (found) return found;
                                }
                                return pkgs.length > 0 ? pkgs[0] : null;
                            });
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

    useEffect(() => {
        if (!activeProject && projects.length > 0) {
            // Only auto-select if we are not in global search mode navigating to a result
            if (searchScope === 'current') {
                setActiveProject(projects[0]);
            }
        }
    }, [projects, activeProject, searchScope]);

    useEffect(() => {
        if (activeProject && searchScope === 'current') {
            loadPackages(activeProject.path);
        }
    }, [activeProject, searchScope]);

    // Search Logic (Local + Global)
    useEffect(() => {
        if (searchScope === 'current') {
            // Local Filtering
            if (!searchQuery.trim()) {
                setFilteredPackages(packages);
            } else {
                const lower = searchQuery.toLowerCase();
                setFilteredPackages(packages.filter(p => p.name.toLowerCase().includes(lower)));
            }
        } else {
            // Global Search Debounce
            const timer = setTimeout(async () => {
                if (!searchQuery.trim()) {
                    setGlobalResults([]);
                    return;
                }

                setIsGlobalSearching(true);
                setGlobalResults([]); // Clear previous

                try {
                    // Iterate all projects and fetch packages
                    // Note: This matches the plan but could be optimized with caching later
                    const lowerQuery = searchQuery.toLowerCase();

                    // We run these in parallel-ish results
                    const promises = projects.map(async (proj) => {
                        try {
                            const projPkgs = await api.getPackages(proj.path);
                            const matches = projPkgs.filter(p => p.name.toLowerCase().includes(lowerQuery));
                            return matches.map(pkg => ({ project: proj, package: pkg }));
                        } catch (e) {
                            console.error(`Failed to search in ${proj.name}`, e);
                            return [];
                        }
                    });

                    const results = await Promise.all(promises);
                    const flatResults = results.flat();
                    setGlobalResults(flatResults);

                } catch (e) {
                    console.error("Global search failed", e);
                } finally {
                    setIsGlobalSearching(false);
                }

            }, 500); // 500ms debounce

            return () => clearTimeout(timer);
        }
    }, [searchQuery, packages, searchScope, projects]);

    const handleSelectGlobalResult = (project: Project, pkg: Package) => {
        // Switch context to that project
        setSearchScope('current'); // Switch back to 'current' scope
        setActiveProject(project); // Set active project (triggers loadPackages)

        // We need to wait for packages to load to select it? 
        // Actually loadPackages runs on activeProject change.
        // We can optimistically set selectedPackage, but it might get overwritten or not found if load fails.
        // Better: Pre-select it after load? 
        // For now, let's just switch project and try to set selectedPackage. 
        // Since loadPackages is async, we might need a refined approach, 
        // but let's try setting it immediately. 
        // If loadPackages replaces `packages` state, we just need to ensure `selectedPackage` isn't lost if it exists there.
        // However, `loadPackages` doesn't clear `selectedPackage` explicitly unless logic dictates.

        // Let's set a "pending selection" or just set it. 
        // If the packages list reloads, we need to make sure we find *this* package object from the new list 
        // so object identity matches if we use referential checks, or just use ID/Name check.
        // Our PackageDetails uses `selectedPackage` object.

        // Force the package into the view:
        setSelectedPackage(pkg);
        setSearchQuery(pkg.name); // Filter the list to show just this package so user sees context
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
            setCustomWarning(t('project.downgradeWarning'));
        } else {
            setCustomWarning(null);
        }

        setIsModalOpen(true);
    };



    const saveHistoryEntry = async (pkgName: string, type: 'upgrade' | 'downgrade' | 'rollback', from: string, to: string) => {
        if (!activeProject) return;
        try {
            await api.savePackageHistory(activeProject.path, pkgName, {
                type,
                from,
                to,
                date: new Date().toISOString()
            });
            setLastHistoryUpdate(Date.now());
        } catch (e) {
            console.error("Failed to save history", e);
        }
    };

    const handleRollback = async (version: string) => {
        if (!selectedPackage) return;
        // Reuse the update flow but mark as rollback
        setPackageToUpdate(selectedPackage);
        setTargetVersion(version);
        // We can use a different modal or just confirm. 
        // Spec says "Rollback je jedno-klikový" (one-click).
        // So NO modal.

        handleConfirmUpdate(true, version);
    };

    // Modified to accept 'isRollback' override
    const handleConfirmUpdate = async (isRollback: boolean = false, rollbackVersion?: string) => {
        if (!packageToUpdate || !activeProject) return;

        // If rollback, we might not have isModalOpen true, so we don't need to close it.
        if (!isRollback) setIsModalOpen(false);

        setShowTerminal(true);
        setIsUpdating(true);

        const versionToInstall = isRollback && rollbackVersion ? rollbackVersion : targetVersion;
        const pkg = packageToUpdate;

        const timestamp = new Date().toLocaleTimeString();
        const cmd = `[${timestamp}] > npm install ${pkg.name}@${versionToInstall}`;
        setTerminalOutput(prev => [...prev, cmd, `[${timestamp}] ${isRollback ? t('terminal.startingRollback') : t('terminal.startingUpdate')}...`]);

        setToastType('info');
        setToastMessage(isRollback
            ? t('toast.rollingBack', { name: pkg.name, version: versionToInstall })
            : t('toast.updating', { name: pkg.name, version: versionToInstall })
        );

        try {
            await api.updatePackage(activeProject.path, pkg.name, versionToInstall);

            const endTimestamp = new Date().toLocaleTimeString();
            setTerminalOutput(prev => [...prev, `[${endTimestamp}] ✅ ${isRollback ? t('terminal.rollbackSuccess') : t('terminal.updateSuccess')}`]);
            setToastType('success');
            setToastMessage(isRollback ? t('toast.rollbackCompleted') : t('toast.updateCompleted'));
            setLastUpdatedPackage(pkg.name);

            // Save History
            const fromVer = pkg.current_version;
            const toVer = versionToInstall;
            let type: 'upgrade' | 'downgrade' | 'rollback' = isRollback ? 'rollback' : 'upgrade';

            if (!isRollback) {
                // Detect upgrade vs downgrade
                if (compareVersions(toVer, fromVer) < 0) type = 'downgrade';
            }

            await saveHistoryEntry(pkg.name, type, fromVer, toVer);

            // Refresh logic
            refreshCurrentProject();

        } catch (e) {
            const endTimestamp = new Date().toLocaleTimeString();
            const errMsg = typeof e === 'string' ? e : "Unknown error";
            setTerminalOutput(prev => [...prev, `[${endTimestamp}] ❌ ${t('terminal.error')}: ${errMsg}`]);
            setToastType('error');
            setToastMessage(t('toast.failed'));
            setShowTerminal(true);
            console.error(e);
        } finally {
            setIsUpdating(false);
        }
    };

    // ... (rest of App)

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
                                    <span className="badge-readonly" title={t('project.readOnly')}>
                                        {t('project.readOnly')}
                                    </span>
                                )}
                                {!activeProject.has_node_modules && (
                                    <>
                                        <span className="dependency-warning" title="node_modules folder not found">
                                            ⚠ {t('project.dependenciesNotInstalled')}
                                        </span>
                                        <button
                                            className="btn-primary btn-install"
                                            onClick={handleInstallDependencies}
                                            disabled={!activeProject.is_writable || isInstalling}
                                            title={!activeProject.is_writable ? t('project.readOnly') : "Runs npm install in the project directory"}
                                        >
                                            {isInstalling ? (
                                                <>
                                                    <span className="spinner-small"></span>
                                                    {t('project.installing')}
                                                </>
                                            ) : t('project.installDependencies')}
                                        </button>
                                    </>
                                )}
                                {activeProject.has_node_modules && (
                                    <button
                                        className="btn-text btn-audit"
                                        onClick={handleRunAudit}
                                        title={t('app.audit')}
                                    >
                                        🛡️ {t('app.audit')}
                                    </button>
                                )}
                            </header>
                            <div className="content-split">
                                <div className="filter-bar">
                                    <div className="search-container">
                                        <input
                                            type="text"
                                            className="search-input"
                                            placeholder={t('app.searchPlaceholder')}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            autoFocus
                                        />
                                        <div className="scope-switch">
                                            <button
                                                className={`scope-btn ${searchScope === 'current' ? 'active' : ''}`}
                                                onClick={() => setSearchScope('current')}
                                                title={t('app.searchScope.switchCurrent')}
                                            >
                                                {t('app.searchScope.current')}
                                            </button>
                                            <button
                                                className={`scope-btn ${searchScope === 'all' ? 'active' : ''}`}
                                                onClick={() => setSearchScope('all')}
                                                title={t('app.searchScope.switchAll')}
                                            >
                                                {t('app.searchScope.all')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {searchScope === 'all' ? (
                                    /* Global Search View */
                                    <div className="global-search-wrapper">
                                        {isGlobalSearching ? (
                                            <div className="loading-state">
                                                <div className="spinner"></div>
                                                <p>{t('app.search.searchingAll')}</p>
                                            </div>
                                        ) : (
                                            <GlobalSearchResults
                                                results={globalResults}
                                                onSelect={handleSelectGlobalResult}
                                                searchQuery={searchQuery}
                                            />
                                        )}
                                    </div>
                                ) : (
                                    /* Local Project View */
                                    <>
                                        {isLoading ? (
                                            <div className="loading-state">
                                                <div className="spinner"></div>
                                                <p>{t('app.loading')}</p>
                                            </div>
                                        ) : error ? (
                                            <div className="error-state">
                                                <h3>{t('app.errorHeader')}</h3>
                                                <p className="error-message">{error}</p>
                                                <button className="btn-secondary" onClick={() => activeProject && refreshCurrentProject()}>
                                                    {t('app.retry')}
                                                </button>
                                            </div>
                                        ) : packages.length === 0 ? (
                                            <div className="empty-project-state">
                                                <div className="empty-content">
                                                    <h3>{t('project.noDependenciesHeader')}</h3>
                                                    <p>{t('project.noDependenciesMessage')}</p>
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
                                                    projectPath={activeProject?.path || ""}
                                                    isUpdating={isUpdating}
                                                    isReadOnly={!activeProject.is_writable}
                                                    lastUpdated={lastHistoryUpdate}
                                                    onUpdate={handleUpdateClick}
                                                    onInstallSpecific={handleInstallSpecific}
                                                    onRollback={handleRollback}
                                                    onReadOnlyWarning={() => setToastMessage(t('project.readOnly'))}
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div >
                    ) : null
                    }
                </main >
            </div >
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
                onConfirm={() => handleConfirmUpdate(false)}
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
                onFix={handleAuditFix}
                isFixing={isAuditFixing}
                directDependencies={new Set(packages.map(p => p.name))}
                onSelectPackage={(pkgName) => {
                    setSearchQuery(pkgName); // Filter to find it easily
                    // We can also try to select it directly if it exists in filtered list
                    const found = packages.find(p => p.name === pkgName);
                    if (found) setSelectedPackage(found);
                    setIsAuditOpen(false);
                }}
            />
            <Toast
                message={toastMessage}
                type={toastType}
                onClose={() => setToastMessage(null)}
                onShowOutput={!showTerminal ? () => setShowTerminal(true) : undefined}
                onAction={
                    toastType === 'error' && toastMessage === "Update failed"
                        ? () => handleConfirmUpdate(false)
                        : undefined
                }
                actionLabel="Retry"
            />
        </div >
    );
}

export default App;
