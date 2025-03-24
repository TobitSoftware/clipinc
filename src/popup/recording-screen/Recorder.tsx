import React, { ChangeEvent, useCallback, useState } from 'react';
import logoSrc from './logo.png';
import TrackInfo from '../track-info/TrackInfo';
import DownloadInfo from './DownloadInfo';
import {
    StyledContainer,
    StyledHeader, StyledLogoLink,
    StyledSwitchInput,
    StyledSwitchLabel,
    StyledSwitchTextLabel
} from './Recorder.styles';

type RecorderProps = {
    isRecording: boolean;
    songCount: number;
    title: string;
    artist: string;
    coverSrc: string;
    progress: number;
}

const Recorder = ({
    isRecording,
    songCount,
    title,
    artist,
    coverSrc,
    progress,
}: RecorderProps) => {
    const [disableSwitch, setDisableSwitch] = useState(false);

    const handleSwitchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            setDisableSwitch(true);
            void chrome.runtime.sendMessage({
                command: 'startCapture',
            }, {}, () => {
                setDisableSwitch(false);
            });
        } else {
            void chrome.runtime.sendMessage({
                command: 'stopCapture',
            });
        }
    }, []);

    const recordingText = isRecording
        ? 'Aufnahme läuft...'
        : 'Aufnahme starten';

    return (
        <StyledContainer>
            <StyledHeader>
                <StyledSwitchInput
                    id="record"
                    type="checkbox"
                    onChange={handleSwitchChange}
                    disabled={disableSwitch}
                    checked={isRecording}
                />
                <StyledSwitchLabel htmlFor="record"/>
                <StyledSwitchTextLabel>{recordingText}</StyledSwitchTextLabel>

                <StyledLogoLink
                    href="https://clipinc.de/"
                    className="no-link-style"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <img src={logoSrc} alt="" />
                </StyledLogoLink>
            </StyledHeader>
            {isRecording && (
                <>
                    <TrackInfo
                        coverSrc={coverSrc}
                        title={title}
                        artist={artist}
                        progress={progress}
                    />
                    <DownloadInfo songCount={songCount} />
                </>
            )}
        </StyledContainer>
    );
}

export default Recorder;
