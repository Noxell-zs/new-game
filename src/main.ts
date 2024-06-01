import './style.css';
import {App} from './app/app';

if ('serviceWorker' in navigator) {
  // navigator.serviceWorker
  //   .register('./sw.js')
  //   .catch(console.error);
}

const app = new App();
app.init();
