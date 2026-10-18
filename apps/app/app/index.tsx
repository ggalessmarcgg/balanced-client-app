import { Text } from 'react-native';

import { APP_NAME, STEP_LABEL } from '@/core/appInfo';
import { Centered } from '@/ui/Centered';

export default function HomeScreen() {
  return (
    <Centered>
      <Text>{APP_NAME}</Text>
      <Text>{STEP_LABEL}</Text>
    </Centered>
  );
}
