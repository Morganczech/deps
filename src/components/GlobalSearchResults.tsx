import React from 'react';
import { useTranslation } from 'react-i18next';
import { GlobalSearchResult, Project, Package } from '../types';
import './GlobalSearchResults.css';

interface GlobalSearchResultsProps {
    results: GlobalSearchResult[];
    onSelect: (project: Project, pkg: Package) => void;
    searchQuery: string;
}

export const GlobalSearchResults: React.FC<GlobalSearchResultsProps> = ({ results, onSelect, searchQuery }) => {
    const { t } = useTranslation();

    if (results.length === 0) {
        return (
            <div className="global-search-empty">
                <p>{t('app.search.noGlobalResults', { query: searchQuery })}</p>
            </div>
        );
    }

    return (
        <div className="global-search-container">
            <h3 className="global-search-header">
                {t('app.search.resultsCount', {
                    count: results.length,
                    projects: new Set(results.map(r => r.project.path)).size
                })}
            </h3>
            <div className="global-search-list">
                {results.map((result, index) => (
                    <div
                        key={`${result.project.path}-${result.package.name}-${index}`}
                        className="global-search-item"
                        onClick={() => onSelect(result.project, result.package)}
                    >
                        <div className="gs-project-info">
                            <span className="gs-project-name">📂 {result.project.name}</span>
                        </div>
                        <div className="gs-package-info">
                            <span className="gs-pkg-name">{result.package.name}</span>
                            <span className="gs-pkg-version">v{result.package.current_version}</span>
                        </div>
                        <div className="gs-arrow">→</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
