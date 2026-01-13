# Artify · 智绘 · 工作台

<div align="center">

![Gemini 3 Pro](https://img.shields.io/badge/Gemini-3%20Pro-blue?style=for-the-badge&logo=google)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

**🎨 强大的图像生成工作台**

</div>

---

## 📖 项目简介

魔改自 [Gemini 3 Pro Image Preview](https://github.com/Tansuo2021/gemini-3-pro-image-preview) 。
提供了直观的用户界面、强大的功能和出色的用户体验，支持多种图像生成场景和创作工具。
从原项目的**单文件HTML**重构为现代化**ES6模块架构**.

### ✨ 核心亮点

- 🚀 **并发生成** - 支持批量并发生成图片，提高创作效率
- 🎯 **4K 渲染** - 支持高达 4K 分辨率的图像生成
- 💾 **本地存储** - 使用 IndexedDB 本地存储对话历史
- 📱 **响应式设计** - 完美适配桌面端和移动端
- 🌓 **暗黑模式** - 内置优雅的暗黑主题
- 🔄 **对话上下文** - AI 可记住历史对话，实现连续创作

### 📊 重构成果

- ✅ **17个CSS模块** (分层结构: base/layout/components/modules)
- ✅ **23个JS模块** (5172行，四层架构)
- ✅ **API Key迁移到后端**，JWT认证
- ✅ **ES6 Modules**，按需加载
- ✅ **事件驱动架构**，完全解耦
- ✅ **TypeScript-ready**，清晰的模块边界
---

## 🎯 功能特性

### 核心功能

#### 🖼️ 图像生成
- **多分辨率支持**：1K / 2K / 4K 可选
- **多种长宽比**：支持 1:1、16:9、9:16、3:4、4:3 等 11 种比例
- **参考图上传**：支持上传参考图进行图像生成
- **批量生成**：一次性生成多张图片

#### 💬 对话管理
- **会话持久化**：使用 IndexedDB 存储对话历史
- **上下文记忆**：可配置保留 3/5/10/20 条历史对话
- **会话切换**：快速切换不同的对话会话
- **历史记录**：完整的对话历史记录

#### 🎨 创作工具

##### 📝 XHS 灵感实验室
- 小红书风格内容创作
- AI 生成文案和配图
- 支持图片分析和文案生成
- 批量生成分镜图片

##### 🍌 提示词快查
- 集成 [Banana Prompt](https://github.com/glidea/banana-prompt-quicker) 提示词库
- 快速搜索和使用优质提示词
- 支持分类筛选（绘图/生活/学习/工作等）

##### 😊 表情包制作
- 一键进入表情包生成模式
- 预设表情包生成参数
- 支持 LINE 风格表情包

##### ✂️ 图片切片工具
- 九宫格切图功能
- 支持横线/竖线切割
- 1:1 补全功能
- 一键打包下载

### 高级功能

#### ⚙️ API 渠道管理
- **多渠道支持**：支持配置多个 API 渠道
- **随机轮询**：自动在多个渠道间轮询
- **双接口支持**：
  - Gemini 原生接口
  - OpenAI 兼容接口
- **渠道管理**：添加、编辑、删除 API 渠道

## 技术栈
- **前端**: 原生JavaScript（ES6 Modules）、CSS3
- **后端**: FastAPI + SQLite
- **认证**: JWT Token
- **存储**: IndexedDB（本地）+ SQLite（后端）
---

## 🚀 快速开始

### 前置要求

- 现代浏览器（Chrome 86+ / Edge 86+ / Firefox / Safari）
- Gemini API Key 或兼容的 OpenAI API

### 安装步骤

1. **克隆仓库**
```bash
git clone https://github.com/xy2yp/Artify.git
cd Artify
```

2. **启动后端**
```bash
cd /Artify/backend
python main.py
```

3. **启动前端**
```bash
cd /Artify
python -m http.server 8080
```

4. **访问应用**
```
http://localhost:8000
```

或者**docker部署**
修改`dockercompose.yml`
```
dockercompose-up
```

### 配置 API

1. 点击右上角的 **设置** 图标
2. 展开 **API 渠道管理**
3. 填写以下信息：
   - **渠道名称**：自定义名称（如：官方API）
   - **接口类型**：选择 Gemini 原生接口 或 OpenAI 兼容接口
   - **API Base URL**：API 地址
   - **API Key**：你的 API 密钥
   - **Model**：模型名称（如：gemini-3-pro-image-preview）
4. 点击 **保存渠道**

---

## 📦 技术栈

- **前端框架**：原生 JavaScript（无框架依赖）
- **样式**：CSS3 + CSS Variables
- **存储**：IndexedDB
- **文件系统**：File System Access API
- **Markdown 解析**：marked.js
- **文件压缩**：JSZip

---

---

## 🔧 配置说明

### 分辨率设置
- **1K**：1024x1024
- **2K**：2048x2048
- **4K**：4096x4096（默认）

### 长宽比选项
- Auto（自动）
- 21:9（超宽屏）
- 16:9（宽屏）
- 3:2、4:3、5:4（横向）
- 1:1（正方形）
- 4:5、3:4、2:3、9:16（竖向）

### 对话上下文
- **保留条数**：3 / 5（默认）/ 10 / 20 条
- **功能**：AI 可基于历史对话和图片继续创作
- **注意**：保留条数越多，消耗的 Token 越多

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---



**⭐ 如果这个项目对你有帮助，请给一个 Star！**

Made with ❤️ by [XY2YP](https://github.com/xy2yp)

</div>
