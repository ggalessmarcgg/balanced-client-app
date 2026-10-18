import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

// Contenitore che centra i figli. Solo layout: colori, font e spaziature
// arrivano con il design system (step 2).
export function Centered({ children }: PropsWithChildren) {
  return <View style={styles.container}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
