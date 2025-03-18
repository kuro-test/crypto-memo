import React, { useEffect, useState } from "react";
import { ArcElement, Chart as ChartJS, Tooltip } from "chart.js";
import axios from "axios";

ChartJS.register(ArcElement, Tooltip);

const AltcoinIndex = ({ onAddToNote }) => {
  const [indexValue, setIndexValue] = useState(50);
  const [status, setStatus] = useState("");
  const [title, setTitle] = useState("");

  // 新增狀態轉換對照表
  const translateText = {
    "Altcoin Month Index": "山寨幣月份指數",
    "It is not Altcoin Month!": "現在不是山寨幣月份",
    "It is Altcoin Month!": "現在是山寨幣月份",
    "It is Bitcoin Month!": "現在是比特幣月份"
  };

  useEffect(() => {
    const fetchAltcoinIndex = async () => {
      try {
        console.log("🔄 正在讀取本地資料...");
        
        const response = await axios.get('/index.json');  // 改為 index.json
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
        } else {
          console.log("❌ 找不到山寨幣指數資料");
        }
      } catch (error) {
        console.error("❌ 讀取失敗:", error.message);
        console.error("錯誤詳情:", error);
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

    onAddToNote(currentStatus);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full relative group mt-4">
      <h3 className="text-xl font-semibold text-center text-white mb-2">
        {title || "山寨幣月份指數"}
      </h3>
      <p className="text-center text-yellow-200/70 mb-2">
        {status} <i className="fa fa-info-circle text-yellow-200/70" title="If 75% of the Top 50 coins performed better than Bitcoin over the last 30 days it is Altcoin Month"></i>
      </p>
      <div className="text-6xl font-bold text-blue-500">
        {indexValue}
      </div>
      <button
        onClick={handleAddToNote}
        className="absolute bottom-2 right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer hover:bg-yellow-600"
      >
        <span className="text-xl font-bold text-white">+</span>
      </button>
    </div>
  );
};

export default AltcoinIndex;