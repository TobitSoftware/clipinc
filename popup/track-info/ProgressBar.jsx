import styled from '@emotion/styled';
import React from 'react';

export function ProgressBar({ progress }) {
    return (
        <ProgressBarRail>
            <ProgressBarTrack style={{ width: `${progress}%` }} />
        </ProgressBarRail>
    );
}

const ProgressBarRail = styled.div`
    background-color: #161616;
    height: 2px;
    width: 100%;
`;

const ProgressBarTrack = styled.div`
    background-color: #1db954;
    height: 100%;

    transition: width 120ms cubic-bezier(0.4, 0, 0.2, 1);
`;
