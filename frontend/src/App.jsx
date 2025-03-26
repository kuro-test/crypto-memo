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
import { log, LOG_TYPES, getApiEndpoint, switchToProd, API_CONFIG, callApi } from "./utils/logger";

// API 健康檢查函數
const checkApiHealth = async () => {
  // 只輸出一次開始檢查的訊息
  const apiUrl = API_CONFIG.PROD;
  const endpoints = ['/api/users', '/api/news', '/api/index'];
  const results = {};
  
  // 使用 Promise.all 並行檢查所有端點，減少等待時間
  await Promise.all(endpoints.map(async (endpoint) => {
    try {
      // 不輸出每個檢查的開始訊息
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'GET',
        credentials: 'omit'
      });
      
      results[endpoint] = response.ok;
      // 不輸出每個檢查的成功或失敗訊息
    } catch (error) {
      results[endpoint] = false;
      // 完全隱藏錯誤訊息
    }
  }));
  
  // 確保使用生產環境
  API_CONFIG.isUsingProd = true;
  API_CONFIG.preferLocal = false;
  
  const isHealthy = Object.values(results).some(r => r === true);
  
  // 只輸出一次最終結果
  if (isHealthy) {
    console.log("✅ API 健康檢查：生產環境連接正常");
  }
  
  return {
    healthy: isHealthy,
    results
  };
};

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
  const [isEditMode, setIsEditMode] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [hasLoggedSuccess, setHasLoggedSuccess] = useState(false);
  const [showDevelopingModal, setShowDevelopingModal] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const slidingTimeoutRef = useRef(null);
  const [hasMoved, setHasMoved] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAddingMemo, setIsAddingMemo] = useState(false);
  const [apiHealthy, setApiHealthy] = useState(true);

  // 保存筆記到本地存儲的輔助函數
  const saveMemosToLocalStorage = (memos) => {
    try {
      localStorage.setItem('memos', JSON.stringify(memos));
      console.log(`已保存 ${memos.length} 條筆記到本地存儲`);
      return true;
    } catch (error) {
      console.error('無法保存筆記到本地存儲:', error);
      return false;
    }
  };

  // 當組件掛載時進行 API 健康檢查
  useEffect(() => {
    const runApiHealthCheck = async () => {
      try {
        const healthResult = await checkApiHealth();
        setApiHealthy(healthResult.healthy);
        
        // 不重複輸出健康狀態訊息
      } catch (error) {
        setApiHealthy(false);
        // 隱藏錯誤訊息
      }
    };
    
    runApiHealthCheck();
  }, []);

  // API 連接失敗時顯示的 UI
  const ApiErrorFallback = () => {
    const handleRetry = () => {
      window.location.reload();
    };

    const handleUseLocal = () => {
      API_CONFIG.switchToLocal();
      window.location.reload();
    };

    const handleUseProd = () => {
      API_CONFIG.switchToProd();
      window.location.reload();
    };

    return (
      <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center p-4">
        <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
          <h2 className="text-xl font-semibold mb-4 text-yellow-400">
            連接失敗
          </h2>
          <p className="mb-6 text-gray-300">
            無法連接到伺服器。這可能是因為:
          </p>
          <ul className="list-disc pl-5 mb-6 text-gray-300">
            <li>伺服器目前不可用</li>
            <li>本地伺服器未啟動</li>
            <li>網絡連接問題</li>
          </ul>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="bg-yellow-500 px-4 py-2 rounded-md w-full hover:bg-yellow-600 cursor-pointer transition-colors"
            >
              重試連接
            </button>
            <div className="flex space-x-3">
              <button
                onClick={handleUseLocal}
                className="bg-gray-700 px-4 py-2 rounded-md flex-1 hover:bg-gray-600 cursor-pointer transition-colors"
              >
                使用本地伺服器
              </button>
              <button
                onClick={handleUseProd}
                className="bg-gray-700 px-4 py-2 rounded-md flex-1 hover:bg-gray-600 cursor-pointer transition-colors"
              >
                使用生產伺服器
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
          // 只使用生產環境 URL
          const baseUrl = API_CONFIG.PROD;
          console.log(`正在獲取用戶資料...`);
          
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
              }
            }
          } catch (error) {
            // 靜默處理錯誤，不在控制台輸出
          }
        } catch (error) {
          // 靜默處理錯誤，不在控制台輸出
        }
      };
      
      loadUserData();
    }
  }, [isLoggedIn, userId]);

  useEffect(() => {
    if (isLoggedIn) {
      // 完全重寫新聞獲取邏輯，專門處理生產環境問題
      const fetchNews = async () => {
        try {
          // 直接使用生產環境 URL
          const baseUrl = API_CONFIG.PROD;
          
          try {
            const response = await fetch(`${baseUrl}/api/news`, {
              method: 'GET',
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data && Array.isArray(data)) {
                console.log(`✓ 成功獲取新聞資料`);
                setNews(data);
                return;
              }
            }
          } catch (error) {
            // 靜默處理錯誤，不在控制台輸出
          }
          
          // 如果失敗，使用備用數據
          setNews([{
            id: 1,
            titleZh: "無法連接到新聞服務",
            contentZh: "目前無法獲取最新新聞，請稍後再試。",
            timeago: "剛才",
            timestamp: Date.now()
          }]);
        } catch (error) {
          // 靜默處理錯誤，不在控制台輸出
        }
      };
      
      // 調用新聞獲取函數
      fetchNews().catch(error => {
        console.error('獲取新聞時發生未處理的錯誤:', error);
        setNews([{
          id: 1,
          titleZh: "無法連接到新聞服務",
          contentZh: "發生了未知錯誤，請稍後再試。",
          timeago: "剛才",
          timestamp: Date.now()
        }]);
      });
      
      // 仍然嘗試獲取指數數據，但使用單獨的函數
      const fetchIndexData = async () => {
        try {
          // 直接使用生產環境 URL
          const baseUrl = API_CONFIG.PROD;
          
          const response = await fetch(`${baseUrl}/api/index`, {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          if (response.ok) {
            // 成功獲取數據，但不輸出日誌
            return;
          }
        } catch (error) {
          // 靜默處理錯誤，不在控制台輸出
        }
      };
      
      fetchIndexData().catch(error => {
        console.error('獲取指數數據時發生未處理的錯誤:', error);
        });
    }
  }, [isLoggedIn]);

  const handleLogin = async () => {
    setLoginError("");
    if (!account || !password) {
      setLoginError("帳號和密碼不能為空");
      return;
    }
    
    const result = await callApi({
      endpoint: '/api/login',
      method: 'POST',
      data: { id: account, password: password },
      successLogType: LOG_TYPES.LOGIN_SUCCESS,
      errorLogType: LOG_TYPES.LOGIN_ERROR
    });
    
    if (result.success) {
      const { id, control, note } = result.data;
      
      setIsLoggedIn(true);
      setUserId(id);
      setIsAdmin(control === "true");
      
      if (note && Array.isArray(note)) {
        const sortedNotes = [...note].sort((a, b) => b.timestamp - a.timestamp);
        setMemos(sortedNotes);
      }
      
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userId', id);
      localStorage.setItem('isAdmin', control === "true");
      if (note && Array.isArray(note)) {
        localStorage.setItem('memos', JSON.stringify(note));
      }
      
      log(LOG_TYPES.API_SUCCESS, result.env);
      log(LOG_TYPES.LOGIN_SUCCESS, `${id}, 管理員權限: ${control}`);
    } else {
      setLoginError("無法連接到伺服器，請稍後再試");
    }
  };

  // 新增一個立即保存筆記狀態的函數
  const saveMemosState = (updatedMemos) => {
    // 保存到localStorage
    localStorage.setItem('memos', JSON.stringify(updatedMemos));
    // 保存到sessionStorage，作為備份和最新狀態
    sessionStorage.setItem('pendingMemos', JSON.stringify(updatedMemos));
    // 設置狀態
    setMemos(updatedMemos);
    // 標記有未保存的更改
    setHasUnsavedChanges(true);
    // 設置需要同步的標記
    localStorage.setItem('needsSync', 'true');
    
    // 立即執行同步而不是等待，使用緊急同步模式
    setTimeout(() => {
      syncNotesToServer(true, true).then(success => {
        if (success) {
          console.log('筆記狀態已成功使用緊急模式同步到服務器');
          setHasUnsavedChanges(false);
        } else {
          console.error('無法立即同步筆記，將在稍後重試');
        }
      });
    }, 100); // 很短的延遲，讓UI先更新
  };

  const handleAddMemo = async (data) => {
    console.log("添加新筆記", data);

    // 防止重複提交
    if (isAddingMemo) {
      console.warn("已有筆記添加請求正在處理中...");
      return;
    }

    try {
      setIsAddingMemo(true);
      
      // 生成新筆記
      const timestamp = Date.now().toString();
      const newMemo = {
        ...data,
        timestamp,
        lastModified: Date.now()
      };
      
      console.log("生成新筆記", newMemo);
      
      // 更新本地狀態
      const updatedMemos = [...memos, newMemo];
      setMemos(updatedMemos);
      
      // 立即保存到本地存儲
      saveMemosToLocalStorage(updatedMemos);
      
      // 在session storage中設置新筆記標記，以防刷新頁面
      try {
        let pendingNewMemos = [];
        const pendingMemosStr = sessionStorage.getItem('pendingNewMemos');
        if (pendingMemosStr) {
          pendingNewMemos = JSON.parse(pendingMemosStr);
        }
        pendingNewMemos.push(newMemo);
        sessionStorage.setItem('pendingNewMemos', JSON.stringify(pendingNewMemos));
      } catch (e) {
        console.error("無法保存待處理的新筆記到session storage", e);
      }
      
      // 設置需要同步標記
      localStorage.setItem('needsSync', 'true');
      
      // 立即執行同步到伺服器
      try {
        console.log("正在嘗試立即同步到伺服器");
        const syncSuccess = await forceSyncToServer();
        if (syncSuccess) {
          console.log("✅ 新筆記立即同步成功");
          // 清除待處理的新筆記標記
          sessionStorage.removeItem('pendingNewMemos');
        } else {
          console.warn("⚠️ 新筆記立即同步失敗，將在下次啟動時嘗試");
        }
      } catch (syncError) {
        console.error("新筆記同步出錯", syncError);
      }
      
      // 立即從服務器獲取最新數據，以確保數據一致性
      try {
        await fetchLatestNotesFromServer();
      } catch (fetchError) {
        console.error("獲取最新筆記失敗", fetchError);
      }
      
      return newMemo;
    } catch (error) {
      console.error("添加筆記過程出錯", error);
      throw error;
    } finally {
      setIsAddingMemo(false);
    }
  };

  const handleDeleteMemo = async (timestamp) => {
    console.log("準備刪除筆記", timestamp);
    
    if (!timestamp) {
      console.error("無法刪除：缺少時間戳");
      return;
    }

    // 找到要刪除的筆記
    const memoToDelete = memos.find(memo => memo.timestamp === timestamp);
    if (!memoToDelete) {
      console.error("找不到要刪除的筆記", timestamp);
      return;
    }
    
    // 在刪除前先保存被刪除的筆記，以便在同步時通知伺服器
    try {
      let deletedNotes = [];
      const deletedNotesStr = sessionStorage.getItem('deletedNotes');
      if (deletedNotesStr) {
        try {
          deletedNotes = JSON.parse(deletedNotesStr);
        } catch (e) {
          console.error("解析已刪除筆記失敗", e);
          deletedNotes = [];
        }
      }
      
      // 確保不重複添加
      if (!deletedNotes.some(note => note.timestamp === memoToDelete.timestamp)) {
        deletedNotes.push(memoToDelete);
        sessionStorage.setItem('deletedNotes', JSON.stringify(deletedNotes));
        console.log("已將筆記標記為待刪除", memoToDelete);
      }
    } catch (e) {
      console.error("保存待刪除筆記失敗", e);
    }
    
    // 從本地狀態中移除
    const updatedMemos = memos.filter(memo => memo.timestamp !== timestamp);
    
    // 更新狀態
    console.log("更新後的筆記數量", updatedMemos.length);
    setMemos(updatedMemos);
    
    // 立即保存到本地存儲
    saveMemosToLocalStorage(updatedMemos);
    
    // 設置需要同步標記
    localStorage.setItem('needsSync', 'true');
    
    // 立即執行同步到伺服器
    try {
      console.log("嘗試立即同步刪除操作到伺服器");
      const syncSuccess = await forceSyncToServer();
      if (syncSuccess) {
        console.log("✅ 刪除操作立即同步成功");
      } else {
        console.warn("⚠️ 刪除操作立即同步失敗，將在下次啟動時嘗試");
      }
    } catch (syncError) {
      console.error("刪除同步出錯", syncError);
    }
    
    // 立即從服務器獲取最新數據
    try {
      await fetchLatestNotesFromServer();
    } catch (fetchError) {
      console.error("獲取最新筆記失敗", fetchError);
    }
  };

  const handleNewsClick = (newsItem) => {
    setSelectedNews(newsItem);
  };

  const handleBackToList = () => {
    setSelectedNews(null);
  };

  const NewsDetail = ({ news }) => {
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [selectedSections, setSelectedSections] = useState({
      intro: true,
      summary: true,
      detail: false,
      original: false,
      source: false
    });

    const handleAddToNote = () => {
      setShowSelectionModal(true);
    };
    
    const handleConfirmAddToNote = () => {
      const hasSelection = Object.values(selectedSections).some(value => value);
      
      if (!hasSelection) {
        setEditingTitle(news.titleZh);
        setEditingContent("");
        setIsNoteModalOpen(true);
        setShowSelectionModal(false);
        return;
      }
      
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

      setEditingTitle(news.titleZh);
      setEditingContent(newsContent.trim());
      setIsNoteModalOpen(true);
      setShowSelectionModal(false);
    };
    
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
        
        {showSelectionModal && <SelectionModal />}
      </div>
    );
  };

  const handleTouchStart = (e, index) => {
    touchStartX.current = e.touches[0].clientX;
    setIsSliding(true);
    setHasMoved(false);
  };

  const handleTouchMove = (e, index) => {
    if (!touchStartX.current) return;

    const currentX = e.touches[0].clientX;
    const diff = touchStartX.current - currentX;
    setHasMoved(true);

    if (diff > 0) {
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
  };

  const handleMouseDown = (e, index) => {
    touchStartX.current = e.clientX;
    setIsSliding(true);
    setHasMoved(false);
  };

  const handleMouseMove = (e, index) => {
    if (!touchStartX.current) return;

    const currentX = e.clientX;
    const diff = touchStartX.current - currentX;
    setHasMoved(true);

    if (diff > 0) {
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
  };

  const handleMouseUp = (index) => {
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
    
    if (slidingTimeoutRef.current) {
      clearTimeout(slidingTimeoutRef.current);
    }
    slidingTimeoutRef.current = setTimeout(() => {
      setIsSliding(false);
    }, 100);
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
    
    if (slidingTimeoutRef.current) {
      clearTimeout(slidingTimeoutRef.current);
    }
    slidingTimeoutRef.current = setTimeout(() => {
      setIsSliding(false);
    }, 100);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  const handleMemoClick = (memo, index) => {
    setSelectedMemo(index);
    setEditingTitle(memo.title || "");
    setEditingContent(memo.content || "");
    setIsEditMode(true);
    setIsNoteModalOpen(true);
  };

  const handleCloseNoteModal = () => {
    setIsNoteModalOpen(false);
    setEditingTitle("");
    setEditingContent("");
    setSelectedMemo(null);
    setIsEditMode(false);
  };

  const NoteModal = () => {
    const [localTitle, setLocalTitle] = useState(editingTitle);
    const [localContent, setLocalContent] = useState(editingContent);

    useEffect(() => {
      setLocalTitle(editingTitle);
      setLocalContent(editingContent);
    }, [editingTitle, editingContent]);
    
    const handleSaveNote = async () => {
      if (localTitle.trim() || localContent.trim()) {
        const noteData = {
          title: localTitle.trim() || localContent.trim(),
          content: localContent.trim(),
          timestamp: isEditMode && selectedMemo !== null ? memos[selectedMemo].timestamp : Date.now(),
        };
        
        let updatedMemos;
        if (isEditMode && selectedMemo !== null) {
          updatedMemos = [...memos];
          updatedMemos[selectedMemo] = noteData;
        } else {
          updatedMemos = [noteData, ...memos];
        }
        
        localStorage.setItem('memos', JSON.stringify(updatedMemos));
        setMemos(updatedMemos);
        setHasUnsavedChanges(true);
        
        setIsNoteModalOpen(false);
        setEditingTitle("");
        setEditingContent("");
        setSelectedMemo(null);
        setIsEditMode(false);
        
        try {
          const syncResult = await syncNotesToServer(true);
          if (syncResult) {
            setHasUnsavedChanges(false);
          }
        } catch (error) {
          console.error('同步失敗，將在下次重新整理時重試');
        }
      }
    };

    useEffect(() => {
      const handleBeforeUnload = (e) => {
        if (hasUnsavedChanges) {
          const message = "您有未保存的筆記更改，確定要離開嗎？";
          e.returnValue = message;
          return message;
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }, [hasUnsavedChanges]);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div  
          className="bg-gray-800 p-4 md:p-6 rounded-lg w-full md:w-3/4 max-w-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg md:text-xl font-semibold text-yellow-400">
              {isEditMode ? '編輯筆記' : '新增筆記'}
            </h2>
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
              {isEditMode ? '更新' : '儲存'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleGaugeAddToNote = (gaugeStatus, type = '恐懼貪婪') => {
    setEditingTitle(`${type}指數快照`);
    setEditingContent(gaugeStatus);
    setIsEditMode(false);
    setSelectedMemo(null);
    setIsNoteModalOpen(true);
  };

  const handleMoreNewsClick = () => {
    setShowDevelopingModal(true);
  };
  
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

  const handleAddNewDataClick = () => {
    setShowDevelopingModal(true);
  };
  
  const AddNewDataButton = () => {
    const handleContainerClick = (e) => {
      e.stopPropagation();
    };

    return (
      <div 
        className="w-full bg-gray-700 p-4 rounded-lg"
        onClick={handleContainerClick}
        style={{ aspectRatio: "1/1" }}
      >
        <div className="flex flex-col items-center justify-center h-full">
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

  const syncNotesToServer = async (forceSync = false, immediateSync = false) => {
    if (!isLoggedIn || !userId) return false;
    if (memos.length === 0 && !forceSync) return false;
    if (isSyncing) return false;
    
    setIsSyncing(true);
    
    try {
      sessionStorage.setItem('syncInProgress', 'true');
      sessionStorage.setItem('pendingMemos', JSON.stringify(memos));
      sessionStorage.setItem('syncStartTime', Date.now().toString());
      
      const memosWithTimestamp = memos.map(memo => ({
        ...memo,
        lastModified: memo.lastModified || Date.now()
      }));
      
      const result = await callApi({
        endpoint: '/api/notes/save',
        method: 'POST',
        data: { 
          userId, 
          notes: memosWithTimestamp,
          immediateSync
        },
        timeout: 15000
      });
      
      if (result.success) {
        setLastSyncTime(Date.now());
        localStorage.setItem('lastSyncTime', Date.now().toString());
        sessionStorage.setItem('lastSyncTime', Date.now().toString());
        localStorage.removeItem('needsSync');
        sessionStorage.removeItem('syncInProgress');
        
        sessionStorage.setItem('lastSuccessfulSync', JSON.stringify(memos));
        localStorage.setItem('memos', JSON.stringify(memos));
        
        setHasUnsavedChanges(false);
        console.log('✓ 筆記同步成功');
        return true;
      }
      
      localStorage.setItem('needsSync', 'true');
      sessionStorage.setItem('syncFailed', 'true');
      return false;
    } catch (error) {
      localStorage.setItem('needsSync', 'true');
      sessionStorage.setItem('syncFailed', 'true');
      return false;
    } finally {
      setIsSyncing(false);
      sessionStorage.removeItem('syncInProgress');
    }
  };
  
  // 強制同步到伺服器的函數
  const forceSyncToServer = async () => {
    if (!isLoggedIn || !userId) return false;
    
    console.log('執行強制同步到伺服器...');
    
    try {
      // 儲存當前狀態到會話存儲
      sessionStorage.setItem('forceSyncInProgress', 'true');
      
      // 獲取本地儲存的筆記
      let notesToSync = [];
      try {
        const savedMemos = localStorage.getItem('memos');
        if (savedMemos) {
          notesToSync = JSON.parse(savedMemos);
        }
      } catch (e) {
        console.error('解析本地筆記出錯', e);
        return false;
      }
      
      // 獲取被刪除的筆記
      let deletedNotes = [];
      try {
        const deletedNotesStr = sessionStorage.getItem('deletedNotes');
        if (deletedNotesStr) {
          deletedNotes = JSON.parse(deletedNotesStr);
          console.log(`找到 ${deletedNotes.length} 個待刪除的筆記`);
        }
      } catch (e) {
        console.error('讀取刪除筆記列表失敗', e);
      }
      
      // 設置筆記最後修改時間
      const memosWithTimestamp = notesToSync.map(memo => ({
        ...memo,
        lastModified: memo.lastModified || Date.now()
      }));
      
      // 嘗試使用 callApi 函數
      try {
        const result = await callApi({
          endpoint: '/api/notes/save',
          method: 'POST',
          data: { 
            userId, 
            notes: memosWithTimestamp,
            deletedNotes,
            forceFullSync: true,
            immediateSync: true,
            urgent: true
          },
          timeout: 15000
        });
        
        if (result.success) {
          console.log('✅ 強制同步成功');
          
          // 更新同步狀態
          localStorage.setItem('lastSyncTime', Date.now().toString());
          localStorage.removeItem('needsSync');
          
          // 如果有刪除操作並同步成功，清除會話存儲中的刪除記錄
          if (deletedNotes.length > 0) {
            sessionStorage.removeItem('deletedNotes');
          }
          
          return true;
        } else {
          // 如果 callApi 失敗，嘗試直接使用 fetch
          console.warn('callApi 同步失敗，嘗試使用直接 fetch 方法');
        }
      } catch (callApiError) {
        console.warn('callApi 執行出錯，嘗試使用直接 fetch 方法', callApiError);
      }
      
      // 如果 callApi 失敗，嘗試直接使用 fetch API
      console.log('嘗試使用直接 fetch 同步筆記...');
      
      // 嘗試兩個可能的 API 端點
      const apiUrls = [
        API_CONFIG.LOCAL, 
        API_CONFIG.PROD
      ];
      
      for (const baseUrl of apiUrls) {
        try {
          console.log(`嘗試向 ${baseUrl}/api/notes/save 同步筆記...`);
          
          const response = await fetch(`${baseUrl}/api/notes/save`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId, 
              notes: memosWithTimestamp,
              deletedNotes,
              forceFullSync: true,
              immediateSync: true,
              urgent: true
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            
            if (result.success) {
              console.log(`✅ 通過 ${baseUrl} 強制同步成功`);
              
              // 更新同步狀態
              localStorage.setItem('lastSyncTime', Date.now().toString());
              localStorage.removeItem('needsSync');
              
              // 如果有刪除操作並同步成功，清除會話存儲中的刪除記錄
              if (deletedNotes.length > 0) {
                sessionStorage.removeItem('deletedNotes');
              }
              
              return true;
            }
          }
        } catch (fetchError) {
          console.warn(`通過 ${baseUrl} 直接同步失敗:`, fetchError);
          continue;
        }
      }
      
      // 如果所有嘗試都失敗
      console.error('所有同步嘗試都失敗');
      return false;
    } catch (error) {
      console.error('強制同步過程中出錯', error);
      return false;
    } finally {
      sessionStorage.removeItem('forceSyncInProgress');
    }
  };
  
  // 從伺服器獲取最新筆記的函數
  const fetchLatestNotesFromServer = async () => {
    if (!isLoggedIn || !userId) return false;
    
    console.log('從伺服器獲取最新筆記...');
    
    try {
      // 使用callApi函數獲取用戶筆記，保持一致性
      const result = await callApi({
        endpoint: `/api/users`,
        method: 'GET',
        timeout: 10000
      });
      
      if (result.success && result.data && Array.isArray(result.data)) {
        // 找到當前用戶的數據
        const currentUser = result.data.find(user => user.id === userId);
        
        if (currentUser && Array.isArray(currentUser.note)) {
          console.log(`✅ 成功從伺服器獲取 ${currentUser.note.length} 條筆記`);
          
          // 更新本地存儲和狀態
          localStorage.setItem('memos', JSON.stringify(currentUser.note));
          setMemos(currentUser.note);
          
          // 更新最後同步時間
          setLastSyncTime(Date.now());
          localStorage.setItem('lastSyncTime', Date.now().toString());
          
          return true;
        } else {
          console.warn('找不到當前用戶的筆記數據');
          return false;
        }
      } else {
        // 如果API返回失敗或格式不正確
        console.warn('伺服器返回的筆記格式不正確或API失敗');
        return false;
      }
    } catch (error) {
      console.error('獲取伺服器筆記失敗:', error);
      return false;
    }
  };

  useEffect(() => {
    const syncTimeout = setTimeout(() => {
      if (isLoggedIn && userId && memos.length > 0) {
        localStorage.setItem('memos', JSON.stringify(memos));
        
        const timeSinceLastSync = Date.now() - (lastSyncTime || 0);
        if (timeSinceLastSync > 5000) {
          syncNotesToServer(false);
        }
      }
    }, 1000);

    return () => clearTimeout(syncTimeout);
  }, [memos, isLoggedIn, userId]);

  const loadSavedNotes = async () => {
    console.log('載入已保存的筆記...');
    
    // 先直接從伺服器獲取最新筆記
    if (userId) {
      try {
        console.log('嘗試從伺服器獲取最新筆記...');
        
        // 使用 fetch 直接請求用戶的最新筆記
        const baseUrl = window.API_CONFIG?.getBaseUrl() || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/user/notes?userId=${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'omit'
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.notes) {
            console.log(`✅ 成功從伺服器獲取${result.notes.length}條筆記`);
            setMemos(result.notes);
            // 保存到本地存儲
            localStorage.setItem('memos', JSON.stringify(result.notes));
            // 更新同步時間
            const syncTimestamp = Date.now().toString();
            localStorage.setItem('lastSyncTime', syncTimestamp);
            sessionStorage.setItem('lastSyncTime', syncTimestamp);
            return;
          }
        }
        console.log('從伺服器獲取筆記失敗，將嘗試從本地讀取...');
      } catch (error) {
        console.error('從伺服器獲取筆記時發生錯誤:', error);
        console.log('將嘗試從本地讀取筆記...');
      }
    }
    
    // 如果從伺服器獲取失敗，則從本地存儲讀取
    try {
      let parsedMemos = [];
      const savedMemos = localStorage.getItem('memos');
      
      if (savedMemos) {
        try {
          parsedMemos = JSON.parse(savedMemos);
          console.log(`從本地存儲讀取了 ${parsedMemos.length} 條筆記`);
        } catch (parseError) {
          console.error('解析本地存儲的筆記失敗:', parseError);
          parsedMemos = [];
        }
      }
      
      if (userId) {
        // 合并本地筆記和伺服器筆記
        const mergedMemos = await mergeMemos(parsedMemos, []);
        setMemos(mergedMemos);
      } else {
        setMemos(parsedMemos);
      }
    } catch (error) {
      console.error('讀取本地存儲的筆記時發生錯誤:', error);
      setMemos([]);
    }
  };

  const mergeMemos = (localMemos, serverMemos) => {
    const memoMap = new Map();
    
    localMemos.forEach(memo => {
      memoMap.set(memo.timestamp, memo);
    });
    
    serverMemos.forEach(memo => {
      if (!memoMap.has(memo.timestamp) || 
          memo.lastModified > memoMap.get(memo.timestamp).lastModified) {
        memoMap.set(memo.timestamp, memo);
      }
    });
    
    return Array.from(memoMap.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  };

  useEffect(() => {
    if (isLoggedIn && userId) {
      const loadUserNotes = async () => {
        const result = await callApi({
          endpoint: '/api/users',
          method: 'GET'
        });
        
        if (result.success) {
          const currentUser = result.data.find(user => user.id === userId);
          if (currentUser && currentUser.note) {
            setMemos(currentUser.note);
            localStorage.setItem('memos', JSON.stringify(currentUser.note));
          }
        }
      };
      
      loadUserNotes();
    }
  }, [isLoggedIn, userId]);

  useEffect(() => {
    if (isLoggedIn) {
      console.log("用戶已登入，啟動自動同步");
      const cleanup = setupAutoSync();
      
      return cleanup;
    }
  }, [isLoggedIn]);

  // 自動同步函數，設定定時器定期檢查並同步筆記
  const setupAutoSync = () => {
    // 設置同步需求標記
    const needsSync = () => {
      return localStorage.getItem('needsSync') === 'true' || 
             sessionStorage.getItem('deletedNotes') !== null;
    };

    // 定時檢查是否需要同步
    const syncInterval = setInterval(() => {
      // 只有當真正需要同步時才執行
      if (needsSync()) {
        // 減少日誌輸出，只在真正需要同步時輸出一次
        syncNotesToServer(false);
      }
    }, 30000);

    return () => {
      clearInterval(syncInterval);
    };
  };

  // 在組件掛載時設置自動同步
  useEffect(() => {
    const cleanup = setupAutoSync();
    
    // 在組件卸載時清除
    return cleanup;
  }, []);

  // 在頁面加載時檢查和恢復筆記
  useEffect(() => {
    if (isLoggedIn) {
      const loadInitialNotes = async () => {
        console.log("頁面加載，正在初始化筆記...");
        
        // 首先嘗試從本地存儲恢復筆記
        try {
          const savedMemos = localStorage.getItem('memos');
          if (savedMemos) {
            try {
              const parsedMemos = JSON.parse(savedMemos);
              console.log(`從本地存儲恢復了 ${parsedMemos.length} 條筆記`);
              setMemos(parsedMemos);
            } catch (error) {
              console.error('解析本地筆記失敗:', error);
            }
          }
        } catch (e) {
          console.error("讀取本地存儲筆記失敗", e);
        }
        
        // 檢查是否有未處理的操作
        const pendingNewMemosStr = sessionStorage.getItem('pendingNewMemos');
        const deletedNotesStr = sessionStorage.getItem('deletedNotes');
        
        const hasPendingNewMemos = pendingNewMemosStr && JSON.parse(pendingNewMemosStr).length > 0;
        const hasPendingDeletes = deletedNotesStr && JSON.parse(deletedNotesStr).length > 0;
        
        // 如果有未處理的操作，立即同步
        if (hasPendingNewMemos || hasPendingDeletes || localStorage.getItem('needsSync') === 'true') {
          console.log("檢測到未處理的操作，執行緊急同步");
          try {
            const syncResult = await forceSyncToServer();
            if (syncResult) {
              console.log("✅ 初始化時的緊急同步成功");
            } else {
              console.warn("⚠️ 初始化時的緊急同步失敗");
            }
          } catch (syncError) {
            console.error("初始化同步出錯", syncError);
          }
        }
        
        // 無論如何都從伺服器獲取最新筆記
        try {
          console.log("從伺服器獲取最新筆記...");
          const fetchResult = await fetchLatestNotesFromServer();
          if (fetchResult) {
            console.log("✅ 成功獲取伺服器最新筆記");
            localStorage.setItem('lastSyncTime', Date.now().toString());
          }
        } catch (fetchError) {
          console.error("獲取伺服器筆記失敗", fetchError);
        }
      };
      
      loadInitialNotes();
    }
  }, [isLoggedIn]);

  // 在用戶ID變化時重新獲取筆記
  useEffect(() => {
    if (isLoggedIn && userId) {
      console.log(`用戶ID變化為: ${userId}，重新獲取筆記`);
      fetchLatestNotesFromServer().catch(error => {
        console.error("根據用戶ID獲取筆記失敗", error);
      });
    }
  }, [userId, isLoggedIn]);

  // 在登入狀態變化時重新設置自動同步
  useEffect(() => {
    if (isLoggedIn) {
      console.log("用戶已登入，啟動自動同步");
      const cleanup = setupAutoSync();
      
      return cleanup;
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    // 如果 API 不健康，顯示錯誤畫面
    if (!apiHealthy) {
      return <ApiErrorFallback />;
    }
    
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

  // 如果 API 不健康，顯示錯誤畫面
  if (!apiHealthy) {
    return <ApiErrorFallback />;
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col md:flex-row">
      <aside className="bg-gray-800 p-4 md:p-6 md:w-64 border-b md:border-r md:border-b-0 border-gray-700 md:h-screen md:sticky md:top-0 flex flex-col">
        <h1 className="text-xl md:text-2xl font-bold text-yellow-400 mb-4">Crypto Memo</h1>
        
        <form 
          className="mb-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleAddMemo();
          }}
        >
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
              className="bg-yellow-500 w-full p-2 rounded-md hover:bg-yellow-600 transition-colors font-medium cursor-pointer"
            >
              新增
            </button>
          </div>
          
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
              className="bg-yellow-500 px-3 py-2 rounded-r-md hover:bg-yellow-600 transition-colors flex-shrink-0 cursor-pointer"
        >
          新增
        </button>
          </div>
        </form>

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
                if (hasMoved || slidePosition[index] > 0) {
                  return;
                }
                handleMemoClick(item, index);
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
                  handleDeleteMemo(item.timestamp);
                }}
                className="absolute right-0 top-0 h-full bg-red-500 hover:bg-red-600 transition-all flex items-center justify-center"
                style={{
                  width: "60px",
                  transform: `translateX(${60 - (slidePosition[index] || 0)}px)`,
                }}
              >
                刪除
              </button>
            </div>
          ))}
        </div>
      </aside>

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
      
      <aside className="bg-gray-800 p-4 md:p-6 md:w-64 border-t md:border-l md:border-t-0 border-gray-700 md:h-screen md:sticky md:top-0">
        <h2 className="text-lg md:text-xl font-semibold mb-4 text-yellow-400 text-center">
          相關數據
        </h2>
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center space-y-4">
          <div className="w-full bg-gray-700 p-4 rounded-lg">
            <GaugeChart onAddToNote={handleGaugeAddToNote} />
          </div>
          <div className="w-full bg-gray-700 p-4 rounded-lg">
            <AltcoinIndex onAddToNote={handleGaugeAddToNote} />
          </div>
          
          <AddNewDataButton />
          </div>
      </aside>

      {isNoteModalOpen && <NoteModal />}
      {showDevelopingModal && <DevelopingModal />}
    </div>
  );
}

export default App;

