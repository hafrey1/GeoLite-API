const { initGeoIP, queryIP, isValidIP } = require('../lib/geoip');
const { resolveDomain, isDomain } = require('../lib/dns');

module.exports = async (req, res) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // 初始化GeoIP数据库
    await initGeoIP();
    
    let { inputs, format } = req.method === 'GET' ? req.query : req.body;
    
    if (!inputs) {
      return res.status(400).json({
        error: '缺少查询参数',
        message: '请提供inputs参数（IP地址和域名数组）'
      });
    }
    
    // 处理字符串格式的输入
    if (typeof inputs === 'string') {
      try {
        inputs = JSON.parse(inputs);
      } catch {
        // 如果不是JSON，按行或逗号分割
        inputs = inputs.split(/[\r\n,]+/).map(item => item.trim()).filter(item => item);
      }
    }
    
    if (!Array.isArray(inputs)) {
      return res.status(400).json({
        error: '无效输入格式',
        message: 'inputs必须是数组格式'
      });
    }
    
    if (inputs.length === 0) {
      return res.status(400).json({
        error: '输入为空',
        message: '请提供至少一个IP地址或域名'
      });
    }
    
    // 限制批量查询数量
    if (inputs.length > 100) {
      return res.status(400).json({
        error: '查询数量超限',
        message: '单次批量查询最多支持100个地址'
      });
    }
    
    const results = [];
    const startTime = Date.now();
    
    // 批量处理
    for (const input of inputs) {
      if (!input || typeof input !== 'string') {
        results.push({
          input: input,
          type: 'invalid',
          status: 'error',
          message: '无效输入格式'
        });
        continue;
      }
      
      const cleanInput = input.trim();
      
      if (isValidIP(cleanInput)) {
        // 处理IP地址
        results.push({
          input: cleanInput,
          type: 'ip',
          ...queryIP(cleanInput)
        });
      } else if (isDomain(cleanInput)) {
        // 处理域名
        try {
          const dnsResult = await resolveDomain(cleanInput);
          
          if (dnsResult.status === 'success') {
            const geoResult = queryIP(dnsResult.ip);
            results.push({
              input: cleanInput,
              type: 'domain',
              resolved_ip: dnsResult.ip,
              dns_type: dnsResult.type,
              ...geoResult
            });
          } else {
            results.push({
              input: cleanInput,
              type: 'domain',
              resolved_ip: null,
              status: 'error',
              message: `域名解析失败: ${dnsResult.message}`
            });
          }
        } catch (error) {
          results.push({
            input: cleanInput,
            type: 'domain',
            resolved_ip: null,
            status: 'error',
            message: `域名解析异常: ${error.message}`
          });
        }
      } else {
        results.push({
          input: cleanInput,
          type: 'invalid',
          status: 'error',
          message: '无效的IP地址或域名格式'
        });
      }
    }
    
    const processingTime = Date.now() - startTime;
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.length - successCount;
    
    const response = {
      success: true,
      data: results,
      statistics: {
        total: results.length,
        success: successCount,
        error: errorCount,
        processing_time_ms: processingTime
      },
      timestamp: new Date().toISOString()
    };
    
    // 支持CSV格式输出
    if (format === 'csv') {
      const csv = generateCSV(results);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="geoip-results.csv"');
      return res.send(csv);
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('批量查询错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error.message
    });
  }
};

// 生成CSV格式
function generateCSV(results) {
  const headers = ['输入', '类型', 'IP地址', '解析IP', '国家代码', '国家名称', '洲代码', '洲名称', '状态', '错误信息'];
  const csvLines = [headers.join(',')];
  
  results.forEach(result => {
    const row = [
      `"${result.input || ''}"`,
      `"${result.type || ''}"`,
      `"${result.ip || result.resolved_ip || ''}"`,
      `"${result.resolved_ip || ''}"`,
      `"${result.country_code || ''}"`,
      `"${result.country_name || ''}"`,
      `"${result.continent_code || ''}"`,
      `"${result.continent_name || ''}"`,
      `"${result.status || ''}"`,
      `"${result.message || ''}"`
    ];
    csvLines.push(row.join(','));
  });
  
  return csvLines.join('\n');
}
