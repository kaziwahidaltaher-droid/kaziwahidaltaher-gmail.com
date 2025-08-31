/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import cn from 'classnames';

type VoiceProfile = {
    id: string;
    name: string;
    description: string;
};

type VoiceProfileSelectorProps = {
    isOpen: boolean;
    onClose: () => void;
    profiles: VoiceProfile[];
    activeProfileId: string | null;
    onSelect: (profile: VoiceProfile) => void;
};

export const VoiceProfileSelector: React.FC<VoiceProfileSelectorProps> = ({
    isOpen,
    onClose,
    profiles,
    activeProfileId,
    onSelect
}) => {
    if (!isOpen) return null;

    return (
        <div className="voice-panel-overlay" onClick={onClose}>
            <div className="voice-panel" onClick={(e) => e.stopPropagation()}>
                <h3>Select AURELION Voice</h3>
                <ul>
                    {profiles.map(profile => (
                        <li key={profile.id}>
                            <button
                                className={cn({ active: profile.id === activeProfileId })}
                                onClick={() => onSelect(profile)}
                            >
                                <h4>{profile.name}</h4>
                                <p>{profile.description}</p>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
