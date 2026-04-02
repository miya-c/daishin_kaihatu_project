import { mount } from 'svelte';
import IndexPage from '../components/IndexPage.svelte';
import '../styles/index.css';

const root = document.getElementById('root');
if (root) {
  mount(IndexPage, { target: root });
}
