const maxmind = require('maxmind');
const path = require('path');
const { promises: dns } = require('dns');
const https = require('https');
const http = require('http');

let lookup = null;

// ==================== GeoIP 功能 ====================

async function initGeoIP() {
  if (!lookup) {
    try {
      const dbPath = path.join(process.cwd(), 'data', 'GeoLite2-Country.mmdb');
      lookup = await maxmind.open(dbPath);
      console.log('GeoLite2数据库加载成功');
    } catch (error) {
      console.error('GeoLite2数据库加载失败:', error);
      throw error;
    }
  }
  return lookup;
}

function isCloudflareIP(ip) {
  if (!ip || typeof ip !== 'string') {
    return false;
  }
  
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) {
    return false;
  }
  
  const [oct1, oct2, oct3, oct4] = parts;
  
  const ranges = [
    { min: [104, 16, 0, 0], max: [104, 31, 255, 255] },
    { min: [172, 64, 0, 0], max: [172, 71, 255, 255] },
    { min: [173, 245, 48, 0], max: [173, 245, 63, 255] },
    { min: [103, 21, 244, 0], max: [103, 21, 247, 255] },
    { min: [103, 22, 200, 0], max: [103, 22, 203, 255] },
    { min: [103, 31, 4, 0], max: [103, 31, 7, 255] },
    { min: [141, 101, 64, 0], max: [141, 101, 127, 255] },
    { min: [108, 162, 192, 0], max: [108, 162, 255, 255] },
    { min: [190, 93, 240, 0], max: [190, 93, 255, 255] },
    { min: [188, 114, 96, 0], max: [188, 114, 111, 255] },
    { min: [197, 234, 240, 0], max: [197, 234, 243, 255] },
    { min: [198, 41, 128, 0], max: [198, 41, 255, 255] },
    { min: [162, 158, 0, 0], max: [162, 159, 255, 255] },
    { min: [104, 16, 0, 0], max: [104, 23, 255, 255] },
    { min: [104, 24, 0, 0], max: [104, 27, 255, 255] },
    { min: [131, 0, 72, 0], max: [131, 0, 75, 255] }
  ];
  
  for (const range of ranges) {
    const [min1, min2, min3, min4] = range.min;
    const [max1, max2, max3, max4] = range.max;
    
    if (oct1 >= min1 && oct1 <= max1) {
      if (oct1 > min1 && oct1 < max1) return true;
      if (oct1 === min1) {
        if (oct2 > min2 || (oct2 === min2 && (oct3 > min3 || (oct3 === min3 && oct4 >= min4)))) {
          if (oct1 === max1) {
            return oct2 < max2 || (oct2 === max2 && (oct3 < max3 || (oct3 === max3 && oct4 <= max4)));
          }
          return true;
        }
      }
      if (oct1 === max1) {
        return oct2 < max2 || (oct2 === max2 && (oct3 < max3 || (oct3 === max3 && oct4 <= max4)));
      }
    }
  }
  
  return false;
}

