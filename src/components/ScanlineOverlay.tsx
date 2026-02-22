import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Animated, Dimensions} from 'react-native';
import {colors} from '../theme';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');
const SCANLINE_COUNT = Math.floor(SCREEN_HEIGHT / 4);
const SCAN_BAR_HEIGHT = 120;

const ScanlineOverlay: React.FC = () => {
  const scanPosition = useRef(new Animated.Value(-SCAN_BAR_HEIGHT)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(scanPosition, {
        toValue: SCREEN_HEIGHT,
        duration: 8000,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [scanPosition]);

  const scanlines = Array.from({length: SCANLINE_COUNT}, (_, i) => (
    <View key={i} style={styles.scanline} />
  ));

  return (
    <View style={styles.container} pointerEvents="none">
      {scanlines}
      <Animated.View
        style={[
          styles.scanBar,
          {transform: [{translateY: scanPosition}]},
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  scanline: {
    height: 1,
    marginBottom: 3,
    backgroundColor: colors.black,
    opacity: 0.08,
  },
  scanBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: SCAN_BAR_HEIGHT,
    backgroundColor: colors.green,
    opacity: 0.015,
  },
});

export default ScanlineOverlay;
