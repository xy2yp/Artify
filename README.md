# Gemini 3 Pro - 绘图工作台（全能修复版 · XHS + BananaPrompt）

![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-Active-success)

## 版本更新
- 新增iOS应用端存储到相册功能，点击下载 到新页面长按保存图片
<img width="664" height="1036" alt="image" src="https://github.com/user-attachments/assets/b56df154-c3d1-4e99-a043-c986c0b74d1a" />

- 优化小红书提示词，出图更好看
<img width="3154" height="1684" alt="image" src="https://github.com/user-attachments/assets/cf67cbbb-3dd7-4ea8-9a43-b06658510383" />

- 增加流式接收
<img width="650" height="406" alt="image" src="https://github.com/user-attachments/assets/b4164844-6183-4202-a55a-7784ee9a42a3" />

- 细节优化 可以单纯文字输出 文字图片一同输出

**Gemini 3 Pro 绘图工作台（全能修复版）** 是一个基于 Web 的轻量级、高性能 AI 绘图客户端。  

它专门面向 Google Gemini 多模态模型（如 `gemini-3-pro-image-preview`），在原版基础上做了深度增强：

- ✅ 保留原有 **多会话绘图工作台**、**图片切片工厂** 等能力  
- ✅ 新增 **XHS 灵感实验室**：一站式“小红书风格”内容策划 + 分镜 + 批量绘图  
- ✅ 新增 **提示词快查（Banana Prompt）**：在线浏览 / 搜索优质绘图提示词，点一下即可复制  
- ✅ 新增 **全局提示 / 加载 / 进度条 / 错误处理**，整体体验更顺滑

整个应用 **纯前端运行**，所有配置和历史记录都保存在本地浏览器中，无需后端服务。
> 🚀 你可以将本仓库部署到 GitHub Pages 或任意静态网页托管平台，即可在线使用。

<img width="800" height="600" alt="image" src="https://github.com/user-attachments/assets/0d405894-30d5-4869-93cf-42e6cb34b34c" />

---

## ✨ 主要功能一览

### 1. 绘图工作台（Gemini 3 Pro）

- **多会话管理**
  - 左侧会话列表，支持新建 / 切换 / 删除会话
  - 每个会话独立保存历史记录与生成中的状态（带“小菊花”转圈）

- **多模态输入**
  - 支持上传多张参考图（Reference Images）
  - 文本 + 图片组合提交，充分发挥 Gemini 的多模态理解能力

- **精细参数控制**
  - 分辨率预设：1K / 2K / **4K 超清**  
  - 多种常用长宽比：`21:9`、`16:9`、`1:1`、`9:16`、`3:2` 等十几种比例可选  
  - 支持“Auto”模式自动根据画面判断

- **图片预览与下载**
  - 生成结果以卡片形式展示
  - 单击图片可进入灯箱预览（Lightbox），查看大图
  - 支持原图下载，便于二次创作或归档

---

### 2. 图片切片工厂（Slicer Tool）

无需 PS，直接在浏览器里完成切图流程：

- **自由切割 / 九宫格**
  - 支持横向、纵向辅助线  
  - 鼠标拖拽即可调整切割位置，所见即所得  

- **智能补全为 1:1**
  - 可选“1:1 强制补全”，无论原图比例如何，都能补成正方形  
  - 支持自定义补全背景色（颜色选择器）

- **一键导出**
  - 自动根据辅助线切出多张图片  
  - 支持 **一键打包 ZIP 下载**，方便发社媒、做九宫格、头像等

- **典型用途**
  - 社交媒体九宫格排版  
  - 表情包批量切片  
  - 素材拆分（Banner / 轮播图 / 长图裁切）

---

### 3. 制作表情包模式

- 侧边栏有“**制作表情包**”快捷入口
- 聚焦于 **表情包创作工作流**：
  1. 用绘图工作台生成表情图
  2. 一键进入 Slicer 工具进行切片
  3. 导出为若干张表情图片或贴纸