function queryIP(ip) {
  try {
    if (!lookup) {
      throw new Error('GeoIP数据库未初始化');
    }
    
    if (isCloudflareIP(ip)) {
      return {
        ip: ip,
        country_code: 'CF',
        country_name: 'Cloudflare',
        continent_code: 'CF',
        continent_name: 'Cloudflare',
        status: 'success',
        is_anycast: true,
        provider: 'Cloudflare'
      };
    }
    
    const result = lookup.get(ip);
    
    if (!result || !result.country) {
      return {
        ip: ip,
        country_code: null,
        country_name: null,
        continent_code: null,
        continent_name: null,
        status: 'not_found',
        message: '未找到地理位置信息'
      };
    }
    
    const countryNames = {
      'CN': '中国', 'US': '美国', 'JP': '日本', 'KR': '韩国', 'SG': '新加坡',
      'HK': '香港', 'TW': '台湾', 'GB': '英国', 'DE': '德国', 'FR': '法国',
      'CA': '加拿大', 'AU': '澳大利亚', 'RU': '俄罗斯', 'IN': '印度', 'IT': '意大利',
      'ES': '西班牙', 'NL': '荷兰', 'BR': '巴西', 'MX': '墨西哥', 'SE': '瑞典',
      'NO': '挪威', 'DK': '丹麦', 'FI': '芬兰', 'CH': '瑞士', 'AT': '奥地利',
      'BE': '比利时', 'IE': '爱尔兰', 'PL': '波兰', 'TR': '土耳其', 'GR': '希腊',
      'PT': '葡萄牙', 'CZ': '捷克', 'HU': '匈牙利', 'TH': '泰国', 'MY': '马来西亚',
      'ID': '印尼', 'PH': '菲律宾', 'VN': '越南', 'ZA': '南非', 'EG': '埃及',
      'IL': '以色列', 'SA': '沙特阿拉伯', 'AE': '阿联酋', 'AR': '阿根廷', 'CL': '智利',
      'CO': '哥伦比亚', 'PE': '秘鲁', 'VE': '委内瑞拉', 'UA': '乌克兰', 'RO': '罗马尼亚',
      'BG': '保加利亚', 'HR': '克罗地亚', 'RS': '塞尔维亚', 'SI': '斯洛文尼亚', 'SK': '斯洛伐克',
      'LT': '立陶宛', 'LV': '拉脱维亚', 'EE': '爱沙尼亚'
    };
    
    const continentNames = {
      'AS': '亚洲', 'EU': '欧洲', 'NA': '北美洲', 'SA': '南美洲',
      'AF': '非洲', 'OC': '大洋洲', 'AN': '南极洲'
    };
    
    return {
      ip: ip,
      country_code: result.country.iso_code,
      country_name: countryNames[result.country.iso_code] || result.country.names.en || result.country.iso_code,
      continent_code: result.continent?.code,
      continent_name: continentNames[result.continent?.code] || result.continent?.names?.en || result.continent?.code,
      status: 'success'
    };
    
  } catch (error) {
    return {
      ip: ip,
      country_code: null,
      country_name: null,
      continent_code: null,
      continent_name: null,
      status: 'error',
      message: error.message
    };
  }
}

function isValidIP(ip) {
  const ipv4Regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

// ==================== DNS 功能 ====================

async function resolveDomain(domain) {
  try {
    domain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    
    try {
      const addresses = await dns.resolve4(domain);
      return {
        domain: domain,
        ip: addresses[0],
        type: 'ipv4',
        status: 'success'
      };
    } catch (ipv4Error) {
      try {
        const addresses = await dns.resolve6(domain);
        return {
          domain: domain,
          ip: addresses[0],
          type: 'ipv6',
          status: 'success'
        };
      } catch (ipv6Error) {
        throw new Error(`无法解析域名: ${ipv4Error.message}`);
      }
    }
  } catch (error) {
    return {
      domain: domain,
      ip: null,
      type: null,
      status: 'error',
      message: error.message
    };
  }
}

function isDomain(input) {
  if (typeof input !== 'string' || input.length === 0) {
    return false;
  }
  
  let cleanInput = input.trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
  
  if (cleanInput.length > 253) {
    return false;
  }
  
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  
  if (!domainRegex.test(cleanInput)) {
    return false;
  }
  
  const parts = cleanInput.split('.');
  if (parts.length < 2) {
    return false;
  }
  
  const tld = parts[parts.length - 1];
  if (tld.length < 2 || !/^[a-zA-Z]{2,}$/.test(tld)) {
    return false;
  }
  
  if (cleanInput.startsWith('.') || cleanInput.endsWith('.')) {
    return false;
  }
  
  if (cleanInput.includes('..')) {
    return false;
  }
  
  return true;
}

// ==================== Network detector 功能 ====================

async function detectIP(testPoint) {
  for (const url of testPoint.urls) {
    try {
      const ip = await fetchIP(url, testPoint.key, testPoint.headers);
      if (ip && isValidIP(ip)) {
        const geoInfo = queryIP(ip);
        return {
          ip: ip,
          source_url: url,
          ...geoInfo,
          status: 'success'
        };
      }
    } catch (error) {
      console.log(`[${testPoint.name}] Failed to fetch from ${url}:`, error.message);
      continue;
    }
  }
  return { status: 'failed', message: '无法获取信息' };
}

function fetchIP(url, testType, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const timeout = 10000; // 增加到 10 秒

    const options = {
      timeout: timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'close',
        ...customHeaders
      }
    };

    // 特殊处理 CloudFlare
    if (testType === 'cloudflare' || url.includes('cloudflare.com')) {
      options.headers['Host'] = 'www.cloudflare.com';
    }

    const req = protocol.get(url, options, (res) => {
      let data = '';
      let dataSize = 0;
      const maxSize = 100000; // 增加到 100KB

      res.on('data', chunk => {
        data += chunk;
        dataSize += chunk.length;
        
        // 超过大小限制时停止接收
        if (dataSize > maxSize) {
          req.abort();
          reject(new Error('响应过大'));
          return;
        }
      });

      res.on('end', () => {
        try {
          const ip = parseIPFromResponse(data, url, testType);
          if (ip && isValidIP(ip)) {
            resolve(ip);
          } else {
            reject(new Error('无法解析IP'));
          }
        } catch (error) {
          reject(error);
        }
      });

      res.on('error', reject);
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.abort();
      reject(new Error('请求超时'));
    });
  });
}

