import React from "react";
import "./EmptyWorkspace.css";

interface EmptyWorkspaceProps {
    onSelectWorkspace: () => void;
}

export const EmptyWorkspace: React.FC<EmptyWorkspaceProps> = ({ onSelectWorkspace }) => {
    return (
        <div className="empty-workspace">
            <div className="empty-workspace-content">
                <div className="folder-icon">📁</div>
                <h2>No Workspace Selected</h2>
                <p>Select a folder containing your Node.js projects to get started</p>
                <button className="btn-primary" onClick={onSelectWorkspace}>
                    Select Workspace
                </button>
            </div>
        </div>
    );
};
