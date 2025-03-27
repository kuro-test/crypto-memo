import React, { useEffect, useState } from "react";
import { ArcElement, Chart as ChartJS, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import axios from "axios";
import { log, LOG_TYPES, getApiEndpoint, switchToProd, callApi } from "./utils/logger";

ChartJS.register(ArcElement, Tooltip);

// 修改 formatTimestamp 函數
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

const GaugeChart = ({ onAddToNote }) => {
  const [indexValue, setIndexValue] = useState(50);
  const [label, setLabel] = useState("中性");
  const [error, setError] = useState(null);
  // 新增一個狀態用於追踪移動設備上的觸控激活狀態
  const [isTouchActive, setIsTouchActive] = useState(false);
  // 添加這個變數來確保只輸出一次成功日誌
  const [hasLoggedSuccess, setHasLoggedSuccess] = useState(false);
  const [timestamp, setTimestamp] = useState(null);
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

  useEffect(() => {
    const fetchFearAndGreedIndex = async () => {
      const result = await callApi({
        endpoint: '/api/index',
        method: 'GET',
        timeout: 8000,
        successLogType: LOG_TYPES.FEAR_GREED_SUCCESS,
        errorLogType: LOG_TYPES.FEAR_GREED_ERROR
      });
      
      if (result.success && Array.isArray(result.data)) {
        const fearGreedData = result.data.find(item => item.id === "fear&greed");
        
        if (fearGreedData && fearGreedData.data) {
          const data = fearGreedData.data;
          // 確保 value 被轉換為數字
          const value = parseInt(data.value) || 50;
          setIndexValue(value);
          setLabel(data.value_classification || "中性");
          setTimestamp(data.timestamp || Math.floor(Date.now() / 1000).toString()); 
          console.log(`成功從 ${result.env} 環境獲取恐懼貪婪指數: ${value} - ${data.value_classification}`);
          return;
        }
      } else {
        console.warn(`無法獲取恐懼貪婪指數資料，使用默認值`);
        setIndexValue(50);
        setLabel("中性");
        setTimestamp(Math.floor(Date.now() / 1000).toString());
        setError(`無法獲取恐懼貪婪指數資料: ${result.error || '未知錯誤'}`);
      }
    };

    fetchFearAndGreedIndex();
  }, []);

  // 設定顏色區間
  const backgroundColors = [
    "#ff0000", // 極度恐懼
    "#ff4500", // 恐懼
    "#ffa500", // 中性
    "#9acd32", // 貪婪
    "#008000"  // 極度貪婪
  ];

  // 設定對應區間的顏色
  const getColorIndex = (value) => {
    if (value < 20) return 0;
    if (value < 40) return 1;
    if (value < 60) return 2;
    if (value < 80) return 3;
    return 4;
  };

  // 獲取對應標籤的顏色
  const getLabelColorIndex = (labelText) => {
    const labels = {
      "極度恐懼": 0,
      "極度恐慌": 0,
      "恐懼": 1,
      "恐慌": 1,
      "中性": 2,
      "貪婪": 3,
      "極度貪婪": 4
    };
    return labels[labelText] !== undefined ? labels[labelText] : getColorIndex(indexValue);
  };

  // 設定儀表板數據
  const data = {
    datasets: [
      {
        data: [indexValue, 100 - indexValue], // Fear & Greed 數值
        backgroundColor: [
          backgroundColors[getColorIndex(indexValue)],
          "rgba(0, 0, 0, 0.1)", // 透明區域
        ],
        borderWidth: 0,
        cutout: "80%",
        rotation: 270,
        circumference: 180,
      },
    ],
  };

  const handleAddToNote = () => {
    const currentStatus = `比特幣恐懼貪婪指數
數值: ${indexValue}
狀態: ${label}
時間: ${new Date().toLocaleString("zh-TW", {
  timeZone: "Asia/Taipei",
})}`;

    onAddToNote(currentStatus);
  };

  return (
    <div 
      className="flex flex-col items-center justify-center w-full relative group"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative">
        <h3 
          className="text-base font-semibold text-white-400 cursor-help"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={() => {
            // 為移動設備特別優化：點擊標題時顯示更新時間提示
            if (window.innerWidth < 768) {
              setShowTooltip(!showTooltip);
              // 如果顯示了時間提示，3秒後自動隱藏
              if (!showTooltip) {
                setTimeout(() => {
                  setShowTooltip(false);
                }, 3000);
              }
            }
          }}
        >
          比特幣恐懼貪婪指數
        </h3>
        {/* 時間提示框 - 確保在移動設備上的點擊狀態下可見 */}
        {(showTooltip || false) && timestamp && (
          <div className="absolute z-10 bg-gray-800 text-white text-xs rounded-lg py-1 px-2 top-full mt-1 left-1/2 transform -translate-x-1/2 whitespace-nowrap border border-gray-700">
            更新時間：{formatTimestamp(timestamp)}
          </div>
        )}
      </div>
      
      {/* 大幅減少容器高度，使元素更緊湊 */}
      <div className="relative w-48 h-36 -mt-2">
        {/* 如果有錯誤則顯示錯誤訊息，否則顯示半圓圖表 */}
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center text-red-500 text-center p-4">
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* 半圓圖表 - 使用更小的尺寸確保圖表顯示在上方 */}
            <div className="transform scale-90 origin-top">
              <Doughnut 
                data={data} 
                options={{ 
                  cutout: "70%", 
                  rotation: 270, 
                  circumference: 180, 
                  maintainAspectRatio: false,
                  height: 150, // 預設為 150
                  width: 300,  // 預設為 300
                  layout: {
                    padding: {
                      top: 20,    // 上方邊距
                      right: 5,  // 右側邊距
                      bottom: 0, // 下方邊距
                      left: 10    // 左側邊距
                    }
                  },
                  plugins: {
                    legend: {
                      display: false  // 隱藏圖例
                    }
                  }
                }} 
              />
            </div>
            
            {/* 中心數值和狀態 - 明確定位避免重疊 */}
            <div className="absolute left-0 right-0 bottom-0 flex flex-col items-center">
              <p className="text-4xl font-bold">{indexValue}</p>
              {/* 增加狀態文字大小 */}
              <p className="text-lg font-bold" style={{ 
                color: backgroundColors[getLabelColorIndex(label)]
              }}>{label}</p>
            </div>
          </>
        )}
      </div>
      
      {/* 新增按鈕 - 保持在右下角 */}
      {!error && (
        <button
          onClick={handleAddToNote}
          className={`absolute bottom-2 right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center 
            md:opacity-0 md:group-hover:opacity-100 
            ${isTouchActive ? 'opacity-100' : 'opacity-0'} 
            transition-opacity duration-200 cursor-pointer hover:bg-yellow-600 z-10`}
        >
          <span className="text-xl font-bold text-white">+</span>
        </button>
      )}
    </div>
  );
};

export default GaugeChart;
