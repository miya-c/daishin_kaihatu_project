import { mount } from 'svelte';
import IndexPage from '../components/IndexPage.svelte';
import SetupScreen from '../components/Setup/SetupScreen.svelte';
import { parseHashConfig, hasConfig } from '../utils/config';
import '../styles/index.css';

const autoConfigured = parseHashConfig();
const hasEnvConfig = !!import.meta.env.VITE_GAS_WEB_APP_URL;

const root = document.getElementById('root');
if (root) {
  if (hasConfig() || autoConfigured || hasEnvConfig) {
    mount(IndexPage, { target: root });
  } else {
    mount(SetupScreen, { target: root });
  }
}
