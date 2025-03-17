import React, { useEffect, useState } from "react";
import { ArcElement, Chart as ChartJS, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import axios from "axios";

ChartJS.register(ArcElement, Tooltip);

const GaugeChart = ({ onAddToNote }) => {  // 添加 props
  const [indexValue, setIndexValue] = useState(50);
  const [label, setLabel] = useState("中性");

  useEffect(() => {
    const fetchFearAndGreedIndex = async () => {
      try {
        console.log("🔄 正在讀取本地資料...");
        
        const response = await axios.get('/index.json');
        const data = response.data;
        
        if (data && data.data) {
          const fearGreedData = data.data;
          console.log("📊 最新指數資料:", {
            時間戳記: fearGreedData.timestamp,
            數值: fearGreedData.value,
            狀態: fearGreedData.value_classification
          });

          setIndexValue(fearGreedData.value);

          // 將英文狀態轉換為中文
          const statusMap = {
            'Extreme Fear': '極度恐懼',
            'Fear': '恐懼',
            'Neutral': '中性',
            'Greed': '貪婪',
            'Extreme Greed': '極度貪婪'
          };
          setLabel(statusMap[fearGreedData.value_classification] || fearGreedData.value_classification);

          console.log("✅ 資料更新成功");
        }
      } catch (error) {
        console.error("❌ 讀取失敗:", error.message);
      }
    };

    // 初次載入時讀取資料
    fetchFearAndGreedIndex();
  }, []);

  // 設定顏色區間
  const backgroundColors = [
    "red", // 恐懼
    "orange",
    "yellow",
    "lightgreen",
    "green", // 貪婪
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
    // 將 group 類別移到最外層容器
    <div className="flex flex-col items-center justify-center w-full relative group">
      <h3 className="text-sm font-semibold text-white-400 mb-2">
        加密貨幣恐懼貪婪
      </h3>
      <div className="relative w-48 h-48">
        <Doughnut data={data} options={{ cutout: "80%" }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold">{indexValue}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
      {/* 修改按鈕位置到外層容器 */}
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
