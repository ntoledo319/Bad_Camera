import { Redirect } from 'expo-router';
import { useStore } from '../data/store';

export default function Index() {
  const s = useStore();
  return <Redirect href={s.settings.onboarded ? '/explore' : '/welcome'} />;
}
