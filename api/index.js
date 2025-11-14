const { initGeoIP, queryIP, isValidIP, resolveDomain, isDomain, detectIP } = require('../lib/all');

module.exports = async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 兼容通过 vercel.json 重写传入的 route 参数
  // 优先从 query/body 中读取 route，其次尝试解析 URL
  let route = null;
  try {
    const url = new URL(req.url, 'http://localhost');
    route = url.searchParams.get('route') || (req.query && req.query.route) || (req.body && req.body.route) || null;
  } catch (e) {
    route = (req.query && req.query.route) || (req.body && req.body.route) || null;
  }

  // 如果没有 route，则根据 path 尝试推断（兼容直接访问 /api/index?input=...）
  if (!route) {
    // 尝试从请求路径中提取最后一段
    try {
      const url = new URL(req.url, 'http://localhost');
      const p = url.pathname || '';
      const parts = p.split('/').filter(Boolean);
      if (parts.length > 1) route = parts[1];
    } catch (e) {
      route = null;
    }
  }

  // 默认路由为 query
  route = route || 'query';

  try {
    if (route === 'query') {
      return await handleSingleQuery(req, res);
    }

    if (route === 'batch') {
      return await handleBatch(req, res);
    }

    if (route === 'network-info' || route === 'network') {
      return await handleNetworkInfo(req, res);
    }

    // unknown route
    res.status(404).json({ success: false, error: '未知的 API 路由' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ success: false, error: '服务器内部错误', message: err.message });
  }
};

// ===== 单个查询实现（来自原 query.js） =====
async function handleSingleQuery(req, res) {
  await initGeoIP();
  const { input, format } = req.method === 'GET' ? (req.query || parseQuery(req)) : (req.body || {});

  if (!input) {
    return res.status(400).json({ error: '缺少查询参数', message: '请提供ip或domain参数' });
  }

  let result;
  if (isValidIP(input)) {
    result = { input: input, type: 'ip', ...queryIP(input) };
  } else if (isDomain(input)) {
    const dnsResult = await resolveDomain(input);
    if (dnsResult.status === 'success') {
      const geoResult = queryIP(dnsResult.ip);
      result = { input: input, type: 'domain', resolved_ip: dnsResult.ip, dns_type: dnsResult.type, ...geoResult };
    } else {
      result = { input: input, type: 'domain', resolved_ip: null, status: 'error', message: `域名解析失败: ${dnsResult.message}` };
    }
  } else {
    return res.status(400).json({ error: '无效输入', message: '输入必须是有效的IP地址或域名' });
  }

  const responseData = { success: true, data: result, timestamp: new Date().toISOString() };
  if (format === 'compact' || format === 'compressed') return res.json(responseData);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(responseData, null, 2));
}

// ===== 批量查询实现（来自原 batch.js） =====
async function handleBatch(req, res) {
  await initGeoIP();
  let { inputs, format } = req.method === 'GET' ? (req.query || parseQuery(req)) : (req.body || {});

  if (!inputs) return res.status(400).json({ error: '缺少查询参数', message: '请提供inputs参数（IP地址和域名数组）' });

  if (typeof inputs === 'string') {
    try { inputs = JSON.parse(inputs); } catch { inputs = inputs.split(/[\r\n,]+/).map(i => i.trim()).filter(Boolean); }
  }

  if (!Array.isArray(inputs)) return res.status(400).json({ error: '无效输入格式', message: 'inputs必须是数组格式' });
  if (inputs.length === 0) return res.status(400).json({ error: '输入为空', message: '请提供至少一个IP地址或域名' });
  if (inputs.length > 200) return res.status(400).json({ error: '查询数量超限', message: '单次批量查询最多支持100个地址' });

  const startTime = Date.now();
  const promises = inputs.map(async (input) => {
    try {
      if (isValidIP(input)) return { input, type: 'ip', ...queryIP(input) };
      else if (isDomain(input)) {
        const dnsResult = await resolveDomain(input);
        if (dnsResult.status === 'success') return { input, type: 'domain', resolved_ip: dnsResult.ip, dns_type: dnsResult.type, ...queryIP(dnsResult.ip) };
        return { input, type: 'domain', resolved_ip: null, status: 'error', message: `域名解析失败: ${dnsResult.message}` };
      } else return { input, type: 'invalid', status: 'error', message: '无效的IP地址或域名格式' };
    } catch (error) { return { input, status: 'error', message: error.message }; }
  });

  const results_data = await Promise.all(promises);
  const endTime = Date.now();
  const stats = { total: results_data.length, success: results_data.filter(r => r.status === 'success').length, error: results_data.filter(r => r.status === 'error').length, not_found: results_data.filter(r => r.status === 'not_found').length, processing_time: endTime - startTime };

  if (format === 'csv') {
    const csvHeader = 'Input,Type,IP,Country Code,Country Name,Continent Code,Continent Name,Status,Message\n';
    const escapeCSV = (str) => { if (!str) return ''; return `"${String(str).replace(/"/g, '""') }"`; };
    const csvRows = results_data.map(item => [escapeCSV(item.input), escapeCSV(item.type), escapeCSV(item.resolved_ip || item.ip), escapeCSV(item.country_code), escapeCSV(item.country_name), escapeCSV(item.continent_code), escapeCSV(item.continent_name), escapeCSV(item.status), escapeCSV(item.message)].join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=geolocation_results.csv');
    return res.send(csvHeader + csvRows);
  }

  const responseData = { success: true, data: results_data, stats, timestamp: new Date().toISOString() };
  if (format === 'compact' || format === 'compressed') return res.json(responseData);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(responseData, null, 2));
}

// ===== 网络信息实现（来自 network-info.js） =====
async function handleNetworkInfo(req, res) {
  await initGeoIP();

  const results = { success: true, data: { domestic: null, foreign: null, cloudflare: null, twitter: null, client_ip: req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown' }, timestamp: new Date().toISOString() };

  const testPoints = [
    { key: 'domestic', name: '国内测试', urls: ['http://myip.ipip.net/json','https://api.ip.sb/json','https://ipapi.co/json'] },
    { key: 'foreign', name: '国外测试', urls: ['http://ipv4.icanhazip.com/','https://api.ipify.org?format=json','https://ip.seeip.org/json'] },
    { key: 'cloudflare', name: 'CloudFlare ProxyIP', urls: ['https://one.one.one.one/doh','https://www.cloudflare.com/cdn-cgi/trace'] },
    { key: 'twitter', name: 'Twitter/X', urls: ['https://api.twitter.com/i/api/2/timeline/home.json'] }
  ];

  const promises = testPoints.map(point => detectIP(point));
  const testResults = await Promise.allSettled(promises);
  testResults.forEach((result, index) => { const point = testPoints[index]; if (result.status === 'fulfilled' && result.value) results.data[point.key] = result.value; else results.data[point.key] = { status: 'failed', message: '无法获取信息' }; });

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(results, null, 2));
}

// 辅助：解析 GET 请求的 query（在某些 Vercel 环境中 req.query 可能已可用）
function parseQuery(req) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const obj = {};
    for (const [k, v] of url.searchParams.entries()) obj[k] = v;
    return obj;
  } catch (e) {
    return {};
  }
}
