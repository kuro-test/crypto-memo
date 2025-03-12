import { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [news, setNews] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isLoggedIn) {
      axios.get('news20250312081856566.json')
        .then((response) => {
          setNews(response.data);
        })
        .catch((error) => {
          console.error("Error fetching news:", error);
        });
    }
  }, [isLoggedIn]);

  const handleLogin = () => {
    // 簡單的登入邏輯，實際應用中應該進行驗證
    if (email && password) {
      setIsLoggedIn(true);
    } else {
      alert("請輸入帳號和密碼");
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-yellow-400">Crypto Memo</h2>
          <input
            type="email"
            placeholder="電子郵件"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 mb-4 rounded-md bg-gray-700 text-white"
          />
          <input
            type="password"
            placeholder="密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 mb-4 rounded-md bg-gray-700 text-white"
          />
          <button
            onClick={handleLogin}
            className="bg-yellow-500 px-4 py-2 rounded-md w-full"
          >
            登入
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <nav className="flex items-center justify-between px-6 py-4 bg-gray-800">
        <h1 className="text-xl font-bold text-yellow-400">Crypto Memo</h1>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-xl font-semibold mb-4">新聞</h2>

        {news.length === 0 ? (
          <p className="text-gray-400">加載中...</p>
        ) : (
          news.map((item) => (
            <div key={item.id} className="bg-gray-800 p-4 rounded-lg mb-4">
              <span className="text-sm text-gray-400">{item.timeago}</span>
              <h3 className="text-lg font-bold mt-1">{item.titleZh}</h3>
              <p className="text-gray-300 mt-2">{item.contentZh}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
