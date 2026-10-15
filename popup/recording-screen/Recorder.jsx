import styled from '@emotion/styled';
import React, { useEffect, useState } from 'react';
import logoSrc from '../logo.png';
import TrackInfo from '../track-info/TrackInfo';
import DownloadInfo from './DownloadInfo';

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
    const [stopAfterTrack, setStopAfterTrack] = useState(false);
    const [currentTrackId, setCurrentTrackId] = useState(null);
    const [stopPending, setStopPending] = useState(false);
    const [stopError, setStopError] = useState('');
    useEffect(() => {
        let mounted = true;
        const refresh = () =>
            chrome.storage.local.get(['stopAfterTrack', 'track'], (values) => {
                if (chrome.runtime.lastError || !mounted) return;
                setStopAfterTrack(Boolean(values.stopAfterTrack));
                setCurrentTrackId(
                    values.track?.type === 'ad'
                        ? null
                        : values.track?.id || null,
                );
            });
        const changed = (changes, area) => {
            if (area === 'local' && (changes.stopAfterTrack || changes.track))
                refresh();
        };
        chrome.storage.onChanged.addListener(changed);
        refresh();
        return () => {
            mounted = false;
            chrome.storage.onChanged.removeListener(changed);
        };
    }, []);
    function toggleStopAfterTrack() {
        setStopPending(true);
        chrome.runtime.sendMessage(
            {
                command: 'setStopAfterTrack',
                data: {
                    enabled: !stopAfterTrack,
                    trackId: currentTrackId,
                },
            },
            (response) => {
                const error = chrome.runtime.lastError;
                if (error || !response?.success) {
                    setStopError(
                        response?.error ||
                            'Stopp konnte nicht vorgemerkt werden.',
                    );
                } else {
                    setStopAfterTrack(Boolean(response.enabled));
                    setStopError('');
                }
                setStopPending(false);
            },
        );
    }

    const [bitrate, setBitrate] = useState(256);
    const [qualityReady, setQualityReady] = useState(false);
    const [qualityError, setQualityError] = useState('');
    useEffect(() => {
        chrome.storage.local.get('recordingBitrate', ({ recordingBitrate }) => {
            if (chrome.runtime.lastError) {
                setQualityError('Qualität konnte nicht geladen werden.');
            } else if ([128, 192, 256, 320].includes(recordingBitrate)) {
                setBitrate(recordingBitrate);
            }
            setQualityReady(true);
        });
    }, []);
    function changeQuality(event) {
        const value = Number(event.target.value);
        setQualityReady(false);
        chrome.storage.local.set({ recordingBitrate: value }, () => {
            if (chrome.runtime.lastError) {
                setQualityError('Qualität konnte nicht gespeichert werden.');
            } else {
                setBitrate(value);
                setQualityError('');
            }
            setQualityReady(true);
        });
    }

    function handleSwitchChange(event) {
        setDisableSwitch(true);

        if (event.target.checked) {
            chrome.storage.local.get(['volume'], ({ volume }) => {
                chrome.runtime.sendMessage(
                    { command: 'startCapture', data: { volume: volume || 1 } },
                    (response) => {
                        onRecordStateChange(
                            Boolean(
                                !chrome.runtime.lastError && response?.success,
                            ),
                        );
                        setDisableSwitch(false);
                    },
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
                    disabled={disableSwitch || !qualityReady}
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
            <QualitySettings>
                <label htmlFor="recording-quality">MP3-Qualität</label>
                <select
                    id="recording-quality"
                    value={bitrate}
                    onChange={changeQuality}
                    disabled={!qualityReady}
                >
                    <option value={128}>128 kbit/s – kleinere Dateien</option>
                    <option value={192}>192 kbit/s</option>
                    <option value={256}>256 kbit/s – Standard</option>
                    <option value={320}>
                        320 kbit/s – höchste MP3-Bitrate
                    </option>
                </select>
                <small>
                    {isRecording
                        ? 'Änderungen gelten ab dem nächsten Song. '
                        : ''}
                    Die Auswahl bleibt gespeichert. Die Spotify-Quellqualität
                    bleibt unverändert.
                </small>
                {qualityError && <small role="alert">{qualityError}</small>}
            </QualitySettings>
            {isRecording && (
                <>
                    <StopAfterControl>
                        <button
                            type="button"
                            onClick={toggleStopAfterTrack}
                            disabled={
                                stopPending ||
                                (!currentTrackId && !stopAfterTrack)
                            }
                            aria-pressed={stopAfterTrack}
                        >
                            {stopAfterTrack
                                ? 'Geplanten Stopp aufheben'
                                : 'Nach diesem Song stoppen'}
                        </button>
                        {stopAfterTrack && (
                            <small role="status">
                                Die Aufnahme endet nach diesem Song. Spotify
                                spielt weiter.
                            </small>
                        )}
                        {stopError && <small role="alert">{stopError}</small>}
                    </StopAfterControl>
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
        transition:
            transform 100ms cubic-bezier(0.4, 0, 0.2, 1),
            opacity 100ms linear;
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

const QualitySettings = styled.div`
    padding: 16px 24px;
    display: grid;
    gap: 8px;
    color: #fff;
    font-size: 14px;
    select {
        width: 100%;
        padding: 8px;
        color: #fff;
        background: #282828;
        border: 1px solid #777;
        border-radius: 4px;
    }
    small {
        color: #b3b3b3;
        line-height: 1.4;
    }
`;

const StopAfterControl = styled.div`
    padding: 0 24px 16px;
    display: grid;
    gap: 8px;
    button {
        padding: 10px;
        color: #fff;
        background: #282828;
        border: 1px solid #777;
        border-radius: 4px;
        cursor: pointer;
    }
    button[aria-pressed='true'] {
        border-color: #1db954;
    }
    button:disabled {
        opacity: 0.5;
        cursor: default;
    }
    small {
        color: #b3b3b3;
        line-height: 1.4;
    }
`;
