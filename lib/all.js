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
      const ip = await fetchIP(url, testPoint.key);
      if (ip) {
        const geoInfo = queryIP(ip);
        return {
          ip: ip,
          source_url: url,
          ...geoInfo,
          status: 'success'
        };
      }
    } catch (error) {
      console.log(`Failed to fetch from ${url}:`, error.message);
      continue;
    }
  }
  return null;
}

function fetchIP(url, testType) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const timeout = 5000;

    const options = {
      timeout: timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    if (testType === 'cloudflare' && url.includes('cdn-cgi/trace')) {
      options.headers['Host'] = 'www.cloudflare.com';
    }

    const req = protocol.get(url, options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const ip = parseIPFromResponse(data, url, testType);
          if (ip) {
            resolve(ip);
          } else {
            reject(new Error('无法解析IP'));
          }
        } catch (error) {
          reject(error);
        }
      });
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
    if (url.includes('cdn-cgi/trace')) {
      const match = data.match(/ip=([^\n]+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    if (data.startsWith('{')) {
      const json = JSON.parse(data);
      return json.ip || json.query || json.ip_address || null;
    }

    const ipMatch = data.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    if (ipMatch) {
      return ipMatch[1];
    }

    return null;
  } catch (error) {
    console.error('解析IP失败:', error);
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
