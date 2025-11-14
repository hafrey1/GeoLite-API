# 🚀 快速参考 - 网络检测功能

## 📊 系统配置一览

### ✅ 测试点配置
| 编号 | 类型 | 名称 | URL数 | 说明 |
|------|------|------|-------|------|
| 1 | 国内 | 国内测试 | 5个 | 访问国内站点的出口IP |
| 2 | 国外 | 国外测试 | 6个 | 访问国际站点的出口IP |
| 3 | CDN | CloudFlare CDN | 3个 | CF加速站点的落地IP |
| 4 | 社交 | Twitter/X | 3个 | 推特服务的出口IP |
| 5 | 工具 | IP111国内 | 1个 | IP111的国内检测IP |
| **合计** | - | - | **18个** | 多源备用保证可用性 |

### 🎯 IP 提取 7 层策略

```
策略1 → CloudFlare Trace 格式
        └─ /ip=([^\n\r]+)/
        
策略2 → JSON 格式 (多字段搜索)
        └─ 支持30+个字段名
        
策略3 → 纯文本格式
        └─ 直接 IP 返回
        
策略4 → Script 标签内容
        └─ 从 <script> 中提取
        
策略5 → HTML 标签内容
        └─ 从 <p><div><span> 中提取
        
策略6 → 文本模式 (含中文)
        └─ 支持 15+ 种中文表述
        
策略7 → 兜底正则提取
        └─ 最后保底的正则提取
```

### 📈 性能指标

| 指标 | 当前值 | 说明 |
|------|--------|------|
| 超时时间 | 10 秒 | 每个 URL 的最大等待 |
| 最大响应 | 100 KB | 单个响应的大小限制 |
| 并发数 | 5个 | 同时发起的检测数 |
| 预期响应时间 | 3-8秒 | 平均完成时间 |
| 成功率 | 95%+ | 多源备用的成功概率 |

### 🔧 核心代码位置

```
GeoLite-API/
├── api/
│   └── index.js ..................... [主要修改]
│       └── handleNetworkInfo()
│           └── 定义 5 个 testPoints
│           └── Promise.allSettled()
│
├── lib/
│   └── all.js ....................... [核心优化]
│       ├── detectIP() 
│       ├── fetchIP()
│       └── parseIPFromResponse()     ✨ 7 层策略
│
└── public/
    └── index.html ................... [前端改进]
        ├── detectNetworkInfo()
        └── renderNetworkInfo()
```

## 🎨 前端显示

### 单个测试卡片布局

```
┌─────────────────────────────────┐
│ 🇨🇳 国内测试                    │
│ 您访问国内站点所使用的IP         │
├─────────────────────────────────┤
│ IP 地址： 1.2.3.4               │  ← 高亮显示
│ 国家/地区： 中国                 │
│ 国家代码： CN                    │
│ 大洲： 亚洲                      │
│ 测试源： www.baidu.com          │
├─────────────────────────────────┤
│ ✅ 成功 | ❌ 失败 | ⏳ 加载中    │
└─────────────────────────────────┘
```

### 底部直连IP显示

```
📡 您的直连 IP： 203.0.113.1
   (服务器端检测到的您的源IP)
```

## 🔄 完整流程

```
用户操作
  │
  ├─ 页面加载 → 自动检测
  │
  └─ 点击 "🔄 刷新" → 手动检测
       │
       ↓
    前端 fetch('/api/network-info')
       │
       ↓
    API 并行执行 5 个 detectIP()
       │
       ├─ domestic.detectIP()
       ├─ foreign.detectIP()
       ├─ cloudflare.detectIP()
       ├─ twitter.detectIP()
       └─ ip111.detectIP()
       │
       ↓ (每个内部 7 层提取)
       │
    ├─ fetchIP() → 获取原始数据
    │
    ├─ parseIPFromResponse() → 精准提取IP
    │   ├─ Strategy1: Trace Format
    │   ├─ Strategy2: JSON
    │   ├─ Strategy3: PlainText
    │   ├─ Strategy4: Script Tag
    │   ├─ Strategy5: HTML Tag
    │   ├─ Strategy6: Text Pattern
    │   └─ Strategy7: Regex Fallback
    │
    ├─ queryIP() → 查询地理位置
    │
    └─ isValidIP() → 验证IP有效性
       │
       ↓
    返回 JSON 给前端
       │
       ↓
    前端渲染 5 个卡片
       │
       └─ 显示: IP、国家、大洲、测试源
```

