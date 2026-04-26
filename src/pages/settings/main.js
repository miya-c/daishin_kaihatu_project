import { mount } from 'svelte';
import SettingsPage from '../../components/Settings/SettingsPage.svelte';

const root = document.getElementById('root');
if (root) {
  mount(SettingsPage, { target: root });
}
