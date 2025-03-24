import React, { useEffect, useState } from "react";
import { ArcElement, Chart as ChartJS, Tooltip } from "chart.js";
import axios from "axios";

ChartJS.register(ArcElement, Tooltip);

const AltcoinIndex = ({ onAddToNote }) => {
  const [indexValue, setIndexValue] = useState(50);
  const [status, setStatus] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState(null);
  // 新增一個狀態用於追踪移動設備上的觸控激活狀態
  const [isTouchActive, setIsTouchActive] = useState(false);

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

  // 新增狀態轉換對照表
  const translateText = {
    "Altcoin Month Index": "山寨幣月份指數",
    "It is not Altcoin Month!": "現在不是山寨幣月份",
    "It is Altcoin Month!": "現在是山寨幣月份",
    "It is Bitcoin Month!": "現在是比特幣月份"
  };

  useEffect(() => {
    const fetchAltcoinIndex = async () => {
      // 定義要嘗試的 API 端點
      const endpoints = [
        'http://localhost:3000/api/index',
        'https://crypto-memo-production.up.railway.app/api/index', //部署後記得改
      ];
      
      let succeeded = false;
      
      console.log("🔄 正在嘗試獲取山寨幣月份指數...");
      
      // 依序嘗試每個端點
      for (const endpoint of endpoints) {
        try {
          console.log(`嘗試連接到: ${endpoint}`);
          const response = await axios.get(endpoint, { timeout: 3000 }); // 3秒超時
          
          // 找到對應的指數資料
          const altcoinData = response.data.find(item => item.id === "altcoin-index");
          
          if (altcoinData && altcoinData.data) {
            const data = altcoinData.data;
            console.log("📊 最新山寨幣指數:", {
              時間戳記: data.timestamp,
              數值: data.value,
              狀態: data.status
            });

            setIndexValue(parseInt(data.value));
            // 使用對照表轉換狀態文字
            setStatus(translateText[data.status] || data.status);
            setTitle(translateText[data.title] || data.title);

            console.log("✅ 山寨幣指數更新成功，使用端點:", endpoint);
            succeeded = true;
            break; // 成功取得數據後跳出迴圈
          } else {
            console.log("❓ 在回應中找不到山寨幣指數資料");
            // 繼續嘗試下一個端點
          }
        } catch (error) {
          console.log(`連接到 ${endpoint} 失敗:`, error.message);
          // 失敗後繼續嘗試下一個端點
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
      className="flex flex-col items-center justify-center w-full relative group mt-4"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <h3 className="text-xl font-semibold text-center text-white mb-2">
        {title || "山寨幣月份指數"}
      </h3>
      
      {error ? (
        <div className="text-red-500 text-center p-4">
          <p>{error}</p>
        </div>
      ) : (
        <>
          <p className="text-center text-yellow-200/70 mb-2">
            {status} <i className="fa fa-info-circle text-yellow-200/70" title="If 75% of the Top 50 coins performed better than Bitcoin over the last 30 days it is Altcoin Month"></i>
          </p>
          <div className="text-6xl font-bold text-blue-500">
            {indexValue}
          </div>
          <button
            onClick={handleAddToNote}
            className={`absolute bottom-2 right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center 
              md:opacity-0 md:group-hover:opacity-100 
              ${isTouchActive ? 'opacity-100' : 'opacity-0'} 
              transition-opacity duration-200 cursor-pointer hover:bg-yellow-600`}
          >
            <span className="text-xl font-bold text-white">+</span>
          </button>
        </>
      )}
    </div>
  );
};

export default AltcoinIndex;