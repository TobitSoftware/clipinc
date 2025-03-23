import React, { ReactEventHandler, useCallback } from 'react';
import ProgressBar from './ProgressBar';
import {
    StyledArtist,
    StyledCoverImage,
    StyledInfoContainer,
    StyledTitle,
} from './TrackInfo.styles';
import placeholderSrc from './placeholder.png';

type TrackInfoProps = {
    coverSrc: string;
    title: string;
    artist: string;
    progress: number;
};

const TrackInfo = ({ coverSrc, title, artist, progress }: TrackInfoProps) => {
    const handleCoverError: ReactEventHandler<HTMLImageElement> = useCallback((ev) => {
        // eslint-disable-next-line no-param-reassign
        ev.currentTarget.src = placeholderSrc;
    }, []);

    return (
        <div>
            <StyledInfoContainer>
                <StyledCoverImage
                    key={coverSrc}
                    className="cover"
                    src={coverSrc || undefined}
                    alt="Cover art"
                    onError={handleCoverError}
                />
                <div>
                    <StyledTitle>{title}</StyledTitle>
                    <StyledArtist>{artist}</StyledArtist>
                </div>
            </StyledInfoContainer>
            <ProgressBar progress={progress} />
        </div>
    );
};

export default TrackInfo;
