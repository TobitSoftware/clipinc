import React from 'react';
import { GlobalStyle } from './App.styles';
import { useRecordingState } from './hooks/useRecordingState';
import IntroScreen from './intro-screen/IntroScreen';
import Recorder from './recording-screen/Recorder';

const App = () => {
    const { artist, coverSrc, progress, songCount, title, isSpotifyTab, isRecording } =
        useRecordingState();

    return (
        <>
            <GlobalStyle />
            {!isRecording && !isSpotifyTab ? (
                <IntroScreen />
            ) : (
                <Recorder
                    title={title}
                    artist={artist}
                    coverSrc={coverSrc}
                    progress={progress}
                    songCount={songCount}
                    isRecording={isRecording}
                />
            )}
        </>
    );
};

export default App;
