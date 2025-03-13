import { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [news, setNews] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [memo, setMemo] = useState('');
  const [memos, setMemos] = useState([]);

  useEffect(() => {
    if (isLoggedIn) {
      axios.get('/news20250313022254566.json')
        .then((response) => {
          setNews(response.data);
        })
        .catch((error) => {
          console.error("Error fetching news:", error);
        });
    }
  }, [isLoggedIn]);

  const handleLogin = () => {
    // 只允許特定的帳號和密碼
    if (account === 'test' && password === 'test') {
      setIsLoggedIn(true);
    } else {
      alert("帳號或密碼錯誤");
    }
  };

  const handleAddMemo = () => {
    if (memo.trim()) {
      setMemos([...memos, memo]);
      setMemo('');
    }
  };

  const handleDeleteMemo = (indexToDelete) => {
    setMemos(memos.filter((_, index) => index !== indexToDelete));
  };

  // 未登入時，顯示登入畫面
  if (!isLoggedIn) {
    return (
      <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-yellow-400">Crypto Memo</h2>
          <input
            type="account"
            placeholder="帳號"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
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

  // 已登入後的主畫面
  return (
    <div className="bg-gray-900 text-white min-h-screen flex">
    {/* 左側側邊欄 */}
    <div className="sticky top-0 h-screen bg-gray-800 p-6 w-64 flex flex-col border-r border-gray-700">
      <h1 className="text-2xl font-bold text-yellow-400 mb-6">Crypto Memo</h1>
      <input
        type="text"
        placeholder="新增筆記"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        className="w-full p-2 mb-4 rounded-md bg-gray-700 text-white"
      />
      <button
        onClick={handleAddMemo}
        className="bg-yellow-500 px-4 py-2 rounded-md w-full mb-4"
      >
          新增
        </button>
        <div className="flex-1 overflow-y-auto">
          {memos.map((item, index) => (
            <div key={index} className="bg-gray-700 p-2 rounded-md mb-2 flex justify-between items-center">
              <span>{item}</span>
              <button 
              onClick={() => handleDeleteMemo(index)}
              className="ml-2 px-2 py-1 bg-red-500 hover:bg-red-600 rounded-md text-sm"
              >
                刪除
                </button>
            </div>
          ))}
        </div>
      </div>

     {/* 中間主內容區（新聞） */}
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-4xl font-semibold">新聞</h2>
        <h2 className="text-xs font-semibold">更新時間:0000年00月00日 00:00</h2>
      </div>
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

    {/* 右側側邊欄 */}
    <div className="sticky top-0 h-screen bg-gray-800 p-6 w-64 flex flex-col border-l border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-yellow-400">待開發功能</h2>
      <div className="flex-1 overflow-y-auto">
        {/* 右側內容待開發 */}
      </div>
    </div>
  </div>
);
}

export default App;
