
const playIconPath = 'M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z';
const playButtonId = 'control-button-playpause';

export const queryByTestId = (id: string, root: Document | Element = document): HTMLElement | null => root.querySelector(`[data-testid="${id}"]`);

export const getNowPlayingWidget = () => queryByTestId('now-playing-widget');

export const getPlayButton = () => {
    const $button = queryByTestId(playButtonId);
    if ($button && $button.querySelector(`path[d="${playIconPath}"]`)) {
        return $button;
    }
    return null;
}

export const getPauseButton = () => {
    const $button = queryByTestId(playButtonId);
    if ($button && !$button.querySelector(`path[d="${playIconPath}"]`)) {
        return $button;
    }
    return null;
}

export const getVolumeBar = () => queryByTestId('volume-bar');

export const getVolumeProgressBar = () => {
    const $volumeBar = getVolumeBar();
    if (!$volumeBar) {
        return null;
    }
    const $progressBar = queryByTestId('progress-bar', $volumeBar);
    if (!$progressBar) {
        return null;
    }
    return $progressBar;
}

export const getVolume = () => {
    const $volumeProgressBar = getVolumeProgressBar();
    if (!$volumeProgressBar) {
        return 1;
    }
    const value = $volumeProgressBar.style.getPropertyValue('--progress-bar-transform');
    const volume = Number.parseFloat(value);
    if (Number.isNaN(volume)) {
        return 1;
    }
    return volume / 100;
}

export const getPreviousButton = () => queryByTestId('control-button-skip-back');

export const getForwardButton = () => queryByTestId('control-button-skip-forward');

export const getTrackInfo = () => {
    const $nowPlayingWidget = getNowPlayingWidget();

    if (!$nowPlayingWidget) return {
        title: '',
        subTitle: '',
        coverImageUrl: ''
    };

    const $title = queryByTestId('context-item-info-title', $nowPlayingWidget);
    const $subTitle = queryByTestId('context-item-info-subtitles', $nowPlayingWidget);
    const $cover = queryByTestId('cover-art-image', $nowPlayingWidget) as HTMLImageElement | null;

    return {
        title: $title?.textContent ?? '',
        subTitle: $subTitle?.textContent ?? '',
        coverImageUrl: $cover?.src ?? ''
    }
}

export const getPlaybackDuration = () => {
    const $playbackDuration = queryByTestId('playback-duration');

    return $playbackDuration?.textContent ?? '0:00';
}
