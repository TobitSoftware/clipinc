import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { getVolumeBar } from '../utils/selectors';
import { StyledVolumeSlider } from './VolumeSlider.styles';

let volumeSliderWrapper: HTMLElement | null = null;
let root: Root | null = null;

const renderVolumeSlider = ($root: HTMLElement) => {
    root = createRoot($root);
    root.render(
        <StyledVolumeSlider
            type="range"
            min={0}
            max={1}
            step={0.01}
            defaultValue={1}
            onChange={(ev) => {
                void chrome.runtime.sendMessage({
                    command: 'setVolume',
                    target: 'offscreen',
                    data: {
                        volume: ev.target.valueAsNumber,
                    },
                });
            }}
        />,
    );
};

const unmountVolumeSlider = () => {
    root?.unmount();
    root = null;
};

export const hijackVolumeControl = () => {
    const $volumeBar = getVolumeBar();
    if ($volumeBar) {
        $volumeBar.style.display = 'none';
        const $root = document.createElement('div');
        $root.classList.add('clipinc-volume-slider-wrapper');
        volumeSliderWrapper = $root;
        renderVolumeSlider($root);
        $volumeBar.insertAdjacentElement('beforebegin', $root);
    }
}

export const releaseVolumeControl = () => {
    const $volumeBar = getVolumeBar();
    if ($volumeBar) {
        unmountVolumeSlider();
        volumeSliderWrapper?.remove();
        volumeSliderWrapper = null;
        $volumeBar.style.display = '';
    }
}
