import { useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';

interface Props {
  onComplete: () => void;
  disabled?: boolean;
}

const HOLD_DURATION = 1000; // 1 second

/**
 * Long-press (1 second) MAYDAY send button.
 * Red fill animation progresses left→right while held.
 * Releasing early cancels the send.
 */
export function MaydayButton({ onComplete, disabled }: Props) {
  const fillAnim = useRef(new Animated.Value(0)).current;
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startHold = useCallback(() => {
    if (disabled) return;
    setHolding(true);
    fillAnim.setValue(0);
    Animated.timing(fillAnim, {
      toValue: 1,
      duration: HOLD_DURATION,
      useNativeDriver: false,
    }).start();

    holdTimer.current = setTimeout(() => {
      setHolding(false);
      onComplete();
    }, HOLD_DURATION);
  }, [disabled, fillAnim, onComplete]);

  const cancelHold = useCallback(() => {
    setHolding(false);
    fillAnim.stopAnimation();
    fillAnim.setValue(0);
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, [fillAnim]);

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Pressable
      style={[styles.button, disabled && styles.disabled]}
      onPressIn={startHold}
      onPressOut={cancelHold}
      disabled={disabled}
    >
      <Animated.View style={[styles.fill, { width: fillWidth }]} />
      <Text style={styles.text}>
        {holding ? 'HOLD TO SEND...' : 'MAYDAY — HOLD TO SEND'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#7f1d1d',
    borderRadius: 10,
    overflow: 'hidden',
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#dc2626',
  },
  disabled: {
    opacity: 0.4,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#dc2626',
  },
  text: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 17,
    letterSpacing: 1,
    zIndex: 1,
  },
});
