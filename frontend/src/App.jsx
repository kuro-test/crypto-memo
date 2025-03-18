import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  DndContext,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
} from "@dnd-kit/core";
import GaugeChart from "./GaugeChart";
import AltcoinIndex from "./AltcoinIndex";

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const formattedDate = date.toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // 正確處理日期格式
  return formattedDate
    .replace(/\//g, "") // 先移除所有斜線
    .replace(/(\d{4})(\d{2})(\d{2})/, "$1年$2月$3日 ") // 加入年月日
    .replace(/,/, ""); // 移除逗號
};

function App() {
  const [news, setNews] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [memo, setMemo] = useState("");
  const [memos, setMemos] = useState([]);
  const [selectedNews, setSelectedNews] = useState(null);
  const [showDelete, setShowDelete] = useState(null);
  const touchStartX = useRef(null);
  const [slidePosition, setSlidePosition] = useState({});
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [selectedMemo, setSelectedMemo] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingContent, setEditingContent] = useState("");

  useEffect(() => {
    if (isLoggedIn) {
      axios
        .get("/news.json")
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
    if (account === "test" && password === "test") {
      setIsLoggedIn(true);
    } else {
      alert("帳號或密碼錯誤");
    }
  };

  // 修改 handleAddMemo 函數
  const handleAddMemo = () => {
    if (isNoteModalOpen) {
      // 從筆記視窗新增
      if (noteTitle.trim() || memo.trim()) {
        const newMemo = {
          title: noteTitle.trim() || memo.trim(), // 如果沒有標題就用內容當標題
          content: memo.trim(),
          timestamp: Date.now(),
        };
        setMemos([newMemo, ...memos]);
        setNoteTitle("");
        setMemo("");
        setIsNoteModalOpen(false);
      }
    } else {
      // 快速筆記
      if (memo.trim()) {
        const newMemo = {
          title: memo.trim(),
          content: "",
          timestamp: Date.now(),
        };
        setMemos([newMemo, ...memos]);
        setMemo("");
      } else {
        setIsNoteModalOpen(true);
      }
    }
  };

  const handleDeleteMemo = (indexToDelete) => {
    // 刪除備忘錄
    setMemos(memos.filter((_, index) => index !== indexToDelete));

    // 清除對應的滑動位置狀態
    setSlidePosition((prev) => {
      const newState = { ...prev };
      delete newState[indexToDelete];
      // 重新排序剩餘的索引
      const updated = {};
      Object.keys(newState).forEach((key) => {
        const currentIndex = parseInt(key);
        if (currentIndex > indexToDelete) {
          updated[currentIndex - 1] = newState[key];
        } else {
          updated[currentIndex] = newState[key];
        }
      });
      return updated;
    });
  };

  // 新增處理新聞點擊的函數
  const handleNewsClick = (newsItem) => {
    setSelectedNews(newsItem);
  };

  // 新增返回新聞列表的函數
  const handleBackToList = () => {
    setSelectedNews(null);
  };

  // 修改 NewsDetail 組件
  const NewsDetail = ({ news }) => {
    // 在 NewsDetail 組件中修改 handleAddToNote 函數
    const handleAddToNote = () => {
      const newsContent = `
簡介：
${news.contentZh}

重點摘要：
${news.summaryZh}

詳細內容：
${news.detailZh}

原文：
${news.contentDetail}

出處：
${news.url}
    `.trim();

      setEditingTitle(news.titleZh); // 標題仍然設定為新聞標題
      setEditingContent(newsContent); // 但內容不包含標題
      setIsNoteModalOpen(true);
    };

    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        {/* 修改標題區塊的排列方式 */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={handleBackToList}
              className="bg-yellow-500 px-4 py-2 rounded-md hover:bg-yellow-600 w-24 cursor-pointer transition-colors"
            >
              返回
            </button>
            <button
              onClick={handleAddToNote}
              className="bg-yellow-500 px-4 py-2 rounded-md hover:bg-yellow-600 cursor-pointer transition-colors flex items-center"
            >
              <span>添加至筆記</span>
            </button>
          </div>
          <h2 className="text-xl font-semibold">{news.titleZh}</h2>
        </div>

        {/* 調整內容順序 */}
        <div className="space-y-6">
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-yellow-400 mb-2">簡介</h3>
            <p className="text-gray-300">{news.contentZh}</p>
          </div>

          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-yellow-400 mb-2">重點摘要</h3>
            <p className="text-gray-300 whitespace-pre-line">
              {news.summaryZh}
            </p>
          </div>

          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-yellow-400 mb-2">詳細內容</h3>
            <p className="text-gray-300 whitespace-pre-line">{news.detailZh}</p>
          </div>

          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-yellow-400 mb-4">原文</h3>
            <p
              className="text-gray-300 whitespace-pre-line leading-relaxed"
              style={{
                textAlign: "justify",
                wordSpacing: "0.05em",
                lineHeight: "1.8",
              }}
            >
              {news.contentDetail}
            </p>
          </div>

          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-yellow-400 mb-2">出處</h3>
            <a
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              {news.url}
            </a>
          </div>
        </div>
      </div>
    );
  };

  const handleTouchStart = (e, index) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e, index) => {
    if (!touchStartX.current) return;

    const currentX = e.touches[0].clientX;
    const diff = touchStartX.current - currentX;

    if (diff > 0) {
      const position = Math.min(60, diff);
      setSlidePosition((prev) => ({
        ...prev,
        [index]: position,
      }));
    } else {
      setSlidePosition((prev) => ({
        ...prev,
        [index]: 0,
      }));
    }
  };

  const handleMouseDown = (e, index) => {
    touchStartX.current = e.clientX;
  };

  const handleMouseMove = (e, index) => {
    if (!touchStartX.current) return;

    const currentX = e.clientX;
    const diff = touchStartX.current - currentX;

    if (diff > 0) {
      const position = Math.min(60, diff);
      setSlidePosition((prev) => ({
        ...prev,
        [index]: position,
      }));
    } else {
      setSlidePosition((prev) => ({
        ...prev,
        [index]: 0,
      }));
    }
  };

  const handleMouseUp = (index) => {
    touchStartX.current = null;
  };

  const handleTouchEnd = (index) => {
    if (!touchStartX.current) return;

    const position = slidePosition[index] || 0;
    if (position > 30) {
      setSlidePosition((prev) => ({
        ...prev,
        [index]: 60,
      }));
    } else {
      setSlidePosition((prev) => ({
        ...prev,
        [index]: 0,
      }));
    }
    touchStartX.current = null;
  };

  // 在 App 函數內新增處理 Enter 鍵的函數
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  // 修改 handleMemoClick 函數
  const handleMemoClick = (memo) => {
    setEditingTitle(memo.title || "");
    setEditingContent(memo.content || "");
    setIsNoteModalOpen(true);
  };

  // 修改筆記視窗組件
  const NoteModal = () => {
    // 新增本地狀態來處理輸入
    const [localTitle, setLocalTitle] = useState(editingTitle);
    const [localContent, setLocalContent] = useState(editingContent);

    useEffect(() => {
      setLocalTitle(editingTitle);
      setLocalContent(editingContent);
    }, [editingTitle, editingContent]);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div
          className="bg-gray-800 p-6 rounded-lg w-3/4 max-w-3xl" // 調整寬度
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-yellow-400">新增筆記</h2>
            <button
              onClick={() => setIsNoteModalOpen(false)}
              className="text-gray-400 hover:text-white cursor-pointer" // 加入 cursor-pointer
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            placeholder="標題"
            className="w-full p-3 mb-4 rounded-md bg-gray-700 text-white"
          />
          <textarea
            value={localContent}
            onChange={(e) => setLocalContent(e.target.value)}
            placeholder="內容"
            className="w-full h-150 p-3 mb-4 rounded-md bg-gray-700 text-white resize-none" // 調整高度
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setIsNoteModalOpen(false);
                setEditingTitle("");
                setEditingContent("");
              }}
              className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => {
                if (localTitle.trim() || localContent.trim()) {
                  const newMemo = {
                    title: localTitle.trim() || localContent.trim(),
                    content: localContent.trim(),
                    timestamp: Date.now(),
                  };
                  setMemos([newMemo, ...memos]);
                  setIsNoteModalOpen(false);
                  setEditingTitle("");
                  setEditingContent("");
                }
              }}
              className="px-4 py-2 rounded-md bg-yellow-500 hover:bg-yellow-600 transition-colors"
            >
              儲存
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 新增處理儀表板添加到筆記的函數
  const handleGaugeAddToNote = (gaugeStatus) => {
    setEditingTitle("恐懼貪婪指數快照");
    setEditingContent(gaugeStatus);
    setIsNoteModalOpen(true);
  };

  // 修改登入表單部分
  if (!isLoggedIn) {
    return (
      <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-yellow-400">
            Crypto Memo
          </h2>
          <input
            type="account"
            placeholder="帳號"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full p-2 mb-4 rounded-md bg-gray-700 text-white"
          />
          <input
            type="password"
            placeholder="密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full p-2 mb-4 rounded-md bg-gray-700 text-white"
          />
          <button
            onClick={handleLogin}
            className="bg-yellow-500 px-4 py-2 rounded-md w-full mb-4 hover:bg-yellow-600 cursor-pointer transition-colors"
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

        {/* 快速筆記輸入區域 */}
        <input
          type="text"
          placeholder="快速筆記"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && memo.trim()) {
              handleAddMemo();
            }
          }}
          className="w-full p-2 mb-4 rounded-md bg-gray-700 text-white"
        />

        {/* 單一新增按鈕 */}
        <button
          onClick={handleAddMemo}
          className="bg-yellow-500 px-4 py-2 rounded-md w-full mb-4 hover:bg-yellow-600 cursor-pointer transition-colors"
        >
          新增
        </button>

        {/* 修改筆記列表項目的渲染部分 */}
        <div className="flex-1 overflow-y-auto">
          {memos.map((item, index) => (
            <div
              key={index}
              className="bg-gray-700 p-2 rounded-md mb-2 relative overflow-hidden cursor-pointer"
              onTouchStart={(e) => handleTouchStart(e, index)}
              onTouchMove={(e) => handleTouchMove(e, index)}
              onTouchEnd={() => handleTouchEnd(index)}
              onMouseDown={(e) => handleMouseDown(e, index)}
              onMouseMove={(e) => handleMouseMove(e, index)}
              onMouseUp={() => handleMouseUp(index)}
              onMouseLeave={() => handleMouseUp(index)}
              onClick={(e) => {
                if (!slidePosition[index]) {
                  handleMemoClick(item);
                }
              }}
            >
              <div
                className="flex items-center transition-transform duration-300 select-none"
                style={{
                  transform: `translateX(-${slidePosition[index] || 0}px)`,
                }}
              >
                <span className="flex-1 truncate pr-2">{item.title}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteMemo(index);
                }}
                className="absolute right-0 top-0 h-full bg-red-500 hover:bg-red-600 transition-all flex items-center justify-center"
                style={{
                  width: "60px",
                  transform: `translateX(${
                    60 - (slidePosition[index] || 0)
                  }px)`,
                }}
              >
                刪除
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 中間主內容區（新聞） */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedNews ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-4xl font-semibold">新聞</h2>
              <h2 className="text-base font-semibold">
                更新時間：
                {news.length > 0 && news[0].timestamp
                  ? formatTimestamp(news[0].timestamp)
                  : "0000年00月00日 00:00"}
              </h2>
            </div>
            {news.length === 0 ? (
              <p className="text-gray-400">加載中...</p>
            ) : (
              news
                .filter((item) => item.id)
                .map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-800 p-4 rounded-lg mb-4 cursor-pointer hover:bg-gray-700 transition-colors"
                    onClick={() => handleNewsClick(item)}
                  >
                    <span className="text-sm text-gray-400">
                      {item.timeago}
                    </span>
                    <h3 className="text-lg font-bold mt-1">{item.titleZh}</h3>
                    <p className="text-gray-300 mt-2">{item.contentZh}</p>
                  </div>
                ))
            )}
          </>
        ) : (
          <NewsDetail news={selectedNews} />
        )}
      </div>

      {/* 右側側邊欄 */}
      <div className="sticky top-0 h-screen bg-gray-800 p-6 w-64 flex flex-col border-l border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-yellow-400 text-center">
          相關指數
        </h2>
        <div className="flex-1 overflow-y-auto flex flex-col items-center space-y-4">
          <div className="w-full bg-gray-700 p-4 rounded-lg">
            <GaugeChart onAddToNote={handleGaugeAddToNote} />
          </div>
          <div className="w-full bg-gray-700 p-4 rounded-lg">
            <AltcoinIndex onAddToNote={handleGaugeAddToNote} />
          </div>
          {/* 新增開發中提示區塊 */}
          <div className="w-full p-4 rounded-lg border-2 border-dashed border-white/50">
            <p className="text-center text-white/70 font-medium">
              新指數功能開發中
            </p>
          </div>
        </div>
      </div>

      {/* 在主要內容的最後加入筆記視窗 */}
      {isNoteModalOpen && <NoteModal />}
    </div>
  );
}

export default App;
