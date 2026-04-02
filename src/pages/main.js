import IndexPage from '../components/IndexPage.svelte';
import '../styles/index.css';

const root = document.getElementById('root');
if (root) {
  new IndexPage({ target: root });
}
