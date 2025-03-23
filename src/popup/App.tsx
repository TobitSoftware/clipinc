import React from 'react';
import { useRecordingState } from './hooks/useRecordingState';
import IntroScreen from './intro-screen/IntroScreen';
import Recorder from './recording-screen/Recorder';

const App = () => {
    const {
        artist,
        coverSrc,
        progress,
        songCount,
        title,
        isSpotifyTab,
        isRecording,
    } = useRecordingState();

    if (!isRecording && !isSpotifyTab) {
        return <IntroScreen/>;
    }

    return (
        <Recorder
            title={title}
            artist={artist}
            coverSrc={coverSrc}
            progress={progress}
            songCount={songCount}
            isRecording={isRecording}
        />
    )
}

export default App;