配合 1:1 补全和打包下载，表情包制作可以一口气做完。

---

### 4. XHS 灵感实验室（小红书内容工作流）

XHS 灵感实验室是一个针对“小红书 / 种草内容”的完整工具链：

#### 🧠 文案策划

- 支持输入：
  - 文本主题（例如 “复古风穿搭 OOTD”）
  - 多张参考图（用于描述穿搭、场景等）
- 后台调用你的大模型接口，根据系统提示词生成：
  - **爆款风格标题（带 emoji）**
  - **多段式正文**：口语化文案 + emoji + 话题标签
  - **分镜脚本列表**：每一张图的描述 + 对应绘图 prompt

生成结果以 JSON 结构返回并在页面中以 Markdown/富文本方式展示，方便复制和微调。

#### 🎬 分镜 + 配图批量生成

- 右侧“视觉墙”以卡片形式展示每一张分镜：
  - 顶部是图片预览区域
  - 中间是可编辑的 prompt 文本框
  - 底部有“一键重绘 / 复制 prompt / 下载”等操作
- 支持为单张分镜设置 **垫图（参考图）**：
  - 每个卡片上有“垫图”胶囊，支持上传 / 替换 / 删除参考图
- **参数联动**：
  - 顶部工具条可统一设置：
    - 画面比例（如 3:4, 9:16, 1:1 …）
    - 画质等级（1K / 2K / 4K）
  - 点击“批量生成”即可一次性对所有分镜发起绘图请求

#### 📝 历史记录与复用

- 使用 IndexedDB 存储每次“方案”的完整数据：
  - 标题、正文、分镜列表、prompt、垫图等
- 左侧“历史记录”列表可以：
  - 点击直接恢复某次方案
  - 清空全部历史

---

### 5. 提示词快查 · Banana Prompt 集成

在顶部侧边栏可以进入 **“提示词快查”** 模块（Banana Prompt）：

- 从远程 JSON 源拉取提示词数据（按分类整理）
- 采用卡片瀑布流布局展示：
  - 预览图 + 标题 + 分类标签
  - 支持区分「绘图类」与「生活 / 其他类」提示词
- 功能点：
  - 顶部搜索框支持按标题 / 提示词内容 / 分类关键词搜索
  - Tab 切换：全部 / 绘图 / 生活
  - 点卡片中央区域 → **自动复制完整 Prompt 到剪贴板**
  - 部分卡片提供原链接，可跳转查看原文

这可以作为你的“提示词素材库”，在绘图工作台里直接粘贴使用。

---

## 🧩 架构与技术实现简述

- **前端技术栈**
  - 原生 HTML + CSS + Vanilla JavaScript（ES6+）
  - 使用 CSS 变量、Flex 布局、Grid 布局完成自适应设计
- **存储**
  - `localStorage`：保存 API 渠道配置、模型选择、基础设置  
  - `IndexedDB`：保存对话历史、XHS 方案历史等较大结构化数据
- **功能型库**
  - `JSZip`：图片打包成 ZIP 文件下载
  - `marked`：将 Markdown 内容渲染为 HTML（用于文案预览）
- **无后端依赖**
  - 所有请求直接从浏览器发往你配置的 API Host（官方或反代）

---

## 🚀 快速开始

### 1. 本地使用

1. 下载本仓库代码或 Zip 包  
2. 直接用浏览器打开 `Gemini-3-Pro-绘图工作台全能修复版-XHS-BananaPrompt.html`（或重命名后的 `index.html`）  
3. 点击右上角的 **设置（⚙）**，完成 API 配置：
   - 渠道名称（任意备注）
   - API Base URL（官方或你的反代地址）
   - API Key
   - 模型名称（例如 `gemini-3-pro-image-preview`）

> 提示：首次配置后会自动保存，下次打开页面会自动读取。

### 2. 部署到 GitHub Pages（推荐）

