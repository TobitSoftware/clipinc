import React, { useCallback, useEffect, useState } from 'react';
import { IntroScreen } from './intro-screen/IntroScreen';
import placeholderSrc from './placeholder.png';
import { Recorder } from './recording-screen/Recorder';

export function App() {
    const [showIntro, setShowIntro] = useState(true);

    const [isRecording, setIsRecording] = useState(false);
    const [songCount, setSongCount] = useState(0);
    const [title, setTitle] = useState();
    const [artist, setArtist] = useState();
    const [coverSrc, setCoverSrc] = useState();
    const [progress, setProgress] = useState(0);

    function handleCoverLoadError() {
        setCoverSrc(placeholderSrc);
    }

    const updateProgress = useCallback((track) => {
        let progress = track
            ? Math.floor(
                  ((Date.now() -
                      new Date(track.startTime) +
                      (track.progress || 0)) /
                      track.duration) *
                      100
              )
            : 0;

        progress = Math.min(Math.max(progress, 0), 100);

        setProgress(progress);
    }, []);

    const updateTrack = useCallback(
        (track) => {
            if (track) {
                setIsRecording(true);

                setTitle(track.title);
                setArtist(track.artist);
                setCoverSrc(track.cover);

                updateProgress(track);
            } else {
                setIsRecording(false);
            }
        },
        [updateProgress]
    );

    useEffect(
        function getInitialState() {
            chrome.storage.local.get(
                ['isRecording', 'track', 'songCount'],
                ({ isRecording, track, songCount }) => {
                    chrome.tabs.query(
                        { active: true, currentWindow: true },
                        (tabs) => {
                            if (
                                !isRecording &&
                                !tabs[0].url.includes(
                                    'https://open.spotify.com'
                                )
                            ) {
                                setShowIntro(true);
                            } else {
                                setShowIntro(false);
                            }
                        }
                    );

                    setIsRecording(isRecording);

                    if (isRecording) {
                        setSongCount(songCount);
                    } else {
                        setIsRecording(false);
                    }

                    if (track) {
                        updateTrack(track);
                    }
                }
            );
        },
        [updateTrack]
    );

    useEffect(
        function addMessageListeners() {
            chrome.runtime.onMessage.addListener(({ command, data }) => {
                switch (command) {
                    case 'spotifyPlay':
                        const track = data.track;

                        updateTrack(track);

                        chrome.storage.local.get(
                            ['isRecording', 'songCount'],
                            ({ isRecording }) => {
                                if (isRecording) {
                                    setIsRecording(true);
                                } else {
                                    setIsRecording(false);
                                }
                            }
                        );
                        break;
                    case 'spotifyAbort':
                    case 'spotifyPause':
                        //stopCapture();
                        break;
                    case 'downloaded':
                        setSongCount(data.songCount);
                        break;
                    default:
                        throw Error(`Unknown command received: ${command}`);
                }
            });
        },
        [updateProgress, updateTrack]
    );

    useEffect(
        function pollState() {
            const interval = window.setInterval(() => {
                chrome.storage.local.get(
                    ['isRecording', 'track'],
                    ({ isRecording, track }) => {
                        if (isRecording) {
                            updateProgress(track);
                        }
                    }
                );
            }, 1000);

            return () => {
                window.clearInterval(interval);
            };
        },
        [updateProgress]
    );

    if (showIntro) {
        return <IntroScreen />;
    }

    return (
        <Recorder
            isRecording={isRecording}
            songCount={songCount}
            title={title}
            artist={artist}
            coverSrc={coverSrc}
            onCoverLoadError={handleCoverLoadError}
            progress={progress}
        />
    );
}
