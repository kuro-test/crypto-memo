const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const IGNORE_LIST = [".git", ".env", ".gitignore", "node_modules", "projectTree.md", "generate-structure.js"];
const OUTPUT_FILE = "projectTree.md";
const PROJECT_NAME = "crypto-memo"; // 設定你的專案名稱

// 取得最新的 commit 訊息
function getLatestCommitMessage() {
  try {
    return execSync("git log -1 --pretty=%B").toString().trim();
  } catch (error) {
    return "No commit message found";
  }
}

// 遞迴產生專案結構
function generateTree(dir, prefix = "") {
  const items = fs.readdirSync(dir).filter(item => !IGNORE_LIST.includes(item));
  let tree = "";

  items.forEach((item, index) => {
    const fullPath = path.join(dir, item);
    const isLast = index === items.length - 1;
    const connector = isLast ? "└── " : "├── ";
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      tree += `${prefix}${connector}📂 ${item}\n`;
      tree += generateTree(fullPath, `${prefix}${isLast ? "    " : "│   "}`);
    } else {
      tree += `${prefix}${connector}📜 ${item}\n`;
    }
  });

  return tree;
}

// 產生專案結構的內容
function generateProjectStructure() {
  const commitMessage = getLatestCommitMessage();
  return `# 📁 ${PROJECT_NAME} 專案結構\n\n**Commit:** ${commitMessage}\n\n\`\`\`\n📦 ${PROJECT_NAME}\n${generateTree(process.cwd())}\`\`\`\n`;
}

// 檢查是否有舊檔案，並比對內容
function updateProjectStructure() {
  const newContent = generateProjectStructure();
  if (fs.existsSync(OUTPUT_FILE)) {
    const oldContent = fs.readFileSync(OUTPUT_FILE, "utf8");
    if (oldContent === newContent) {
      console.log("⚡ 內容未變更，無需更新");
      return;
    }
    fs.unlinkSync(OUTPUT_FILE); // 刪除舊檔案
    console.log("🗑 舊的 projectTree.md 已刪除");
  }

  fs.writeFileSync(OUTPUT_FILE, newContent);
  console.log("✅ 新的 projectTree.md 已生成");
}

// 執行腳本
updateProjectStructure();
