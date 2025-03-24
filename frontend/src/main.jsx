import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { scrape } from './api.js'

// 將 scrape 對象掛載到 window 全局對象，方便在控制台訪問
window.scrape = scrape;

// 為了使用起來更方便，添加和原腳本一樣的調用方式
window.scrape.news = function(count) {
  return this.newsStream(count);
};

window.scrape.index = function() {
  return this.indexStream();
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
