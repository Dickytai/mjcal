# 🀄 Mjcal - 麻将听牌计算器

A beautiful Mahjong (麻雀/麻將) tenpai (听牌) calculator with an Eastern Zen-inspired interface.

![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-2.0+-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## ✨ Features

- **🀄 完整的麻将支持** - 支持筒子、索子、万子、字牌、花牌及多种百搭
- **📊 听牌分析** - 计算向听数，显示所有可能胡牌
- **🎯 番数计算** - 支持多种日式/台式麻将番数
- **🎨 禅意界面** - 优雅的东方简约设计
- **📱 响应式** - 支持桌面和移动设备

## 百搭说明

| 代码 | 名称 | 可变身为 |
|------|------|----------|
| `1j` | 皇 | 任意牌 (34种) |
| `2j` | 合 | 筒索万 (27种) |
| `3j` | 萬 | 万子 (9种) |
| `4j` | 筒 | 筒子 (9种) |
| `5j` | 索 | 索子 (9种) |
| `6j` | 風 | 风牌 (4种) |
| `7j` | 番 | 中发白 (3种) |
| `8j` | 字 | 字牌 (7种) |

## 🚀 快速开始

### 安装依赖

```bash
cd mjcal
npm install
```

### 运行应用

```bash
python mahjong_flask.py
```

打开浏览器访问: http://localhost:5000

## 📖 使用方式

1. 选择模式：**13张** 或 **16张**
2. 点击麻将牌添加到手牌或公开牌
3. 点击 **🔍 计算听牌/番数** 查看结果
4. 可选：勾选追加番数（自摸、庄家等）

### 代码输入

也可以直接输入牌码：

```
1112223334567m    # 万子
111m222m333m456m7m
```

## 🛠️ 技术栈

- **后端**: Python + Flask
- **前端**: HTML/CSS/JavaScript
- **麻将算法**: mahjong-tile-efficiency

## 📂 项目结构

```
mjcal/
├── mahjong_flask.py      # Flask 主应用
├── fan_config.json       # 番数配置
├── fan_db.js            # 番数数据库
├── mj_calc.v*.js        # 各版本计算器
├── templates/
│   └── index.html       # 主页面
├── static/
│   ├── app.css          # 默认样式
│   └── app-zen.css      # 禅意风格
└── node_modules/        # 依赖
```

## 🎨 界面预览

默认风格采用温暖的米色基调，禅意风格则使用墨绿与胭脂红的典雅搭配。

## 📜 License

MIT License
