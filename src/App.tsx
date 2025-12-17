import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Project, Package } from "./types";
import { Terminal } from "./components/Terminal";
import { PackageTable } from "./components/PackageTable";
import { PackageDetails } from "./components/PackageDetails";
import { api } from "./lib/api";
import { texts } from "./i18n/texts";
import "./App.css";

function App() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProject, setActiveProject] = useState<Project | null>(null);
    const [packages, setPackages] = useState<Package[]>([]);
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showTerminal, setShowTerminal] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [terminalOutput, _setTerminalOutput] = useState<string[]>(["> Ready."]);

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
                                    />
                                    <PackageDetails pkg={selectedPackage} />
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
        </div>
    );
}

export default App;
