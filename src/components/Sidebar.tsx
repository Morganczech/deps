import React from 'react';
import { Project } from '../types';
import { texts } from '../i18n/texts';
import './Sidebar.css';

interface SidebarProps {
    projects: Project[];
    activeProject: Project | null;
    onSelectProject: (p: Project) => void;
    onOpenFolder: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    projects,
    activeProject,
    onSelectProject,
    onOpenFolder
}) => {
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="sidebar-controls">
                    <button
                        className="btn-icon btn-toggle"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isCollapsed ? '»' : '«'}
                    </button>
                </div>
                <button
                    onClick={onOpenFolder}
                    className="btn-icon btn-open-folder"
                    title={texts.sidebar.openFolder}
                >
                    <span className="icon">📂</span>
                    {!isCollapsed && <span className="label">{texts.sidebar.openFolder}</span>}
                </button>
            </div>

            <div className="sidebar-section">
                {!isCollapsed && <h3>{texts.sidebar.projectsHeader}</h3>}
                <ul className="project-list">
                    {projects.map((p) => (
                        <li
                            key={p.path}
                            className={`project-item ${activeProject?.path === p.path ? 'active' : ''}`}
                            onClick={() => onSelectProject(p)}
                            title={isCollapsed ? p.name : undefined}
                        >
                            <span className="project-icon">📦</span>
                            {!isCollapsed && (
                                <div className="project-info">
                                    <span className="project-name">{p.name}</span>
                                    <span className="project-path">{p.path.split('/').pop()}</span>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </aside>
    );
};
