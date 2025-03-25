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
import { conditionalLog, conditionalError } from "./utils/logger";
import { log, LOG_TYPES, getApiEndpoint, switchToProd, API_CONFIG } from "./utils/logger";

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
  // 從 localStorage 檢查是否有已儲存的登入狀態
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const savedLoginState = localStorage.getItem('isLoggedIn');
    return savedLoginState === 'true';
  });
  
  // 從 localStorage 檢查是否有已儲存的用戶 ID
  const [userId, setUserId] = useState(() => {
    return localStorage.getItem('userId') || "";
  });
  
  // 從 localStorage 檢查是否有已儲存的管理員權限
  const [isAdmin, setIsAdmin] = useState(() => {
    const savedAdminState = localStorage.getItem('isAdmin');
    return savedAdminState === 'true';
  });
  
  // 從 localStorage 檢查是否有已儲存的筆記資料
  const [memos, setMemos] = useState(() => {
    const savedMemos = localStorage.getItem('memos');
    return savedMemos ? JSON.parse(savedMemos) : [];
  });
  
  const [news, setNews] = useState([]);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [memo, setMemo] = useState("");
  const [selectedNews, setSelectedNews] = useState(null);
  const [showDelete, setShowDelete] = useState(null);
  const touchStartX = useRef(null);
  const [slidePosition, setSlidePosition] = useState({});
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [selectedMemo, setSelectedMemo] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [apiError, setApiError] = useState(null);
  const [hasLoggedSuccess, setHasLoggedSuccess] = useState(false);
  const [showDevelopingModal, setShowDevelopingModal] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // 當登入狀態改變時，更新 localStorage
  useEffect(() => {
    localStorage.setItem('isLoggedIn', isLoggedIn);
  }, [isLoggedIn]);
  
  // 當用戶 ID 改變時，更新 localStorage
  useEffect(() => {
    localStorage.setItem('userId', userId);
  }, [userId]);
  
  // 當管理員權限改變時，更新 localStorage
  useEffect(() => {
    localStorage.setItem('isAdmin', isAdmin);
  }, [isAdmin]);
  
  // 當筆記資料改變時，更新 localStorage
  useEffect(() => {
    localStorage.setItem('memos', JSON.stringify(memos));
  }, [memos]);
  
  // 當 isLoggedIn 為 true 但頁面剛載入（重新整理後）時，嘗試重新同步筆記
  useEffect(() => {
    // 檢查是否為頁面重新載入後的首次執行
    const isPageRefresh = document.readyState === 'complete';
    
    if (isLoggedIn && userId && isPageRefresh) {
      // 在頁面重新載入後，重新從伺服器獲取筆記資料
      const loadUserData = async () => {
        try {
          const baseUrls = [
            'http://localhost:3000',
            'https://crypto-memo-production.up.railway.app'
          ];
          
          for (const baseUrl of baseUrls) {
            try {
              const response = await axios.get(`${baseUrl}/api/users`, { 
                timeout: 5000 
              });
              
              if (response.data && Array.isArray(response.data)) {
                const currentUser = response.data.find(user => user.id === userId);
                
                if (currentUser && currentUser.note) {
                  const localMemos = JSON.parse(localStorage.getItem('memos') || '[]');
                  const memoMap = {};
                  
                  localMemos.forEach(memo => {
                    if (!memoMap[memo.timestamp] || memo.timestamp > memoMap[memo.timestamp].timestamp) {
                      memoMap[memo.timestamp] = memo;
                    }
                  });
                  
                  currentUser.note.forEach(memo => {
                    if (!memoMap[memo.timestamp] || memo.timestamp > memoMap[memo.timestamp].timestamp) {
                      memoMap[memo.timestamp] = memo;
                    }
                  });
                  
                  const mergedMemos = Object.values(memoMap).sort((a, b) => b.timestamp - a.timestamp);
                  
                  setMemos(mergedMemos);
                  localStorage.setItem('memos', JSON.stringify(mergedMemos));
                  
                  syncNotesToServer(true);
                  break;
                }
              }
            } catch (error) {
              continue;
            }
          }
        } catch (error) {
          console.error("❌ 無法獲取用戶資料");
        }
      };
      
      loadUserData();
    }
  }, [isLoggedIn, userId]);

  useEffect(() => {
    if (isLoggedIn) {
      // 依序嘗試不同的 API 端點
      const tryApiEndpoints = async () => {
        try {
          const response = await axios.get(`${getApiEndpoint()}/api/news`, { timeout: 5000 });
          setNews(response.data);
          log(LOG_TYPES.NEWS_SUCCESS);
          return;
        } catch (error) {
          if (!API_CONFIG.isUsingProd) {
            switchToProd();
            return tryApiEndpoints(); // 重試一次
          }
          log(LOG_TYPES.NEWS_ERROR);
          setApiError("無法連接到新聞數據服務。請稍後再試。");
        }
      };
      
      // 同樣的邏輯也適用於獲取指數數據
      const tryIndexEndpoints = async () => {
        const baseUrls = [
          'http://localhost:3000',
          'https://crypto-memo-production.up.railway.app'
        ];
        
        for (const baseUrl of baseUrls) {
          try {
            await axios.get(`${baseUrl}/api/index`, { timeout: 5000 });
            return;
          } catch (error) {
            continue;
          }
        }
      };
      
      // 確保兩個函數都獨立運行，任一函數的失敗不會阻止另一個函數的執行
      tryApiEndpoints().catch(e => {
        // 只在開發環境輸出錯誤日誌
        if (process.env.NODE_ENV === 'development') {
          console.error("新聞 API 調用失敗");
        }
      });
      tryIndexEndpoints().catch(e => {
        // 只在開發環境輸出錯誤日誌
        if (process.env.NODE_ENV === 'development') {
          console.error("指數 API 調用失敗");
        }
      });
    }
  }, [isLoggedIn]);

  const handleLogin = async () => {
    setLoginError("");
    if (!account || !password) {
      setLoginError("帳號和密碼不能為空");
      return;
    }
    
    try {
      const response = await axios.post(`${getApiEndpoint()}/api/login`, {
        id: account,
        password: password
      }, { 
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000 
      });
      
      const { success, id, control, note } = response.data;
      
      if (success) {
        setIsLoggedIn(true);
        setUserId(id);
        setIsAdmin(control === "true");
        
        if (note && Array.isArray(note)) {
          setMemos(note);
        }
        
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userId', id);
        localStorage.setItem('isAdmin', control === "true");
        if (note && Array.isArray(note)) {
          localStorage.setItem('memos', JSON.stringify(note));
        }
        
        log(LOG_TYPES.API_SUCCESS, getApiEndpoint());
        log(LOG_TYPES.LOGIN_SUCCESS, `${id}, 管理員權限: ${control}`);
        return;
      }
    } catch (error) {
      if (!API_CONFIG.isUsingProd) {
        switchToProd();
        return handleLogin(); // 重試一次
      }
      setLoginError("無法連接到伺服器，請稍後再試");
    }
  };

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
    
    // 觸發立即同步
    setTimeout(() => syncNotesToServer(), 300);
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
    
    // 觸發立即同步
    setTimeout(() => syncNotesToServer(), 300);
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
    // 添加選擇模態窗狀態
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    // 修改選擇的區塊狀態，只預設勾選簡介和重點摘要
    const [selectedSections, setSelectedSections] = useState({
      intro: true,      // 預設勾選
      summary: true,    // 預設勾選
      detail: false,    // 預設不勾選
      original: false,  // 預設不勾選
      source: false     // 預設不勾選
    });

    // 在 NewsDetail 組件中修改 handleAddToNote 函數
    const handleAddToNote = () => {
      // 先顯示選擇模態窗
      setShowSelectionModal(true);
    };
    
    // 處理最終確認加入筆記
    const handleConfirmAddToNote = () => {
      // 檢查是否至少選擇了一個區塊
      const hasSelection = Object.values(selectedSections).some(value => value);
      
      if (!hasSelection) {
        // 如果沒有選擇任何區塊，至少添加標題
        setEditingTitle(news.titleZh);
        setEditingContent("");
        setIsNoteModalOpen(true);
        setShowSelectionModal(false);
        return;
      }
      
      // 根據選擇的區塊構建內容
      let newsContent = '';
      
      if (selectedSections.intro) {
        newsContent += `簡介：
${news.contentZh}

`;
      }
      
      if (selectedSections.summary) {
        newsContent += `重點摘要：
${news.summaryZh}

`;
      }
      
      if (selectedSections.detail) {
        newsContent += `詳細內容：
${news.detailZh}

`;
      }
      
      if (selectedSections.original) {
        newsContent += `原文：
${news.contentDetail}

`;
      }
      
      if (selectedSections.source) {
        newsContent += `出處：
${news.url}`;
      }

      setEditingTitle(news.titleZh); // 標題仍然設定為新聞標題
      setEditingContent(newsContent.trim()); // 但內容不包含標題
      setIsNoteModalOpen(true);
      setShowSelectionModal(false); // 關閉選擇模態窗
    };
    
    // 選擇區塊模態窗組件
    const SelectionModal = () => (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 p-4 md:p-6 rounded-lg w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg md:text-xl font-semibold text-yellow-400">選擇要添加的內容</h2>
            <button
              onClick={() => setShowSelectionModal(false)}
              className="text-gray-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="intro"
                checked={selectedSections.intro}
                onChange={(e) => setSelectedSections({...selectedSections, intro: e.target.checked})}
                className="w-5 h-5 mr-3 accent-yellow-500"
              />
              <label htmlFor="intro" className="text-white text-lg cursor-pointer">簡介</label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="summary"
                checked={selectedSections.summary}
                onChange={(e) => setSelectedSections({...selectedSections, summary: e.target.checked})}
                className="w-5 h-5 mr-3 accent-yellow-500"
              />
              <label htmlFor="summary" className="text-white text-lg cursor-pointer">重點摘要</label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="detail"
                checked={selectedSections.detail}
                onChange={(e) => setSelectedSections({...selectedSections, detail: e.target.checked})}
                className="w-5 h-5 mr-3 accent-yellow-500"
              />
              <label htmlFor="detail" className="text-white text-lg cursor-pointer">詳細內容</label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="original"
                checked={selectedSections.original}
                onChange={(e) => setSelectedSections({...selectedSections, original: e.target.checked})}
                className="w-5 h-5 mr-3 accent-yellow-500"
              />
              <label htmlFor="original" className="text-white text-lg cursor-pointer">原文</label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="source"
                checked={selectedSections.source}
                onChange={(e) => setSelectedSections({...selectedSections, source: e.target.checked})}
                className="w-5 h-5 mr-3 accent-yellow-500"
              />
              <label htmlFor="source" className="text-white text-lg cursor-pointer">出處</label>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowSelectionModal(false)}
              className="px-4 md:px-5 py-2 rounded-md bg-gray-600 hover:bg-gray-500 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={handleConfirmAddToNote}
              className="px-4 md:px-5 py-2 rounded-md bg-yellow-500 hover:bg-yellow-600 transition-colors cursor-pointer"
            >
              添加至筆記
            </button>
          </div>
        </div>
      </div>
    );

    return (
      <div className="bg-gray-800 p-4 md:p-6 rounded-lg">
        {/* 修改標題區塊的排列方式 - 在小螢幕上使用垂直排列 */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
            <button
              onClick={handleBackToList}
              className="bg-yellow-500 px-4 py-2 rounded-md hover:bg-yellow-600 w-full md:w-24 mb-4 md:mb-0 cursor-pointer transition-colors"
            >
              返回
            </button>
            <button
              onClick={handleAddToNote}
              className="bg-yellow-500 px-4 py-2 rounded-md hover:bg-yellow-600 cursor-pointer transition-colors flex items-center justify-center"
            >
              <span>添加至筆記</span>
            </button>
          </div>
          <h2 className="text-xl font-semibold">{news.titleZh}</h2>
        </div>

        {/* 調整內容區塊 - 更好的間距和捲動 */}
        <div className="space-y-4 md:space-y-6">
          <div className="bg-gray-700 p-3 md:p-4 rounded-lg">
            <h3 className="text-yellow-400 mb-2">簡介</h3>
            <p className="text-gray-300">{news.contentZh}</p>
          </div>

          <div className="bg-gray-700 p-3 md:p-4 rounded-lg">
            <h3 className="text-yellow-400 mb-2">重點摘要</h3>
            <p className="text-gray-300 whitespace-pre-line">
              {news.summaryZh}
            </p>
          </div>

          <div className="bg-gray-700 p-3 md:p-4 rounded-lg">
            <h3 className="text-yellow-400 mb-2">詳細內容</h3>
            <p className="text-gray-300 whitespace-pre-line">{news.detailZh}</p>
          </div>

          <div className="bg-gray-700 p-3 md:p-4 rounded-lg">
            <h3 className="text-yellow-400 mb-2 md:mb-4">原文</h3>
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

          <div className="bg-gray-700 p-3 md:p-4 rounded-lg">
            <h3 className="text-yellow-400 mb-2">出處</h3>
            <a
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 break-words"
            >
              {news.url}
            </a>
          </div>
        </div>
        
        {/* 選擇區塊模態窗 */}
        {showSelectionModal && <SelectionModal />}
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

  // 修改筆記視窗關閉按鈕的處理函數
  const handleCloseNoteModal = () => {
    setIsNoteModalOpen(false);
    setEditingTitle("");    // 清空標題
    setEditingContent("");  // 清空內容
  };

  // 修改筆記視窗組件
  const NoteModal = () => {
    const [localTitle, setLocalTitle] = useState(editingTitle);
    const [localContent, setLocalContent] = useState(editingContent);

    useEffect(() => {
      setLocalTitle(editingTitle);
      setLocalContent(editingContent);
    }, [editingTitle, editingContent]);
    
    const handleSaveNote = () => {
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
        
        // 觸發立即同步
        setTimeout(() => syncNotesToServer(), 300);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div  
          className="bg-gray-800 p-4 md:p-6 rounded-lg w-full md:w-3/4 max-w-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg md:text-xl font-semibold text-yellow-400">新增筆記</h2>
            <button
              onClick={handleCloseNoteModal}
              className="text-gray-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            placeholder="標題"
            className="w-full p-3 mb-4 rounded-md bg-gray-700 text-white text-base"
          />
          <textarea
            value={localContent}
            onChange={(e) => setLocalContent(e.target.value)}
            placeholder="內容"
            className="w-full h-48 md:h-72 p-3 mb-4 rounded-md bg-gray-700 text-white resize-none text-base"
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={handleCloseNoteModal}
              className="px-4 md:px-5 py-2 rounded-md bg-gray-600 hover:bg-gray-500 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={handleSaveNote}
              className="px-4 md:px-5 py-2 rounded-md bg-yellow-500 hover:bg-yellow-600 transition-colors cursor-pointer"
            >
              儲存
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 修改處理儀表板添加到筆記的函數
  const handleGaugeAddToNote = (gaugeStatus, type = '恐懼貪婪') => {  // 添加 type 參數
    setEditingTitle(`${type}指數快照`);
    setEditingContent(gaugeStatus);
    setIsNoteModalOpen(true);
  };

  // 添加處理"更多新聞"按鈕點擊的函數
  const handleMoreNewsClick = () => {
    setShowDevelopingModal(true);
  };
  
  // 添加開發中提示模態窗組件
  const DevelopingModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-4 md:p-6 rounded-lg w-full max-w-md">
        <div className="flex flex-col items-center mb-4">
          <h2 className="text-lg md:text-xl font-semibold text-yellow-400 mb-4">功能開發中</h2>
          <p className="text-white text-center mb-6">此功能目前正在開發中，敬請期待！</p>
          <button
            onClick={() => setShowDevelopingModal(false)}
            className="px-6 py-2 rounded-md bg-yellow-500 hover:bg-yellow-600 transition-colors cursor-pointer"
          >
            確認
          </button>
        </div>
      </div>
    </div>
  );

  // 添加新數據按鈕點擊處理函數
  const handleAddNewDataClick = () => {
    setShowDevelopingModal(true);
  };
  
  // 新增「添加新數據」組件
  const AddNewDataButton = () => {
    // 添加一個空的外部點擊處理函數，防止點擊圖標以外區域觸發事件
    const handleContainerClick = (e) => {
      // 防止點擊事件冒泡
      e.stopPropagation();
    };

    return (
      <div 
        className="w-full bg-gray-700 p-4 rounded-lg"
        onClick={handleContainerClick}
        style={{ aspectRatio: "1/1" }} // 確保組件為正方形
      >
        <div className="flex flex-col items-center justify-center h-full">
          {/* 只對圓形區域添加點擊事件 */}
          <div 
            className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center mb-2 cursor-pointer hover:bg-yellow-600 transition-colors"
            onClick={handleAddNewDataClick}
          >
            <span className="text-xl font-bold text-white">+</span>
          </div>
          <p className="text-white font-medium">添加新數據</p>
        </div>
      </div>
    );
  };

  // 修改筆記同步相關邏輯

  // 1. 改進筆記同步函數，增加錯誤重試和日誌
  const syncNotesToServer = async (forcedSync = false) => {
    if (!isLoggedIn || !userId) return false;
    if (memos.length === 0 && !forcedSync) return false;
    
    setIsSyncing(true);
    const baseUrls = [
      'http://localhost:3000',
      'https://crypto-memo-production.up.railway.app'
    ];
    
    for (const baseUrl of baseUrls) {
      try {
        const response = await axios.post(`${baseUrl}/api/notes/save`, {
          userId: userId,
          notes: memos
        }, { 
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000 
        });
        
        if (response.data.success) {
          log(LOG_TYPES.NOTES_SYNC_SUCCESS);
          setIsSyncing(false);
          return true;
        }
      } catch (error) {
        continue;
      }
    }
    
    log(LOG_TYPES.NOTES_SYNC_ERROR);
    setIsSyncing(false);
    return false;
  };

  // 2. 在處理筆記變更時同步
  useEffect(() => {
    // 只有在登入後且有筆記變動時才同步
    if (isLoggedIn && userId && memos.length > 0) {
      // 使用防抖，減少頻繁 API 調用
      const timer = setTimeout(() => {
        syncNotesToServer();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [memos, isLoggedIn, userId]);

  // 3. 在登出前同步資料
  const handleLogout = () => {
    // 清除 localStorage
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userId');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('memos');
    
    // 重置狀態
    setIsLoggedIn(false);
    setUserId("");
    setIsAdmin(false);
    setMemos([]);
    setAccount("");
    setPassword("");

    console.log("已成功登出");
  };

  // 將登出函數暴露到全局範圍
  useEffect(() => {
    // 將登出函數掛載到 window 對象上
    window.logout = handleLogout;
    
    // 組件卸載時移除全局函數
    return () => {
      window.logout = undefined;
    };
  }, []);

  // 修改登入表單部分為響應式並顯示錯誤訊息
  if (!isLoggedIn) {
    return (
      <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center p-4">
        <div className="bg-gray-800 p-4 md:p-6 rounded-lg w-full max-w-md">
          <h2 className="text-xl font-semibold mb-4 text-yellow-400">
            Crypto Memo
          </h2>
          <input
            type="text"
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
          
          {/* 顯示登入錯誤訊息 */}
          {loginError && (
            <div className="text-red-400 mb-4 text-sm">
              {loginError}
            </div>
          )}
          
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

  // 已登入後的主畫面 - 最簡單可靠的 RWD 佈局
  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col md:flex-row">
      {/* 左側側邊欄 */}
      <aside className="bg-gray-800 p-4 md:p-6 md:w-64 border-b md:border-r md:border-b-0 border-gray-700 md:h-screen md:sticky md:top-0 flex flex-col">
        <h1 className="text-xl md:text-2xl font-bold text-yellow-400 mb-4">Crypto Memo</h1>
        
        {/* 在桌面版用垂直排列，在手機版用水平排列 */}
        <form 
          className="mb-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleAddMemo();
          }}
        >
          {/* 桌面版輸入區 - 垂直排列 */}
          <div className="hidden md:block">
            <input
              type="text"
              placeholder="快速筆記"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full p-2 rounded-md bg-gray-700 text-white mb-2"
            />
            <button
              type="submit"
              className="bg-yellow-500 w-full p-2 rounded-md hover:bg-yellow-600 transition-colors font-medium"
            >
              新增
            </button>
          </div>
          
          {/* 手機版輸入區 - 水平排列 */}
          <div className="flex md:hidden">
            <input
              type="text"
              placeholder="快速筆記"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="flex-1 p-2 rounded-l-md bg-gray-700 text-white"
            />
            <button
              type="submit"
              className="bg-yellow-500 px-3 py-2 rounded-r-md hover:bg-yellow-600 transition-colors flex-shrink-0"
            >
              新增
            </button>
          </div>
        </form>
        
        {/* 筆記列表 */}
        <div className="overflow-y-auto flex-1">
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
      </aside>
      
      {/* 中間主內容區 */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {!selectedNews ? (
          <>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
              <h2 className="text-2xl md:text-4xl font-semibold mb-2 md:mb-0">新聞</h2>
              <h2 className="text-sm md:text-base font-semibold">
                更新時間：
                {news.length > 0 && news[0].timestamp
                  ? formatTimestamp(news[0].timestamp)
                  : "0000年00月00日 00:00"}
              </h2>
            </div>
            {news.length === 0 ? (
              <p className="text-gray-400">加載中...</p>
            ) : (
              <>
                {news
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
                  ))}
                
                {/* 添加"更多新聞"按鈕 */}
                <div className="flex justify-center mt-6 mb-8">
                  <button
                    onClick={handleMoreNewsClick}
                    className="bg-yellow-500 px-6 py-3 rounded-md hover:bg-yellow-600 transition-colors cursor-pointer text-lg font-medium"
                  >
                    更多新聞
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <NewsDetail news={selectedNews} />
        )}
      </main>
      
      {/* 右側側邊欄 - 修改溢出處理 */}
      <aside className="bg-gray-800 p-4 md:p-6 md:w-64 border-t md:border-l md:border-t-0 border-gray-700 md:h-screen md:sticky md:top-0">
        <h2 className="text-lg md:text-xl font-semibold mb-4 text-yellow-400 text-center">
          相關數據
        </h2>
        {/* 修改溢出設置，只允許垂直滾動，禁止水平滾動 */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center space-y-4">
          <div className="w-full bg-gray-700 p-4 rounded-lg">
            <GaugeChart onAddToNote={handleGaugeAddToNote} />
          </div>
          <div className="w-full bg-gray-700 p-4 rounded-lg">
            <AltcoinIndex onAddToNote={handleGaugeAddToNote} />
          </div>
          
          {/* 添加新數據按鈕 */}
          <AddNewDataButton />
        </div>
      </aside>
      
      {/* 模態窗 */}
      {isNoteModalOpen && <NoteModal />}
      {showDevelopingModal && <DevelopingModal />}
    </div>
  );
}

export default App;
