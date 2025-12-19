import React from 'react';
import { useTranslation } from 'react-i18next';
import { Project } from '../types';
import { LanguageSwitcher } from './LanguageSwitcher';
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
    const { t } = useTranslation();
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="sidebar-controls">
                    <button
                        className="btn-icon btn-toggle"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        title={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
                    >
                        {isCollapsed ? '»' : '«'}
                    </button>
                </div>
                <button
                    onClick={onOpenFolder}
                    className="btn-icon btn-open-folder"
                    title={t('app.openFolder')}
                >
                    <span className="icon">📂</span>
                    {!isCollapsed && <span className="label">{t('app.openFolder')}</span>}
                </button>
            </div>

            <div className="sidebar-section">
                {!isCollapsed && <h3>{t('sidebar.projects')}</h3>}
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

            <div className="sidebar-footer">
                <LanguageSwitcher />
            </div>
        </aside>
    );
};
