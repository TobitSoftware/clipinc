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
        songsRecordedText = chrome.i18n.getMessage('downloadedSongs_one');
    } else if (songCount >= 1) {
        songsRecordedText = chrome.i18n.getMessage('downloadedSongs_other', [songCount.toLocaleString()]);
    }

    return (
        <StyledDownloadInfo>
            {songsRecordedText && (
                <StyledDownloadCounter>{songsRecordedText}</StyledDownloadCounter>
            )}
            <StyledShowDownloadsButton onClick={handleShowDownloads}>
                {chrome.i18n.getMessage('showDownloads')}
            </StyledShowDownloadsButton>
        </StyledDownloadInfo>
    );
};

export default DownloadInfo;
