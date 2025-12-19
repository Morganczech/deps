import React, { useState, useEffect } from 'react';
import { PackageHistoryEntry } from '../types';
import { api } from '../lib/api';
import './PackageHistory.css';

interface PackageHistoryProps {
    projectPath: string;
    packageName: string;
    onRollback: (version: string) => void;
    lastUpdated?: number; // Trigger to reload
}

export const PackageHistory: React.FC<PackageHistoryProps> = ({
    projectPath,
    packageName,
    onRollback,
    lastUpdated
}) => {
    const [history, setHistory] = useState<PackageHistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
    const [noteDraft, setNoteDraft] = useState("");

    useEffect(() => {
        loadHistory();
    }, [projectPath, packageName, lastUpdated]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const data = await api.getPackageHistory(projectPath, packageName);
            // Sort by date desc (newest first)
            const sorted = [...data].reverse();
            setHistory(sorted);
        } catch (e) {
            console.error("Failed to load history", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNote = async (index: number) => {
        if (index !== 0) return; // Only latest supported by backend for now

        try {
            await api.updateLastPackageHistoryNote(projectPath, packageName, noteDraft);

            // Optimistic update
            const newHistory = [...history];
            if (newHistory[0]) {
                newHistory[0] = { ...newHistory[0], note: noteDraft };
                setHistory(newHistory);
            }
            setEditingNoteIndex(null);
        } catch (e) {
            console.error("Failed to save note", e);
            alert("Failed to save note");
        }
    };

    const formatDate = (iso: string) => {
        try {
            const date = new Date(iso);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch {
            return iso;
        }
    };

    if (loading) return <div className="history-loading">Loading history...</div>;
    if (history.length === 0) return <div className="history-empty">No history recorded</div>;

    return (
        <div className="package-history">
            <h4>History</h4>
            <div className="history-list">
                {history.map((entry, i) => (
                    <div key={i} className={`history-item ${entry.type}`}>
                        <div className="history-header">
                            <span className={`history-type-icon ${entry.type}`}>
                                {entry.type === 'upgrade' ? '↑' : entry.type === 'downgrade' ? '↓' : entry.type === 'rollback' ? '↺' : '⚡'}
                            </span>
                            <span className="history-type">{entry.type === 'external' ? 'External Change' : entry.type}</span>
                            <span className="history-versions">
                                {entry.from} → {entry.to}
                            </span>
                        </div>
                        <div className="history-meta">
                            <span className="history-date">{formatDate(entry.date)}</span>

                            {/* Inline Note Editor for Latest Entry */}
                            {i === 0 && editingNoteIndex === i ? (
                                <div className="history-note-editor">
                                    <input
                                        type="text"
                                        value={noteDraft}
                                        onChange={(e) => setNoteDraft(e.target.value)}
                                        placeholder="Add a note... (Enter to save)"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveNote(i);
                                            if (e.key === 'Escape') setEditingNoteIndex(null);
                                        }}
                                        autoFocus
                                        maxLength={80}
                                    />
                                    <div className="note-actions">
                                        <button className="btn-icon check" onClick={() => handleSaveNote(i)}>✓</button>
                                        <button className="btn-icon cancel" onClick={() => setEditingNoteIndex(null)}>✕</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="history-note-display">
                                    {entry.note && <div className="history-note">“{entry.note}”</div>}
                                    {i === 0 && (
                                        <button
                                            className="btn-add-note"
                                            onClick={() => {
                                                setEditingNoteIndex(i);
                                                setNoteDraft(entry.note || "");
                                            }}
                                        >
                                            {entry.note ? "✎" : "+ Add note"}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        {entry.type !== 'rollback' && i !== 0 && (
                            <button
                                className="btn-rollback"
                                onClick={() => onRollback(entry.from)}
                                title={`Rollback to ${entry.from}`}
                            >
                                Rollback
                            </button>
                        )}
                        {/* Allow immediate rollback even if it is latest? typically not needed unless it was a mistake */}
                    </div>
                ))}
            </div>
        </div>
    );
};
