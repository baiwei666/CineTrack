# CineTrack
一个影视观看记录管理前端工程

一个完整的、单文件的 **React + TypeScript** 组件，并且依赖 **Tailwind CSS** 进行样式设计，使用了 **lucide-react** 图标库。

要在您的本地电脑上运行这段代码，请按照以下步骤操作：

### 1\. 环境准备

确保您的电脑上安装了 [Node.js](https://nodejs.org/) (建议版本 v18 或更高)。

### 2\. 创建项目 (使用 Vite)

打开终端（命令行），运行以下命令创建一个新的 React + TypeScript 项目：

```bash
# 创建项目 (项目名: cine-track)
npm create vite@latest cine-track -- --template react-ts

# 进入项目目录
cd cine-track

# 安装基础依赖
npm install
```

### 3\. 安装必要的依赖库

这段代码主要依赖 `lucide-react` (图标) 和 `clsx`/`tailwind-merge` (虽然代码中直接使用了类名，但安装 Tailwind 是必须的)。

```bash
# 安装图标库
npm install lucide-react

# 安装 Tailwind CSS 及其依赖
npm install -D tailwindcss postcss autoprefixer

# 初始化 Tailwind 配置
npx tailwindcss init -p
```

### 4\. 配置 Tailwind CSS

修改项目根目录下的 `tailwind.config.js` 文件，确保它能扫描到你的文件：

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

修改 `src/index.css`，将内容**替换**为以下 Tailwind 指令：

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 你的代码主要使用深色模式，添加这个背景色可以让整体效果更好 */
body {
  @apply bg-slate-950 text-slate-200;
}
```

### 5\. 植入代码

打开项目中的 `src/App.tsx` 文件：

1.  **清空** `App.tsx` 原有的所有内容。
2.  将我提供给您的 **完整代码 (`CineTrack.tsx` 的内容)** 复制并粘贴到 `src/App.tsx` 中。
3.  确保文件名是 `App.tsx` 或者你在 `main.tsx` 中正确导入了它。

### 6\. 运行项目

回到终端，运行开发服务器：

```bash
npm run dev
```

终端会显示一个地址（通常是 `http://localhost:5173`），在浏览器中打开该地址，您就可以看到并使用完整的影视记录管理系统了。

-----

### 如果您不想配置本地环境

您也可以直接使用在线 IDE 快速预览：

1.  打开 [StackBlitz](https://stackblitz.com/) 或 [CodeSandbox](https://codesandbox.io/)。
2.  创建一个新的 **React + TypeScript + Tailwind** 项目模板。
3.  安装依赖 `lucide-react`。
4.  将代码复制到主组件文件中即可。
