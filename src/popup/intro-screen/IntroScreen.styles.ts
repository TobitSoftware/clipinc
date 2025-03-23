import styled from 'styled-components';

export const StyledIntro = styled.div`
    width: 400px;
    padding: 40px 32px;
    background-color: #282828;
    display: flex;
    align-items: center;
    flex-direction: column;
    user-select: none;
`;

export const StyledLogo = styled.img`
    margin-bottom: 8px;
`;

export const StyledExplanation = styled.p`
    margin: 0 0 16px;
    text-align: center;
    color: #989898;
    width: 68%;
`;

export const StyledOpenSpotifyButton = styled.button`
    background-color: #1db954;
    color: #fff;
    outline: none;
    border: 0;
    border-radius: 2px;
    min-height: 30px;
    padding: 7px 12px;
    box-shadow: 1px 2px 3px rgba(0, 0, 0, 0.4);
    cursor: pointer;
    transition: background-color 150ms;
`;

export const StyledOpenSourceDisclaimer = styled.p`
    background-color: black;
    padding: 15px 20px;
    margin: 0;
    font-size: 15px;
    color: #989898;
    line-height: 20px;
    font-weight: bold;
`;

export const StyledGithubLink = styled.a`
    &:visited {
        color: #989898;
    }
`;
