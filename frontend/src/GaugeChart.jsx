import React, { useEffect, useState } from "react";
import { ArcElement, Chart as ChartJS, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import axios from "axios";

ChartJS.register(ArcElement, Tooltip);

const GaugeChart = ({ onAddToNote }) => {
  const [indexValue, setIndexValue] = useState(50);
  const [label, setLabel] = useState("中性");
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFearAndGreedIndex = async () => {
      // 定義要嘗試的 API 端點
      const endpoints = [
        'http://localhost:3000/api/index',
        'https://your-railway-app-name.railway.app/api/index',//部署後記得改
      ];
      
      let succeeded = false;
      
      console.log("🔄 正在嘗試獲取恐懼貪婪指數...");
      
      // 依序嘗試每個端點
      for (const endpoint of endpoints) {
        try {
          console.log(`嘗試連接到: ${endpoint}`);
          const response = await axios.get(endpoint, { timeout: 3000 }); // 3秒超時
          
          // 找到對應的指數資料
          const fearGreedData = response.data.find(item => item.id === "fear&greed");
          
          if (fearGreedData && fearGreedData.data) {
            const data = fearGreedData.data;
            console.log("📊 最新指數資料:", {
              時間戳記: data.timestamp,
              數值: data.value,
              狀態: data.value_classification
            });

            setIndexValue(parseInt(data.value));
            
            // 直接使用中文狀態
            setLabel(data.value_classification);

            console.log("✅ 恐懼貪婪指數更新成功，使用端點:", endpoint);
            succeeded = true;
            break; // 成功取得數據後跳出迴圈
          } else {
            console.log("❓ 在回應中找不到恐懼貪婪指數資料");
            // 繼續嘗試下一個端點
          }
        } catch (error) {
          console.log(`連接到 ${endpoint} 失敗:`, error.message);
          // 失敗後繼續嘗試下一個端點
        }
      }
      
      // 如果所有端點都失敗
      if (!succeeded) {
        const errorMsg = "無法獲取恐懼貪婪指數資料";
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
    <div className="flex flex-col items-center justify-center w-full relative group">
      <h3 className="text-base font-semibold text-white-400 mb-0">
        比特幣恐懼貪婪
      </h3>
      <div className="relative w-48 h-48">
        {/* 如果有錯誤則顯示錯誤訊息，否則顯示半圓圖表 */}
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center text-red-500 text-center p-4">
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* 半圓圖表 */}
            <Doughnut data={data} options={{ cutout: "70%", rotation: 270, circumference: 180 }} />
            
            {/* 中心數值和狀態 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ marginTop: '35px' }}>
              <p className="text-4xl font-bold">{indexValue}</p>
              <p className="text-base font-bold" style={{ 
                color: backgroundColors[getLabelColorIndex(label)]  // 使用與半圓相同的顏色，但根據標籤文字決定
              }}>{label}</p>
            </div>
          </>
        )}
      </div>
      
      {/* 新增按鈕 */}
      {!error && (
        <button
          onClick={handleAddToNote}
          className="absolute bottom-2 right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer hover:bg-yellow-600"
        >
          <span className="text-xl font-bold text-white">+</span>
        </button>
      )}
    </div>
  );
};

export default GaugeChart;
