import { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [news, setNews] = useState([]);

  useEffect(() => {
    // 讀取 newsTest10.json 檔案
    axios.get("/newsTest10.json")
      .then((response) => {
        setNews(response.data);
      })
      .catch((error) => {
        console.error("Error fetching news:", error);
      });
  }, []);

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <nav className="flex items-center justify-between px-6 py-4 bg-gray-800">
        <h1 className="text-xl font-bold text-yellow-400">Crypto Memo</h1>
        <button className="bg-yellow-500 px-4 py-2 rounded-md">登入</button>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-xl font-semibold mb-4">新聞</h2>

        {news.length === 0 ? (
          <p className="text-gray-400">加載中...</p>
        ) : (
          news.map((item) => (
            <div key={item.id} className="bg-gray-800 p-4 rounded-lg mb-4">
              <span className="text-sm text-gray-400">{item.timeago}</span>
              <h3 className="text-lg font-bold mt-1">{item.title}</h3>
              <p className="text-gray-300 mt-2">{item.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
