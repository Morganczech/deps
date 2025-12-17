export const texts = {
    app: {
        title: "Deps",
        welcome: "Welcome to Deps",
        openFolderSort: "Open a folder containing Node.js projects to get started.",
        selectFolder: "Select Folder",
        reload: "Reload App",
        retry: "Retry",
        readOnly: "Read-only",
        readOnlyTooltip: "This project is read-only. Updates are disabled.",
    },
    sidebar: {
        openFolder: "Open Folder",
        projectsHeader: "PROJECTS",
    },
    table: {
        headers: {
            package: "PACKAGE",
            current: "CURRENT",
            wanted: "WANTED",
            latest: "LATEST",
            status: "STATUS",
        },
        badges: {
            major: "Major",
            minor: "Minor",
            upToDate: "Up to date",
        },
    },
    details: {
        empty: "Select a package to view details",
        majorWarning: "⚠️ Major update available. Potential breaking changes.",
        updateTo: "Update to",
        forceUpdate: "Force update to",
        links: {
            github: "GitHub",
            homepage: "Homepage",
            npm: "npm",
        },
        installSpecific: "Install specific version...",
    },
    states: {
        loading: "Scanning dependencies...",
        errorHeader: "⚠️ Error Loading Project",
        nodeModulesMissing: "It seems `node_modules` are missing.",
        installDependencies: "Install Dependencies",
        installHint: "Please run 'npm install' in your terminal.",
        noDependenciesHeader: "No Dependencies",
        noDependenciesMessage: "This project has no packages listed in package.json.",
        downgradeWarning: "⚠️ You are about to downgrade this package. This is risky.",
    }
};
