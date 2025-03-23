import styled, { keyframes } from 'styled-components';

export const StyledInfoContainer = styled.div`
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

export const StyledCoverImage = styled.img`
    width: 64px;
    height: 64px;
    margin-right: 24px;
    border: 3px solid #1db954;
    border-radius: 100px;
    animation: ${rotate} 6s infinite linear;
    user-select: none;
`;

export const StyledTitle = styled.span`
    display: block;
    margin-bottom: 2px;

    max-width: 260px;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
`;

export const StyledArtist = styled.span`
    display: block;
    font-size: 85%;
    color: #989898;

    max-width: 260px;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
`;
