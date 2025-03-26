import React, { useEffect, useState } from "react";
import { ArcElement, Chart as ChartJS, Tooltip } from "chart.js";
import axios from "axios";
import { conditionalLog, conditionalError } from "./utils/logger";
import { log, LOG_TYPES } from "./utils/logger";
import { callApi } from "./utils/logger";

ChartJS.register(ArcElement, Tooltip);

// 在組件頂部添加 formatTimestamp 函數
const formatTimestamp = (timestamp) => {
  // 將字符串時間戳轉換為數字並乘以1000（轉換為毫秒）
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).replace(/\//g, "")
    .replace(/(\d{4})(\d{2})(\d{2})/, "$1年$2月$3日 ")
    .replace(/,/, "");
};

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
  const [timestamp, setTimestamp] = useState(null);
  const [showUpdateTime, setShowUpdateTime] = useState(false);

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
      const result = await callApi({
        endpoint: '/api/index',
        method: 'GET',
        timeout: 5000,
        successLogType: LOG_TYPES.ALTCOIN_SUCCESS,
        errorLogType: LOG_TYPES.ALTCOIN_ERROR
      });
      
      if (result.success && Array.isArray(result.data)) {
        const altcoinData = result.data.find(item => item.id === "altcoin-index");
        
        if (altcoinData && altcoinData.data) {
          const data = altcoinData.data;
          setIndexValue(parseInt(data.value));
          setStatus(translateText[data.status] || data.status);
          setTitle(translateText[data.title] || data.title);
          setTimestamp(data.timestamp);
          return;
        }
      }
      
      setError("無法獲取山寨幣月份指數資料");
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
      <div className="relative flex items-center justify-center">
        <h3 
          className="text-xl font-semibold text-center text-white cursor-help"
          onMouseEnter={() => setShowUpdateTime(true)}
          onMouseLeave={() => setShowUpdateTime(false)}
        >
          {title || "山寨幣月份指數"}
        </h3>
        
        {/* 添加 info 圖標 */}
        <div className="group relative ml-2 inline-block">
          <span 
            className="text-yellow-500 cursor-help"
            onClick={handleInfoClick}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
          </span>
          
          {/* 提示框 */}
          <div className={`bg-gray-800 text-white text-xs rounded-lg py-2 px-3 absolute z-50 transition-opacity duration-300 w-40 right-auto top-0 -left-32 pointer-events-none shadow-lg border border-gray-700 whitespace-normal
            ${(showTooltip || false) ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}`}>
            {tooltipText}
          </div>
        </div>

        {/* 時間提示框 */}
        {showUpdateTime && timestamp && (
          <div className="absolute z-10 bg-gray-800 text-white text-xs rounded-lg py-1 px-2 top-full mt-1 left-1/2 transform -translate-x-1/2 whitespace-nowrap border border-gray-700">
            更新時間：{formatTimestamp(timestamp)}
          </div>
        )}
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