import React, { useEffect, useState } from "react";
import { ArcElement, Chart as ChartJS, Tooltip } from "chart.js";
import axios from "axios";
import { conditionalLog, conditionalError } from "./utils/logger";

ChartJS.register(ArcElement, Tooltip);

const AltcoinIndex = ({ onAddToNote }) => {
  const [indexValue, setIndexValue] = useState(50);
  const [status, setStatus] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState(null);
  // 新增一個狀態用於追踪移動設備上的觸控激活狀態
  const [isTouchActive, setIsTouchActive] = useState(false);
  // 添加狀態變數來追蹤是否已輸出成功日誌
  const [hasLoggedSuccess, setHasLoggedSuccess] = useState(false);
  // 添加狀態變數來追蹤 tooltip 是否顯示
  const [showTooltip, setShowTooltip] = useState(false);

  // 添加處理觸控事件的函數
  const handleTouchStart = () => {
    setIsTouchActive(true);
  };

  const handleTouchEnd = () => {
    // 使用延遲關閉，提供足夠時間給用戶點擊按鈕
    setTimeout(() => {
      setIsTouchActive(false);
    }, 1500); // 1.5秒後隱藏按鈕
  };

  // 添加處理圖標點擊事件
  const handleInfoClick = () => {
    // 在移動設備上切換 tooltip 顯示狀態
    if (window.innerWidth < 768) {
      setShowTooltip(!showTooltip);
      // 如果顯示了 tooltip，2秒後自動隱藏
      if (!showTooltip) {
        setTimeout(() => {
          setShowTooltip(false);
        }, 3000);
      }
    }
  };

  // 新增狀態轉換對照表
  const translateText = {
    "Altcoin Month Index": "山寨幣月份指數",
    "It is not Altcoin Month!": "現在不是山寨幣月份",
    "It is Altcoin Month!": "現在是山寨幣月份",
    "It is Bitcoin Month!": "現在是比特幣月份"
  };
  
  // 將 tooltipText 字符串調整為更緊湊的格式
  const tooltipText = `如果在過去 30 天內，有 75% 的前 50 大加密貨幣的表現優於比特幣，那麼就可以稱為「山寨幣月」（Altcoin Month）`;

  useEffect(() => {
    const fetchAltcoinIndex = async () => {
      // 定義要嘗試的 API 端點
      const endpoints = [
        'http://localhost:3000/api/index',
        'https://crypto-memo-production.up.railway.app/api/index',
      ];
      
      let succeeded = false;
      
      // 使用 console.log 確保一定會輸出
      console.log("🔄 正在嘗試獲取山寨幣月份指數...");
      
      // 依序嘗試每個端點
      for (const endpoint of endpoints) {
        try {
          // 每次嘗試都明確記錄
          console.log(`嘗試連接到: ${endpoint}`);
          
          const response = await axios.get(endpoint, { timeout: 5000 }); // 增加超時時間
          
          // 找到對應的指數資料
          const altcoinData = response.data.find(item => item.id === "altcoin-index");
          
          if (altcoinData && altcoinData.data) {
            const data = altcoinData.data;
            
            // 明確標記成功連接的端點
            console.log(`✅ 成功連接到: ${endpoint}`);
            console.log("📊 最新山寨幣指數:", {
              時間戳記: data.timestamp,
              數值: data.value,
              狀態: data.status
            });

            setIndexValue(parseInt(data.value));
            // 使用對照表轉換狀態文字
            setStatus(translateText[data.status] || data.status);
            setTitle(translateText[data.title] || data.title);

            succeeded = true;
            break; // 成功取得數據後跳出迴圈
          } else {
            console.log(`❓ 在 ${endpoint} 回應中找不到山寨幣指數資料`);
          }
        } catch (error) {
          console.log(`❌ 連接到 ${endpoint} 失敗: ${error.message}`);
        }
      }
      
      // 如果所有端點都失敗
      if (!succeeded) {
        const errorMsg = "無法獲取山寨幣月份指數資料";
        console.error("❌ " + errorMsg);
        setError(errorMsg);
      } else {
        setError(null); // 清除任何之前的錯誤
      }
    };

    fetchAltcoinIndex();
  }, []);

  const handleAddToNote = () => {
    const currentStatus = `山寨幣月份指數
數值: ${indexValue}
狀態: ${status}
時間: ${new Date().toLocaleString("zh-TW", {
  timeZone: "Asia/Taipei",
})}`;

    onAddToNote(currentStatus, '山寨幣月份');  // 傳入類型參數
  };

  return (
    <div 
      className="flex flex-col items-center justify-center w-full relative mt-4"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-center mb-2">
        <h3 className="text-xl font-semibold text-center text-white">
          {title || "山寨幣月份指數"}
        </h3>
        
        {/* 滑鼠懸停或觸控後顯示 tooltip */}
        <div className="group relative ml-2 inline-block">
          <span 
            className="text-yellow-500 cursor-help"
            onClick={handleInfoClick}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
          </span>
            
          {/* 提示框 - 桌面上懸停時顯示，移動裝置上點擊後顯示 */}
          <div className={`bg-gray-800 text-white text-xs rounded-lg py-2 px-3 absolute z-50 transition-opacity duration-300 w-40 right-auto top-0 -left-32 pointer-events-none shadow-lg border border-gray-700 whitespace-normal
            ${(showTooltip || false) ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}`}>
            {tooltipText}
          </div>
        </div>
      </div>
      
      {error ? (
        <div className="text-red-500 text-center p-4">
          <p>{error}</p>
        </div>
      ) : (
        <>
          <p className="text-center text-yellow-200/70 mb-2">
            {status}
          </p>
          <div className="text-6xl font-bold text-blue-500">
            {indexValue}
          </div>
          {/* 修改 + 按鈕，在移動設備上僅在觸摸後顯示 */}
          <button
            onClick={handleAddToNote}
            className={`absolute bottom-2 right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center 
              transition-opacity duration-200 cursor-pointer hover:bg-yellow-600
              ${isTouchActive ? 'opacity-100' : 'opacity-0 md:hover:opacity-100'}`}
          >
            <span className="text-xl font-bold text-white">+</span>
          </button>
        </>
      )}
    </div>
  );
};

export default AltcoinIndex;