function parseIPFromResponse(data, url, testType) {
  try {
    if (!data || data.length === 0) {
      return null;
    }

    // CloudFlare cdn-cgi/trace 格式
    if (url.includes('cdn-cgi/trace') || testType === 'cloudflare') {
      const match = data.match(/ip=([^\n\r]+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // JSON 格式处理
    if (data.trim().startsWith('{')) {
      try {
        const json = JSON.parse(data);
        // 尝试多种可能的字段名
        const ip = json.ip 
          || json.query 
          || json.ip_address 
          || json.origin
          || json.client_ip
          || (json.data && json.data.ip)
          || (json.result && json.result.ip);
        
        if (ip && isValidIP(ip)) {
          return ip;
        }
      } catch (e) {
        // JSON 解析失败，继续用正则
      }
    }

    // 纯文本 IP 格式（如 icanhazip.com 返回的格式）
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\s*$/.test(data.trim())) {
      return data.trim();
    }

    // 从 HTML 中提取 IP（处理真实网站响应）
    // 1. 从 script 标签中查找（很多网站会在 JS 中暴露 IP）
    const scriptMatches = data.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
    for (const script of scriptMatches) {
      const ipMatch = script.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      if (ipMatch && isValidIP(ipMatch[1])) {
        return ipMatch[1];
      }
    }

    // 2. 从页面内容中查找 IP（X-Forwarded-For, Client-IP 等）
    const patterns = [
      /clientip["\s:=]+([0-9.]+)/i,
      /client[_-]?ip["\s:=]+([0-9.]+)/i,
      /your[_-]?ip["\s:=]+([0-9.]+)/i,
      /ip[_-]?address["\s:=]+([0-9.]+)/i,
      /remote[_-]?ip["\s:=]+([0-9.]+)/i,
      /visitor[_-]?ip["\s:=]+([0-9.]+)/i,
      /x-forwarded-for["\s:=]+([0-9.]+)/i,
      /您的IP["\s:=：]*([0-9.]+)/,
      /your ip["\s:=：]*([0-9.]+)/i,
      /ip.*?([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/i
    ];

    for (const pattern of patterns) {
      const match = data.match(pattern);
      if (match && match[1]) {
        const ip = match[1].trim();
        if (isValidIP(ip)) {
          return ip;
        }
      }
    }

    // 3. 最后的兜底：直接正则提取任何 IP
    const ipMatch = data.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    if (ipMatch && isValidIP(ipMatch[1])) {
      return ipMatch[1];
    }

    return null;
  } catch (error) {
    console.error('[parseIPFromResponse] 解析IP失败:', error.message);
    return null;
  }
}

module.exports = {
  // GeoIP
  initGeoIP,
  queryIP,
  isValidIP,
  isCloudflareIP,
  // DNS
  resolveDomain,
  isDomain,
  // Network detector
  detectIP,
  fetchIP,
  parseIPFromResponse
};
