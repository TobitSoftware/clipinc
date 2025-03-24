import { useEffect, useMemo, useState } from 'react';
import StorageChange = chrome.storage.StorageChange;

export const useRecordingState = () => {
    const [isSpotifyTab, setIsSpotifyTab] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [coverSrc, setCoverSrc] = useState('');
    const [songCount, setSongCount] = useState(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
            if (!tab.url) {
                setIsSpotifyTab(false);
                return;
            }
            const url = new URL(tab.url);
            setIsSpotifyTab(url.host.includes('spotify.com'));
        })
    }, []);

    useEffect(() => {
        chrome.storage.session.get(['isRecording', 'title', 'subTitle', 'coverSrc', 'progress', 'songCount'], (result) => {
            setIsRecording(result.isRecording ?? false);
            setTitle(result.title ?? '');
            setArtist(result.subTitle ?? '');
            setCoverSrc(result.coverSrc ?? '');
            setProgress(result.progress ?? 0);
            setSongCount(result.songCount ?? 0);
        });

        const listener = (change: StorageChange) => {
            if ('isRecording' in change) {
                setIsRecording(change.isRecording.newValue ?? false);
            }
            if ('title' in change) {
                setTitle(change.title.newValue ?? '');
            }
            if ('subTitle' in change) {
                setArtist(change.subTitle.newValue ?? '');
            }
            if ('coverSrc' in change) {
                setCoverSrc(change.coverSrc.newValue ?? '');
            }
            if ('progress' in change) {
                setProgress(change.progress.newValue ?? 0);
            }
            if ('songCount' in change) {
                setSongCount(change.songCount.newValue ?? 0);
            }
        }

        chrome.storage.session.onChanged.addListener(listener);
        return () => chrome.storage.session.onChanged.removeListener(listener);
    }, []);

    return useMemo(() => ({
        isSpotifyTab,
        isRecording,
        title,
        artist,
        coverSrc,
        songCount,
        progress,
    }), [artist, coverSrc, isRecording, isSpotifyTab, progress, songCount, title]);
}
