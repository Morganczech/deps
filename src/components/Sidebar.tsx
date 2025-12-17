import React from 'react';
import { Project } from '../types';
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
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <button onClick={onOpenFolder} className="btn-icon">
                    📂 Open Folder
                </button>
            </div>

            <div className="sidebar-section">
                <h3>PROJEKTY</h3>
                <ul className="project-list">
                    {projects.map((p) => (
                        <li
                            key={p.path}
                            className={`project-item ${activeProject?.path === p.path ? 'active' : ''}`}
                            onClick={() => onSelectProject(p)}
                        >
                            <span className="project-icon">📦</span>
                            <div className="project-info">
                                <span className="project-name">{p.name}</span>
                                <span className="project-path">{p.path.split('/').pop()}</span>
                            </div>
                            {/* Status indicators would go here */}
                        </li>
                    ))}
                </ul>
            </div>
        </aside>
    );
};
