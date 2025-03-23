import React from 'react';
import { StyledProgressBarRail, StyledProgressBarTrack } from './ProgressBar.styles';

type ProgressBarProps = {
    progress: number;
};

const ProgressBar = ({ progress }: ProgressBarProps) => (
    <StyledProgressBarRail>
        <StyledProgressBarTrack style={{ width: `${progress}%` }} />
    </StyledProgressBarRail>
);

export default ProgressBar;
