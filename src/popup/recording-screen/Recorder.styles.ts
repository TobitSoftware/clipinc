import styled from 'styled-components';

export const StyledContainer = styled.div`
    width: 400px;
    background-color: #161616;
`;

export const StyledHeader = styled.div`
    padding: 0 24px;
    background-color: #282828;
    display: flex;
    align-items: center;
    user-select: none;
`;

export const StyledSwitchInput = styled.input`
    display: none;
`;

export const StyledSwitchLabel = styled.label`
    background-color: grey;
    width: 32px;
    height: 14px;
    border-radius: 8px;
    display: inline-block;
    margin-right: 16px;
    cursor: pointer;

    &:before {
        display: block;
        position: absolute;
        width: 16px;
        height: 16px;
        margin-top: -1px;
        margin-left: -2px;
        background-color: white;
        border-radius: 50%;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
        content: ' ';
        transition: transform 100ms cubic-bezier(0.4, 0, 0.2, 1),
            opacity 100ms linear;
    }

    ${StyledSwitchInput}:checked + &:before {
        transform: translateX(22px);
    }

    ${StyledSwitchInput}:checked + & {
        background-color: #1db954;
    }

    ${StyledSwitchInput}:disabled + & {
        opacity: 0.9;
    }
`;

export const StyledSwitchTextLabel = styled.span`
    margin-top: 2px;
`;

export const StyledLogoLink = styled.a`
    margin-left: auto;
`;
