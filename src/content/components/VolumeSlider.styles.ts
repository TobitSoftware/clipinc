import styled from 'styled-components';

export const StyledVolumeSlider = styled.input`
    -webkit-appearance: none;
    background-color: #404040;
    border-radius: 2px;
    height: 4px;
    width: 60px;

    &:hover {
        cursor: pointer;
    }

    &:focus {
        outline: none;
    }

    &::-webkit-slider-thumb {
        transform-origin: 50%;
        -webkit-appearance: none;
        border: none;
        height: 12px;
        width: 12px;
        background-color: white;
        border-radius: 100%;
        transition: width 0.1s,
        height 0.1s,
        margin-top 0.1s;
        margin-top: -3px;
    }

    &::-webkit-slider-runnable-track {
        height: 5px;
        border-width: 9px 0;
        background: transparent;
        border-color: transparent;
        color: transparent;
    }
`;
