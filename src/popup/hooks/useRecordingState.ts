import { useEffect, useMemo, useState } from 'react';
import { ClipincStorageChange, ClipincStorageState } from '../../types/storage';

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
        chrome.storage.session.get<ClipincStorageState>(['isRecording', 'title', 'subTitle', 'coverSrc', 'progress', 'songCount'], (result) => {
            setIsRecording(result.isRecording ?? false);
            setTitle(result.title ?? '');
            setArtist(result.subTitle ?? '');
            setCoverSrc(result.coverSrc ?? '');
            setProgress(result.progress ?? 0);
            setSongCount(result.songCount ?? 0);
        });

        const listener = (change: ClipincStorageChange) => {
            if (change.isRecording) {
                setIsRecording(change.isRecording.newValue ?? false);
            }
            if (change.title) {
                setTitle(change.title.newValue ?? '');
            }
            if (change.subTitle) {
                setArtist(change.subTitle.newValue ?? '');
            }
            if (change.coverSrc) {
                setCoverSrc(change.coverSrc.newValue ?? '');
            }
            if (change.progress) {
                setProgress(change.progress.newValue ?? 0);
            }
            if (change.songCount) {
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
