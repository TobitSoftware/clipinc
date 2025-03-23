import React, { useCallback } from 'react';
import { StyledDownloadCounter, StyledDownloadInfo, StyledShowDownloadsButton } from './DownloadInfo.styles';

type DownloadInfoProps = {
    songCount: number;
};

const DownloadInfo = ({ songCount }: DownloadInfoProps) => {
    const handleShowDownloads = useCallback(() => {
        chrome.downloads.showDefaultFolder();
    }, []);

    let songsRecordedText = null;

    if (songCount === 1) {
        songsRecordedText = '1 Song runtergeladen';
    } else if (songCount >= 1) {
        songsRecordedText = `${songCount} Songs runtergeladen`;
    }

    return (
        <StyledDownloadInfo>
            {songsRecordedText && (
                <StyledDownloadCounter>{songsRecordedText}</StyledDownloadCounter>
            )}
            <StyledShowDownloadsButton onClick={handleShowDownloads}>
                Ordner anzeigen
            </StyledShowDownloadsButton>
        </StyledDownloadInfo>
    );
};

export default DownloadInfo;
