import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import React from 'react';

export default function TrackInfo({
    coverSrc,
    onCoverLoadError,
    title,
    artist,
    progress,
}) {
    return (
        <div>
            <InfoContainer>
                <CoverImage
                    className="cover"
                    src={coverSrc}
                    alt="Cover art"
                    onError={onCoverLoadError}
                />
                <div>
                    <Title>{title}</Title>
                    <Artist>{artist}</Artist>
                </div>
            </InfoContainer>
            <ProgressBar>
                <ProgressBarTrack style={{ width: `${progress}%` }} />
            </ProgressBar>
        </div>
    );
}

const InfoContainer = styled.div`
    padding: 15px 24px;
    display: flex;
    align-items: center;
`;

const rotate = keyframes`
    from {
        transform: rotate3d(0, 0, 1, 0);
    }
    to {
        transform: rotate3d(0, 0, 1, 360deg);
    }
`;

const CoverImage = styled.img`
    width: 64px;
    height: 64px;
    margin-right: 24px;
    border: 3px solid #1db954;
    border-radius: 100px;
    animation: ${rotate} 6s infinite linear;
    user-select: none;
`;

const Title = styled.span`
    display: block;
    margin-bottom: 2px;

    max-width: 260px;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
`;

const Artist = styled.span`
    display: block;
    font-size: 85%;
    color: #989898;

    max-width: 260px;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
`;

const ProgressBar = styled.div`
    background-color: #161616;
    height: 2px;
    width: 100%;
`;

const ProgressBarTrack = styled.div`
    background-color: #1db954;
    height: 100%;
`;
