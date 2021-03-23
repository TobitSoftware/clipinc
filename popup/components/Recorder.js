import styled from '@emotion/styled';
import React, { useState } from 'react';
import logoSrc from '../logo.png';
import DownloadInfo from './DownloadInfo';
import TrackInfo from './TrackInfo';

export function Recorder({
    isRecording,
    onRecordStateChange,
    songCount,
    title,
    artist,
    coverSrc,
    onCoverLoadError,
    progress,
}) {
    const [disableSwitch, setDisableSwitch] = useState(false);

    function handleSwitchChange(event) {
        setDisableSwitch(true);

        if (event.target.checked) {
            chrome.storage.local.get(['volume'], ({ volume }) => {
                chrome.runtime.sendMessage(
                    { command: 'startCapture', data: { volume: volume || 1 } },
                    {},
                    (response) => {
                        onRecordStateChange(Boolean(response.success));
                        setDisableSwitch(false);
                    }
                );
            });
        } else {
            chrome.runtime.sendMessage({ command: 'stopCapture', data: {} });
            chrome.storage.local.set({ track: null });

            onRecordStateChange(false);

            setDisableSwitch(false);
        }
    }

    const recordingText = isRecording
        ? 'Aufnahme läuft...'
        : 'Aufnahme starten';

    return (
        <Container>
            <Header>
                <SwitchInput
                    id="record"
                    type="checkbox"
                    onChange={handleSwitchChange}
                    disabled={disableSwitch}
                    checked={isRecording}
                />
                <SwitchLabel htmlFor="record"></SwitchLabel>
                <SwitchTextLabel>{recordingText}</SwitchTextLabel>

                <LogoLink
                    href="https://clipinc.de/"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <img src={logoSrc} alt="" />
                </LogoLink>
            </Header>
            {isRecording && (
                <>
                    <TrackInfo
                        coverSrc={coverSrc}
                        onCoverLoadError={onCoverLoadError}
                        title={title}
                        artist={artist}
                        progress={progress}
                    />
                    <DownloadInfo songCount={songCount} />
                </>
            )}
        </Container>
    );
}

const Container = styled.div`
    width: 400px;
    background-color: #161616;
`;

const Header = styled.div`
    padding: 0 24px;
    background-color: #282828;
    display: flex;
    align-items: center;
    user-select: none;
`;

const SwitchInput = styled.input`
    display: none;
`;

const SwitchLabel = styled.label`
    background-color: grey;
    width: 32px;
    height: 14px;
    border-radius: 8px;
    display: inline-block;
    margin-right: 16px;
    cursor: pointer;

    &:before {
        display: block;
        position: absolute;
        width: 16px;
        height: 16px;
        margin-top: -1px;
        margin-left: -2px;
        background-color: white;
        border-radius: 50%;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
        content: ' ';
        transition: transform 100ms linear, opacity 100ms ease-in-out;
    }

    ${SwitchInput}:checked + &:before {
        transform: translateX(22px);
    }

    ${SwitchInput}:checked + & {
        background-color: #1db954;
    }

    ${SwitchInput}:disabled + & {
        opacity: 0.9;
    }
`;

const SwitchTextLabel = styled.span`
    margin-top: 2px;
`;

const LogoLink = styled.a`
    margin-left: auto;
`;
