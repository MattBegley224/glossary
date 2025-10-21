import { Video, ResizeMode } from 'expo-av';
import { View, StyleSheet } from 'react-native';
import { useRef, useState } from 'react';

interface IntroVideoProps {
  onFinish?: () => void;
}

export default function IntroVideo({ onFinish }: IntroVideoProps) {
  const video = useRef<Video>(null);
  const [status, setStatus] = useState<any>({});

  const handlePlaybackStatusUpdate = (playbackStatus: any) => {
    setStatus(playbackStatus);

    if (playbackStatus.didJustFinish && onFinish) {
      onFinish();
    }
  };

  return (
    <View style={styles.container}>
      <Video
        ref={video}
        source={require('../assets/videos/intro.mp4')}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        isLooping={false}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  video: {
    alignSelf: 'center',
    width: '100%',
    height: '100%',
  },
});
