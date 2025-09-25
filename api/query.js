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
    
    const { input, format } = req.method === 'GET' ? req.query : req.body;
    
    if (!input) {
      return res.status(400).json({
        error: '缺少查询参数',
        message: '请提供ip或domain参数'
      });
    }
    
    let result;
    
    if (isValidIP(input)) {
      // 直接查询IP地址
      result = {
        input: input,
        type: 'ip',
        ...queryIP(input)
      };
    } else if (isDomain(input)) {
      // 先解析域名，再查询IP位置
      const dnsResult = await resolveDomain(input);
      
      if (dnsResult.status === 'success') {
        const geoResult = queryIP(dnsResult.ip);
        result = {
          input: input,
          type: 'domain',
          resolved_ip: dnsResult.ip,
          dns_type: dnsResult.type,
          ...geoResult
        };
      } else {
        result = {
          input: input,
          type: 'domain',
          resolved_ip: null,
          status: 'error',
          message: `域名解析失败: ${dnsResult.message}`
        };
      }
    } else {
      return res.status(400).json({
        error: '无效输入',
        message: '输入必须是有效的IP地址或域名'
      });
    }
    
    const responseData = {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
    
    // 根据format参数决定是否格式化输出
    if (format === 'pretty' || format === 'formatted') {
      // 格式化输出，便于阅读
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.send(JSON.stringify(responseData, null, 2));
    }
    
    // 默认压缩输出
    res.json(responseData);
    
  } catch (error) {
    console.error('查询错误:', error);
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
