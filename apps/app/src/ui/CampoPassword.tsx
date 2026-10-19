import { useState } from 'react';
import { Pressable } from 'react-native';

import { useAreaToccabile } from '@/ui/areaToccabile';
import { CampoTesto, type CampoTestoProps } from '@/ui/CampoTesto';
import { Icona } from '@/ui/icone';

export type CampoPasswordProps = Omit<CampoTestoProps, 'accessorio' | 'secureTextEntry' | 'autoCapitalize' | 'autoCorrect'> & {
  /** Mostra la password in chiaro all'avvio (predefinito: nascosta). */
  visibileInizialmente?: boolean;
};

/**
 * Campo password (Figma 418:250): Campo di testo con il pulsante mostra/nascondi (icona Occhio 24,
 * area toccabile 44). Stessi stati del Campo di testo.
 */
export function CampoPassword({ visibileInizialmente = false, ...props }: CampoPasswordProps) {
  const [visibile, setVisibile] = useState(visibileInizialmente);
  const { hitSlop, onLayout } = useAreaToccabile();
  return (
    <CampoTesto
      {...props}
      secureTextEntry={!visibile}
      autoCapitalize="none"
      autoCorrect={false}
      textContentType={props.textContentType ?? 'password'}
      accessorio={
        <Pressable
          onPress={() => setVisibile((v) => !v)}
          hitSlop={hitSlop}
          onLayout={onLayout}
          accessibilityRole="button"
          accessibilityLabel={visibile ? 'Nascondi password' : 'Mostra password'}
        >
          <Icona misura={24} nome={visibile ? 'Occhio barrato' : 'Occhio'} />
        </Pressable>
      }
    />
  );
}
