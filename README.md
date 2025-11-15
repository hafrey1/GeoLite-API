# 🌍 GeoLite-IP

个人网络环境健康检测工具，支持混合IP与域名查询，支持单个IP与域名查询，批量处理查询，使用MaxMind GeoLite2-Country.mmdb数据库地理位置查询API，可一键部署到Vercel。

## ✨ 特性

- 🚀 **高性能查询**: 基于GeoLite2-Country.mmdb二进制数据库
- 📦 **批量处理**: 支持同时查询多个IP地址和域名（最多100个）
- 🔄 **混合查询**: 自动识别IP地址和域名，智能处理
- 🌐 **DNS解析**: 自动将域名解析为IP地址后查询地理位置
- ⚡ **一键部署**: 支持直接部署到Vercel平台
- 📊 **多格式输出**: 支持JSON和CSV格式
- 🌏 **中文支持**: 返回中文国家和地区名称
- 🔒 **CORS支持**: 跨域请求友好
- 📋 **RESTful API**: 简洁的API接口设计


## 🔧 部署指南

### 1. GitHub仓库准备

1. 在GitHub创建新仓库 `GeoLite-API`
2. 将所有代码文件上传到仓库
3. 从MaxMind下载 `GeoLite2-Country.mmdb` 文件到 `data/` 目录

### 2. Vercel部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/hafrey1/GeoLite-IP)

1. 访问 [Vercel](https://vercel.com) 并登录
2. 点击 "New Project"
3. 选择你的GitHub仓库
4. 配置环境变量（如需要）
5. 点击Deploy

### 3. 测试验证

- 访问部署后的域名查看API文档
- 使用 `/test` 页面进行批量测试
- 验证单个查询和批量查询功能

## 🎯 使用场景

- **VPN节点过滤**: 为订阅节点添加地理标签
- **网络分析**: 批量分析IP地址归属地
- **安全监控**: 检测异常访问来源
- **数据分析**: 用户地理分布统计
- **CDN优化**: 选择最优服务节点
- **内容分发**: 基于地理位置的内容推送
- **合规检查**: 地域访问限制检查

## 🛠️ 技术栈

- **运行环境**: Node.js 18.x
- **部署平台**: Vercel Serverless Functions
- **数据库**: MaxMind GeoLite2-Country.mmdb
- **核心依赖**: maxmind, dns
- **前端**: 原生HTML/CSS/JavaScript

## ⚡ 性能特点

- **查询速度**: 单次查询 < 10ms
- **批量处理**: 100个地址 < 500ms
- **内存占用**: 数据库加载后约50MB
- **并发支持**: Vercel无服务器自动扩展
- **缓存优化**: 数据库内存常驻缓存

## 🔍 数据准确性

- **数据源**: MaxMind GeoLite2-Country数据库
- **更新频率**: 建议每月更新数据库文件
- **准确率**: IP到国家级别准确率 > 99%
- **覆盖范围**: 全球IPv4和IPv6地址

## 📝 注意事项

1. **数据库文件**: 需要定期更新GeoLite2数据库以保证准确性
2. **请求限制**: 批量查询单次最多100个地址
3. **超时设置**: Vercel函数执行时间限制10秒
4. **CORS支持**: 已配置跨域访问，支持前端直接调用
5. **错误处理**: 包含完整的错误信息和状态码

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/GeoLite-API.git
cd GeoLite-API
```

### 2. 安装依赖

```bash
npm install
```

### 3. 下载GeoLite2数据库

从 [MaxMind官网](https://dev.maxmind.com/geoip/geolite2-free-geolocation-data) 下载 `GeoLite2-Country.mmdb` 文件，并将其放置在 `data/` 目录下。

### 4. 本地开发

```bash
npm run dev
```

访问 [`http://localhost:3000`](http://localhost:3000) 查看API文档。


或者使用命令行：

```bash
npm run deploy
```

## 📡 API接口

### 单个查询

**接口地址**: `/api/query`

**请求方法**: `GET` | `POST`

### GET 请求

```bash
# 查询IP地址
curl "https://your-domain.vercel.app/api/query?input=8.8.8.8"

# 查询域名
curl "https://your-domain.vercel.app/api/query?input=google.com"
```

### POST 请求

```bash
curl -X POST "https://your-domain.vercel.app/api/query" \
  -H "Content-Type: application/json" \
  -d '{"input": "8.8.8.8"}'
```

### 批量查询

**接口地址**: `/api/batch`

**请求方法**: `POST`

**查询限制**: 最多100个地址

```bash
curl -X POST "https://your-domain.vercel.app/api/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": ["8.8.8.8", "[google.com](http://google.com)", "1.1.1.1", "[github.com](http://github.com)"],
    "format": "json"
  }'
```

### 支持格式

- `json` (默认): JSON格式输出
- `csv`: CSV格式输出

## 📊 响应格式

### 成功响应

```json
{
  "success": true,
  "data": {
    "input": "8.8.8.8",
    "type": "ip",
    "ip": "8.8.8.8",
    "country_code": "US",
    "country_name": "美国",
    "continent_code": "NA",
    "continent_name": "北美洲",
    "status": "success"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 域名查询响应

```json
{
  "success": true,
  "data": {
    "input": "[google.com](http://google.com)",
    "type": "domain",
    "resolved_ip": "172.217.160.78",
    "dns_type": "ipv4",
    "country_code": "US",
    "country_name": "美国",
    "continent_code": "NA",
    "continent_name": "北美洲",
    "status": "success"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 批量查询响应

```json
{
  "success": true,
  "data": {
    "total": 4,
    "success_count": 4,
    "error_count": 0,
    "processing_time": "0.123s",
    "results": [
      {
        "input": "8.8.8.8",
        "type": "ip",
        "country_code": "US",
        "country_name": "美国",
        "status": "success"
      }
      // ... 更多结果
    ]
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 错误响应

```json
{
  "success": false,
  "error": "无效输入",
  "message": "输入必须是有效的IP地址或域名"
}
```

## 💻 核心代码

### package.json

```json
{
  "name": "geolite-api",
  "version": "1.0.0",
  "description": "GeoLite2 IP Geolocation API for Vercel",
  "main": "index.js",
  "scripts": {
    "dev": "vercel dev",
    "build": "echo 'Build complete'",
    "deploy": "vercel --prod"
  },
  "dependencies": {
    "maxmind": "^4.3.6",
    "dns": "^0.2.2"
  },
  "keywords": ["geoip", "geolite2", "vercel", "api", "geolocation"],
  "author": "hafrey",
  "license": "MIT"
}
```

### vercel.json

```json
{
  "version": 2,
  "functions": {
    "api/*.js": {
      "runtime": "nodejs18.x",
      "maxDuration": 10
    }
  },
  "routes": [
    {
      "src": "/",
      "dest": "/public/index.html"
    },
    {
      "src": "/test",
      "dest": "/public/test.html"
    },
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type"
        }
      ]
    }
  ]
}
```



## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 📄 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [MaxMind](https://www.maxmind.com/) 提供的GeoLite2数据库
- [Vercel](https://vercel.com/) 提供的优秀部署平台
- [cmliu](https://github.com/cmliu) 参考大佬代码
- 所有贡献者和使用者的支持

---

**⭐ 如果这个项目对你有帮助，请给个Star支持一下！**
