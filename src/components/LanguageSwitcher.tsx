import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

export const LanguageSwitcher: React.FC = () => {
    const { i18n, t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const toggleOpen = () => setIsOpen(!isOpen);

    const changeLanguage = (lang: string) => {
        i18n.changeLanguage(lang);
        setIsOpen(false);
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const languages = [
        { code: 'en', label: 'English', flag: '🇬🇧' },
        { code: 'cs', label: 'Čeština', flag: '🇨🇿' }
    ];

    const currentLang = languages.find(l => i18n.language.startsWith(l.code)) || languages[0];

    return (
        <div className="language-switcher-container" ref={containerRef}>
            <button
                className={`lang-toggle-btn ${isOpen ? 'active' : ''}`}
                onClick={toggleOpen}
                title={t('app.language', { defaultValue: 'Language' })}
            >
                <span className="globe-icon">🌐</span>
                <span className="current-lang-code">{currentLang.code.toUpperCase()}</span>
            </button>

            {isOpen && (
                <div className="lang-dropdown">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            className={`lang-option ${i18n.language.startsWith(lang.code) ? 'selected' : ''}`}
                            onClick={() => changeLanguage(lang.code)}
                        >
                            <span className="lang-flag">{lang.flag}</span>
                            <span className="lang-label">{lang.label}</span>
                            {i18n.language.startsWith(lang.code) && <span className="lang-check">✓</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
