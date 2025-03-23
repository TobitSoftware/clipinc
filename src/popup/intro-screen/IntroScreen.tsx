import React, { useCallback } from 'react';
import reactStringReplace from 'react-string-replace';
import {
    StyledExplanation,
    StyledGithubLink,
    StyledIntro,
    StyledLogo,
    StyledOpenSourceDisclaimer,
    StyledOpenSpotifyButton,
} from './IntroScreen.styles';
import introSrc from './intro.png';

const SPOTIFY_LOGIN_URL =
    'https://accounts.spotify.com/de/login?continue=https:%2F%2Fopen.spotify.com%2Fbrowse%2Ffeatured';

const IntroScreen = () => {
    const handleOpenSpotify = useCallback(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
            const activeTabUrl = activeTab.url;

            if (!activeTabUrl || !activeTabUrl.includes('https://open.spotify.com')) {
                void chrome.tabs.create({ url: SPOTIFY_LOGIN_URL });

                // Close popup
                window.close();
            }
        });
    }, []);

    return (
        <>
            <StyledIntro>
                <a href="https://clipinc.de/" target="_blank" rel="noreferrer noopener">
                    <StyledLogo src={introSrc} alt="" />
                </a>
                <StyledExplanation>{chrome.i18n.getMessage('intro_explanation')}</StyledExplanation>
                <StyledOpenSpotifyButton onClick={handleOpenSpotify}>
                    {chrome.i18n.getMessage('intro_openSpotify')}
                </StyledOpenSpotifyButton>
            </StyledIntro>
            <StyledOpenSourceDisclaimer>
                {reactStringReplace(
                    chrome.i18n.getMessage('intro_disclaimer'),
                    '##link##',
                    (_match, index) => {
                        if (index !== 1) return null;

                        return (
                            <StyledGithubLink
                                key={index}
                                href="https://github.com/TobitSoftware/clipinc"
                                target="_blank"
                                rel="noreferrer noopener"
                            >
                                {chrome.i18n.getMessage('intro_disclaimerLink')}
                            </StyledGithubLink>
                        );
                    },
                )}
            </StyledOpenSourceDisclaimer>
        </>
    );
};

export default IntroScreen;