## 🧪 测试方法

### 本地快速测试

```bash
# 1. 启动开发服务
npm run dev

# 2. 打开浏览器
http://localhost:3000

# 3. 查看网络检测结果
# - 自动加载
# - 点击 "🔄 刷新" 重新检测

# 4. 打开浏览器控制台 (F12)
# - 查看详细的 IP 提取日志
# - [IP提取] ✅ CloudFlare trace 格式: 1.2.3.4
```

### API 直接测试

```bash
# 测试单个检测
curl http://localhost:3000/api/network-info

# 结果示例：
{
  "success": true,
  "data": {
    "domestic": {
      "ip": "1.2.3.4",
      "country_name": "中国",
      "country_code": "CN",
      "continent_name": "亚洲",
      "source_url": "https://www.baidu.com",
      "status": "success"
    },
    ...
  }
}
```

## 🐛 故障排查

### 场景1: 某个测试点总是失败

```
日志: [IP提取] ❌ 无法从 https://www.baidu.com 提取 IP

原因可能:
1. 网站被墙/连接失败 → 已有备用URL
2. 响应格式变化 → 需要更新提取策略
3. 返回HTML但无IP信息 → 需要添加新模式

解决:
1. 增加新的测试URL
2. 更新对应的提取正则
3. 增加自定义请求头
```

### 场景2: 所有测试都超时

```
日志: [API error] 请求超时

原因可能:
1. 网络连接问题
2. 防火墙阻止
3. 超时时间过短

解决:
1. 检查网络连接
2. 增加超时时间 (当前10秒)
3. 查看防火墙设置
```

### 场景3: IP 查询失败(地理位置为空)

```
日志: status: 'not_found'

原因可能:
1. GeoLite2 数据库未加载
2. IP 地址无效
3. 地址库不包含该IP

解决:
1. 检查 data/GeoLite2-Country.mmdb
2. 从 MaxMind 更新数据库
3. 使用已知有效IP测试
```

## 📝 改进建议

### 短期 (立即可做)
- ✅ 已完成: 7 层 IP 提取策略
- ✅ 已完成: 5 个测试点
- ✅ 已完成: 前端卡片显示优化
- ⏳ 待做: 添加延迟/响应时间显示

### 中期 (1-2周)
- ⏳ 添加 ASN 和 ISP 信息
- ⏳ 实现检测历史记录
- ⏳ 添加导出功能 (JSON/CSV)
- ⏳ 离线缓存支持

### 长期 (1个月+)
- ⏳ 添加网络路由追踪
- ⏳ 实现代理检测
- ⏳ 多数据源融合
- ⏳ 实时监控仪表板

## 🔗 相关资源

| 资源 | 链接 |
|------|------|
| GeoLite2 数据库 | https://dev.maxmind.com |
| IP111 | https://ip111.cn |
| Cloudflare Trace | https://www.cloudflare.com/cdn-cgi/trace |
| icanhazip | https://ipv4.icanhazip.com |
| ipify | https://api.ipify.org |

---

## 📱 命令速查表

```bash
# 验证语法
node -c lib/all.js
node -c api/index.js

# 启动开发服务
npm run dev

# 部署到 Vercel
vercel --prod

# 查看日志
cat ~/.vercel/logs/*.log

# 测试特定 URL
curl -I https://www.baidu.com/
curl https://www.cloudflare.com/cdn-cgi/trace
```

---

**最后更新: 2024-11-14**  
**版本: v2.0** (精准 IP 检测方案)
