import styled from '@emotion/styled';
import React from 'react';

export default function DownloadInfo({ songCount }) {
    function showDownloads() {
        chrome.downloads.showDefaultFolder();
    }

    let songsRecordedText = null;

    if (songCount === 1) {
        songsRecordedText = '1 Song runtergeladen';
    } else if (songCount >= 1) {
        songsRecordedText = `${songCount} Songs runtergeladen`;
    }

    return (
        <Container>
            {songsRecordedText && (
                <DownloadCounter>{songsRecordedText}</DownloadCounter>
            )}
            <ShowDownloadsButton onClick={showDownloads}>
                Ordner anzeigen
            </ShowDownloadsButton>
        </Container>
    );
}

const Container = styled.div`
    padding: 14px 24px;
    background-color: #282828;
    display: flex;
    justify-content: space-between;
    align-items: center;
    user-select: none;
`;

const DownloadCounter = styled.span`
    color: #989898;
`;

const ShowDownloadsButton = styled.button`
    margin-left: auto;
    padding: 0;
    border: none;
    border-bottom: 1px dashed;

    cursor: pointer;

    transition: opacity 0.1s;

    color: #fff;
    font-size: 16px;

    &:hover {
        opacity: 0.7;
    }
`;