1. Fork 本仓库  
2. 在仓库 `Settings` → `Pages` 中，将发布源设置为 `main` 分支  
3. 等待 GitHub 构建完成后，即可通过  
   `https://你的 GitHub 用户名.github.io/仓库名`  
   在线访问绘图工作台

### 3. 任意静态托管平台

你也可以将项目部署到：

- 自己的 Nginx / Apache 静态目录
- Vercel / Netlify / Cloudflare Pages
- 任何支持静态站点的服务

只需要保证浏览器能访问到这一个 HTML 文件及其相关资源即可。

---

## ⚙️ API 渠道配置说明

打开右侧「绘图设置」面板，可以对多个 API 渠道进行管理：

| 项目         | 说明                               | 示例                               |
| ------------ | ---------------------------------- | ---------------------------------- |
| 渠道名称     | 用来区分不同 Key / 不同环境       | 官方 API / 反代 1 / 内网测试 等    |
| 类型         | `gemini` / `openai` 兼容模式      | `gemini`                           |
| API Base URL | 请求前缀地址                      | `https://generativelanguage.googleapis.com` 或你的反代 |
| API Key      | 从对应平台申请的 Key              | `sk-...`                           |
| Model        | 使用的模型名称                    | `gemini-3-pro-image-preview` 等   |

你可以配置多个渠道并在下拉框中随时切换，也可以选择“随机优选”策略做简单的负载均衡 / 容灾。

---

## 🛣️ Roadmap（在此版本基础上的计划）

- [ ] PWA 支持：可安装到桌面 / 手机主屏幕使用  
- [ ] Prompt 工作流增强：在 XHS / Banana 里一键发送到绘图工作台  
- [ ] 更多模型支持：扩展到 OpenAI / Claude / 其他兼容绘图接口  
- [ ] 多人协作模式：支持导出 / 导入方案 JSON 文件进行团队协作

---
## 📸 界面概览

### 🖥️ 桌面端工作台
<img width="2390" height="1684" alt="image" src="https://github.com/user-attachments/assets/76fa7155-8a49-4c65-8499-552bbeb95870" />
<img width="3840" height="1916" alt="image" src="https://github.com/user-attachments/assets/1c94e65e-d5c0-49be-8695-a92c6da76947" />

<img width="2390" height="1684" alt="image" src="https://github.com/user-attachments/assets/ce2d2da6-05e7-4f8d-b4e9-807ff74e55ad" />

### 📱 移动端与切片工具
<img width="646" height="1398" alt="image" src="https://github.com/user-attachments/assets/2ae8509a-5ffa-49ef-9160-0bf7926529d6" />
<img width="646" height="1398" alt="image" src="https://github.com/user-attachments/assets/baf8934a-3e52-483f-8d9b-84bfabbff04a" />
<img width="646" height="1398" alt="image" src="https://github.com/user-attachments/assets/83ffe7c6-9230-49f0-9093-714b70790462" />

<img width="3840" height="1916" alt="image" src="https://github.com/user-attachments/assets/c2324834-58b4-42da-8070-1f5d4e3ec133" />

---

## 🤝 与原项目的关系 & 贡献

本项目基于开源的 **Gemini 3 Pro 绘图工作台** 进行二次开发和功能增强，  
在此感谢原作者的出色工作 🙏。

我们欢迎：

1. 提交 Issue 反馈 Bug 或功能建议  
2. 提交 PR 增加新功能 / 修复问题  
3. 帮忙完善文档、示例、预设 Prompt

---

## 📄 License & 免责声明

本项目基于 [MIT License](LICENSE) 开源。

- 本项目本质上只是一个 **API 调用客户端**，不提供任何 AI 模型本身。  
- 请确保你的使用符合各个模型提供方（如 Google、OpenAI 等）的服务条款。  
- 请勿使用本项目生成、传播违反法律法规或平台规范的内容。
---


*   请确保您使用的 API Key 符合 Google Generative AI 的使用条款。
*   请勿利用本项目生成违反法律法规的内容。
