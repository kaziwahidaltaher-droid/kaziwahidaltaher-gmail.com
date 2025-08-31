/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

type Chapter = {
    timecode: string;
    chapterSummary: string;
};

type PanelProps = {
    isOpen: boolean;
    onClose: () => void;
    chapters: Chapter[];
};

const VideoChapterPanel: React.FC<PanelProps> = ({ isOpen, onClose, chapters }) => {
    if (!isOpen) return null;

    return (
        <div className="video-chapter-panel-overlay" onClick={onClose}>
            <div className="video-chapter-panel" onClick={(e) => e.stopPropagation()}>
                <div className="video-chapter-header">
                    <h3>Video Chapter Analysis</h3>
                    <button onClick={onClose} className="panel-close-btn" aria-label="Close video analysis panel">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
                    </button>
                </div>
                <div className="video-chapter-body">
                    <ul className="video-chapter-list">
                        {chapters.map((chapter, index) => (
                            <li key={index} className="video-chapter-item">
                                <span className="timecode">{chapter.timecode}</span>
                                <p className="summary">{chapter.chapterSummary}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default VideoChapterPanel;