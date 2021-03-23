import styled from '@emotion/styled';
import React from 'react';
import introSrc from '../intro.png';

const SPOTIFY_LOGIN_URL =
    'https://accounts.spotify.com/de/login?continue=https:%2F%2Fopen.spotify.com%2Fbrowse%2Ffeatured';

export function StartScreen() {
    function launchSpotify() {
        chrome.tabs.query(
            { active: true, currentWindow: true },
            ([activeTab]) => {
                const activeTabUrl = activeTab.url;

                if (!activeTabUrl.includes('https://open.spotify.com')) {
                    chrome.tabs.create({ url: SPOTIFY_LOGIN_URL });

                    // Close popup
                    window.close();
                }
            }
        );
    }

    return (
        <>
            <Intro>
                <a
                    href="https://clipinc.de/"
                    target="_blank"
                    rel="noreferrer noopener"
                >
                    <Logo src={introSrc} alt="" />
                </a>
                <Explanation>
                    Öffne Spotify und melde Dich mit Deinem Konto an.
                </Explanation>
                <OpenSpotifyButton onClick={launchSpotify}>
                    Spotify öffnen
                </OpenSpotifyButton>
            </Intro>
            <OpenSourceDisclaimer>
                Diese{' '}
                <GitHubLink
                    href="https://github.com/TobitSoftware/clipinc"
                    target="_blank"
                    rel="noreferrer noopener"
                >
                    Open-Source-Software
                </GitHubLink>{' '}
                ist ein Experiment. Eine dauerhafte Funktion kann nicht
                garantiert werden.
            </OpenSourceDisclaimer>
        </>
    );
}

const Intro = styled.div`
    width: 400px;
    padding: 40px 32px;
    background-color: #282828;
    display: flex;
    align-items: center;
    flex-direction: column;
    user-select: none;
`;

const Logo = styled.img`
    margin-bottom: 8px;
`;

const Explanation = styled.p`
    margin: 0 0 16px;
    text-align: center;
    color: #989898;
    width: 55%;
`;

const OpenSpotifyButton = styled.button`
    background-color: #1db954;
    color: #fff;
    outline: none;
    border: 0;
    border-radius: 2px;
    min-height: 30px;
    padding: 7px 12px;
    box-shadow: 1px 2px 3px rgba(0, 0, 0, 0.4);
    cursor: pointer;
    transition: background-color 150ms ease;
`;

const OpenSourceDisclaimer = styled.p`
    background-color: black;
    padding: 15px 20px;
    margin: 0;
    font-size: 15px;
    color: #989898;
    line-height: 20px;
    font-weight: bold;
`;

const GitHubLink = styled.a`
    &:visited {
        color: #989898;
    }
`;
