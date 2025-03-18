import React, { useEffect, useState } from "react";
import { ArcElement, Chart as ChartJS, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import axios from "axios";

ChartJS.register(ArcElement, Tooltip);

const GaugeChart = ({ onAddToNote }) => {
  const [indexValue, setIndexValue] = useState(50);
  const [label, setLabel] = useState("中性");

  useEffect(() => {
    const fetchFearAndGreedIndex = async () => {
      try {
        console.log("🔄 正在讀取本地資料...");
        
        const response = await axios.get('/index.json');
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

          // 將英文狀態轉換為中文
          const statusMap = {
            'Extreme Fear': '極度恐懼',
            'Fear': '恐懼',
            'Neutral': '中性',
            'Greed': '貪婪',
            'Extreme Greed': '極度貪婪'
          };
          setLabel(statusMap[data.value_classification] || data.value_classification);

          console.log("✅ 資料更新成功");
        } else {
          console.error("❌ 找不到恐懼貪婪指數資料");
        }
      } catch (error) {
        console.error("❌ 讀取失敗:", error.message);
        console.error("錯誤詳情:", error);
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
    const currentStatus = `加密貨幣恐懼貪婪指數
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
        加密貨幣恐懼貪婪
      </h3>
      <div className="relative w-48 h-48">
        {/* 半圓圖表 */}
        <Doughnut data={data} options={{ cutout: "70%", rotation: 270, circumference: 180 }} />
        
        {/* 中心數值和狀態 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ marginTop: '35px' }}>
          <p className="text-4xl font-bold">{indexValue}</p>
          <p className="text-base font-bold" style={{ 
            color: backgroundColors[getColorIndex(indexValue)]  // 使用與半圓相同的顏色
          }}>{label}</p>
        </div>
      </div>
      
      {/* 新增按鈕 */}
      <button
        onClick={handleAddToNote}
        className="absolute bottom-2 right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer hover:bg-yellow-600"
      >
        <span className="text-xl font-bold text-white">+</span>
      </button>
    </div>
  );
};

export default GaugeChart;
