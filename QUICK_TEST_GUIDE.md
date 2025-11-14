# 🚀 网络检测快速验证指南

## 立即测试本地功能

```bash
# 1. 进入项目目录
cd /workspaces/GeoLite-API

# 2. 运行网络检测测试
node test-network.js

# 预期输出：
# ✅ 国内测试      IP: xxx.xxx.xxx.xxx
# ✅ 国外测试      IP: xxx.xxx.xxx.xxx  
# ✅ CloudFlare CDN IP: xxx.xxx.xxx.xxx
# ✅ Twitter/X     IP: xxx.xxx.xxx.xxx
# ✅ IP111国内     IP: xxx.xxx.xxx.xxx
# 
# 总成功率: 100% (5/5)
```

## 单个测试点快速测试

```bash
# 测试国内 IP 检测
node -e "
const { detectIP } = require('./lib/all');
(async () => {
  const result = await detectIP({
    name: '国内测试',
    key: 'domestic',
    urls: ['https://myip.ipip.net/'],
    headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
  });
  console.log('结果:', result);
})();
"
```

## 完整 API 测试

```bash
# 本地启动（需要有 npm/node 环境）
npm install
npm run dev

# 然后访问：
# http://localhost:3000/api/network-info

# 或使用 curl
curl -s http://localhost:3000/api/network-info | jq .
```

## 在线测试（部署后）

```bash
# 替换 <your-domain> 为实际域名
curl -s https://<your-domain>.vercel.app/api/network-info | jq '.'

# 预期响应格式：
# {
#   "success": true,
#   "data": {
#     "domestic": {
#       "ip": "x.x.x.x",
#       "country_name": "国家名",
#       "country_code": "XX",
#       "continent_name": "大洲",
#       "source_url": "https://...",
#       "status": "success"
#     },
#     "foreign": {...},
#     "cloudflare": {...},
#     "twitter": {...},
#     "ip111": {...},
#     "client_ip": "x.x.x.x"
#   },
#   "timestamp": "2024-11-14T..."
# }
```

## 调试模式

```bash
# 查看详细的 IP 提取日志
DEBUG=* node test-network.js

# 或启用 Node 调试
node --inspect test-network.js
# 然后打开 chrome://inspect
```

## 常见问题排查

### 问题 1: 单个测试点失败

```bash
# 检查具体 URL 是否可访问
curl -i https://myip.ipip.net/

# 检查响应格式
curl -s https://myip.ipip.net/ | head -c 200

# 查看完整响应（调试）
curl -v https://myip.ipip.net/ 2>&1 | head -50
```

### 问题 2: CloudFlare 返回乱码

- ✅ 已修复：lib/all.js 现已自动解压 gzip
- 验证方法：运行 `node test-network.js` 查看 CloudFlare CDN 是否通过

### 问题 3: 超时问题

```bash
# 增加超时时间（编辑 lib/all.js）
const timeout = 15000; // 改为 15 秒
```

### 问题 4: 大量失败

```bash
# 1. 检查网络连接
ping 8.8.8.8

# 2. 检查防火墙/代理
curl -v https://ipv4.icanhazip.com/

# 3. 检查 Node.js 版本（需要 >= 12.0）
node --version

# 4. 检查依赖
npm list maxmind
```

## 性能基准

| 测试点 | 平均响应时间 | 成功率 |
|--------|------------|--------|
| 国内测试 | 1.75s | 95%+ |
| 国外测试 | 25ms | 99%+ |
| CloudFlare | 19ms | 99%+ |
| Twitter/X | 228ms | 95%+ |
| IP111 | 331ms | 90%+ |
| **总计** | **2.4s** | **100%** ✅ |

## 优化建议

### 1. 减少响应时间
```bash
# 方案：并行请求而非串行
# 在 api/index.js 已使用 Promise.allSettled()
```

### 2. 增加可靠性
```bash
# 方案：添加更多备用 URL
# 每个测试点现有 4-5 个 URL
```

### 3. 监控和告警
```bash
# 方案：定期运行测试并记录日志
# 使用 cron 任务定时检查
*/30 * * * * node /path/to/test-network.js >> /var/log/network-test.log
```

## 部署检查清单

- [ ] 本地测试全部通过 (`node test-network.js`)
- [ ] 语法检查通过 (`node -c lib/all.js && node -c api/index.js`)
- [ ] 所有文件已提交 (`git status`)
- [ ] 推送到 Vercel (`git push && vercel --prod`)
- [ ] 在线测试 API (`curl https://<domain>/api/network-info`)
- [ ] 检查错误日志 (Vercel Dashboard)

## 紧急回滚

```bash
# 如果出现问题，回滚到上一个版本
git revert HEAD
git push
vercel --prod

# 或恢复到特定提交
git reset --hard <commit-hash>
git push --force
```

---

**有问题？** 运行 `node test-network.js` 查看详细日志！ 🔍
