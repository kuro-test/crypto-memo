import React, { useEffect, useState } from "react";
import { ArcElement, Chart as ChartJS, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import axios from "axios";

ChartJS.register(ArcElement, Tooltip);

const GaugeChart = ({ onAddToNote }) => {
  const [indexValue, setIndexValue] = useState(50);
  const [label, setLabel] = useState("中性");
  const [error, setError] = useState(null);
  // 新增一個狀態用於追踪移動設備上的觸控激活狀態
  const [isTouchActive, setIsTouchActive] = useState(false);
  // 添加這個變數來確保只輸出一次成功日誌
  const [hasLoggedSuccess, setHasLoggedSuccess] = useState(false);

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
      // 定義要嘗試的 API 端點
      const endpoints = [
        'http://localhost:3000/api/index',
        'https://crypto-memo-production.up.railway.app/api/index',
      ];
      
      let succeeded = false;
      
      // 只在開發環境輸出
      if (process.env.NODE_ENV === 'development') {
        console.log("🔄 正在嘗試獲取恐懼貪婪指數...");
      }
      
      // 依序嘗試每個端點
      for (const endpoint of endpoints) {
        try {
          // 只在開發環境且是第一次嘗試時輸出
          if (process.env.NODE_ENV === 'development' && endpoint === endpoints[0]) {
            console.log(`嘗試連接到: ${endpoint}`);
          }
          
          const response = await axios.get(endpoint, { timeout: 3000 });
          
          // 找到對應的指數資料
          const fearGreedData = response.data.find(item => item.id === "fear&greed");
          
          if (fearGreedData && fearGreedData.data) {
            const data = fearGreedData.data;

            // 只在開發環境且未輸出過成功日誌時輸出
            if (process.env.NODE_ENV === 'development' && !hasLoggedSuccess) {
              console.log("📊 最新指數資料:", {
                時間戳記: data.timestamp,
                數值: data.value,
                狀態: data.value_classification
              });
              
              console.log("✅ 恐懼貪婪指數更新成功，使用端點:", endpoint);
              setHasLoggedSuccess(true);
            }

            setIndexValue(parseInt(data.value));
            setLabel(data.value_classification);
            
            succeeded = true;
            break; // 成功取得數據後跳出迴圈
          } else {
            // 只在開發環境輸出
            if (process.env.NODE_ENV === 'development') {
              console.log("❓ 在回應中找不到恐懼貪婪指數資料");
            }
          }
        } catch (error) {
          // 只在開發環境輸出
          if (process.env.NODE_ENV === 'development') {
            console.log(`連接到 ${endpoint} 失敗:`, error.message);
          }
        }
      }
      
      // 如果所有端點都失敗
      if (!succeeded) {
        const errorMsg = "無法獲取恐懼貪婪指數資料";
        // 錯誤始終輸出，因為這是用戶需要知道的
        console.error("❌ " + errorMsg);
        setError(errorMsg);
      } else {
        setError(null); // 清除任何之前的錯誤
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
      <h3 className="text-base font-semibold text-white-400">
        比特幣恐懼貪婪指數
      </h3>
      
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
