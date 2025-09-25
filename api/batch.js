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
        inputs = inputs.split(/[\r\n,]+/)
          .map(item => item.trim())
          .filter(item => item);
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
    
    // 限制批量查询数量（Vercel限制）
    if (inputs.length > 100) {
      return res.status(400).json({
        error: '查询数量超限',
        message: '单次批量查询最多支持100个地址'
      });
    }
    
    const startTime = Date.now();
    
    // 并发处理查询请求
    const promises = inputs.map(async (input) => {
      try {
        if (isValidIP(input)) {
          // 直接查询IP
          return {
            input: input,
            type: 'ip',
            ...queryIP(input)
          };
        } else if (isDomain(input)) {
          // 解析域名后查询
          const dnsResult = await resolveDomain(input);
          
          if (dnsResult.status === 'success') {
            const geoResult = queryIP(dnsResult.ip);
            return {
              input: input,
              type: 'domain',
              resolved_ip: dnsResult.ip,
              dns_type: dnsResult.type,
              ...geoResult
            };
          } else {
            return {
              input: input,
              type: 'domain',
              resolved_ip: null,
              status: 'error',
              message: `域名解析失败: ${dnsResult.message}`
            };
          }
        } else {
          return {
            input: input,
            type: 'invalid',
            status: 'error',
            message: '无效的IP地址或域名格式'
          };
        }
      } catch (error) {
        return {
          input: input,
          status: 'error',
          message: error.message
        };
      }
    });
    
    const results_data = await Promise.all(promises);
    const endTime = Date.now();
    
    // 统计结果
    const stats = {
      total: results_data.length,
      success: results_data.filter(r => r.status === 'success').length,
      error: results_data.filter(r => r.status === 'error').length,
      not_found: results_data.filter(r => r.status === 'not_found').length,
      processing_time: endTime - startTime
    };
    
    // CSV格式处理
    if (format === 'csv') {
      const csvHeader = 'Input,Type,IP,Country Code,Country Name,Continent Code,Continent Name,Status,Message\n';
      const csvRows = results_data.map(item => {
        const escapeCSV = (str) => {
          if (!str) return '';
          return `"${String(str).replace(/"/g, '""')}"`;
        };
        
        return [
          escapeCSV(item.input),
          escapeCSV(item.type),
          escapeCSV(item.resolved_ip || item.ip),
          escapeCSV(item.country_code),
          escapeCSV(item.country_name),
          escapeCSV(item.continent_code),
          escapeCSV(item.continent_name),
          escapeCSV(item.status),
          escapeCSV(item.message)
        ].join(',');
      }).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=geolocation_results.csv');
      return res.send(csvHeader + csvRows);
    }
    
    const responseData = {
      success: true,
      data: results_data,
      stats: stats,
      timestamp: new Date().toISOString()
    };
    
    // 格式化JSON输出
    if (format === 'pretty' || format === 'formatted') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.send(JSON.stringify(responseData, null, 2));
    }
    
    // 默认压缩输出
    res.json(responseData);
    
  } catch (error) {
    console.error('批量查询错误:', error);
    const errorResponse = {
      success: false,
      error: '服务器内部错误',
      message: error.message
    };
    
    const { format } = req.method === 'GET' ? req.query : req.body;
    
    if (format === 'pretty' || format === 'formatted') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(500).send(JSON.stringify(errorResponse, null, 2));
    }
    
    res.status(500).json(errorResponse);
  }
};
