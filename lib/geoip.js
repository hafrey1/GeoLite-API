const maxmind = require('maxmind');
const path = require('path');

let lookup = null;

// 初始化GeoLite2数据库
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

// 🌐 检查是否为 Cloudflare IP
function isCloudflareIP(ip) {
  if (!ip || typeof ip !== 'string') {
    return false;
  }
  
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) {
    return false;
  }
  
  const [oct1, oct2, oct3, oct4] = parts;
  
  // Cloudflare 主要 IP 段
  const ranges = [
    // 104.16.0.0/12 (104.16.0.0 - 104.31.255.255)
    { min: [104, 16, 0, 0], max: [104, 31, 255, 255] },
    // 172.64.0.0/13 (172.64.0.0 - 172.71.255.255)
    { min: [172, 64, 0, 0], max: [172, 71, 255, 255] },
    // 173.245.48.0/20
    { min: [173, 245, 48, 0], max: [173, 245, 63, 255] },
    // 103.21.244.0/22
    { min: [103, 21, 244, 0], max: [103, 21, 247, 255] },
    // 103.22.200.0/22
    { min: [103, 22, 200, 0], max: [103, 22, 203, 255] },
    // 103.31.4.0/22
    { min: [103, 31, 4, 0], max: [103, 31, 7, 255] },
    // 141.101.64.0/18
    { min: [141, 101, 64, 0], max: [141, 101, 127, 255] },
    // 108.162.192.0/18
    { min: [108, 162, 192, 0], max: [108, 162, 255, 255] },
    // 190.93.240.0/20
    { min: [190, 93, 240, 0], max: [190, 93, 255, 255] },
    // 188.114.96.0/20
    { min: [188, 114, 96, 0], max: [188, 114, 111, 255] },
    // 197.234.240.0/22
    { min: [197, 234, 240, 0], max: [197, 234, 243, 255] },
    // 198.41.128.0/17
    { min: [198, 41, 128, 0], max: [198, 41, 255, 255] },
    // 162.158.0.0/15
    { min: [162, 158, 0, 0], max: [162, 159, 255, 255] },
    // 104.16.0.0/13
    { min: [104, 16, 0, 0], max: [104, 23, 255, 255] },
    // 104.24.0.0/14
    { min: [104, 24, 0, 0], max: [104, 27, 255, 255] },
    // 131.0.72.0/22
    { min: [131, 0, 72, 0], max: [131, 0, 75, 255] }
  ];
  
  // 检查IP是否在任何Cloudflare范围内
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

// 查询IP地理位置
function queryIP(ip) {
  try {
    if (!lookup) {
      throw new Error('GeoIP数据库未初始化');
    }
    
    // ✅ 优先检查是否为 Cloudflare IP - 返回特殊标识
    if (isCloudflareIP(ip)) {
      return {
        ip: ip,
        country_code: 'XX',
        country_name: '全球 CDN',
        continent_code: 'XX',
        continent_name: '全球',
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
    
    // 国家名称中文映射
    const countryNames = {
      'CN': '中国',
      'US': '美国',
      'JP': '日本',
      'KR': '韩国',
      'SG': '新加坡',
      'HK': '香港',
      'TW': '台湾',
      'GB': '英国',
      'DE': '德国',
      'FR': '法国',
      'CA': '加拿大',
      'AU': '澳大利亚',
      'RU': '俄罗斯',
      'IN': '印度',
      'IT': '意大利',
      'ES': '西班牙',
      'NL': '荷兰',
      'BR': '巴西',
      'MX': '墨西哥',
      'SE': '瑞典',
      'NO': '挪威',
      'DK': '丹麦',
      'FI': '芬兰',
      'CH': '瑞士',
      'AT': '奥地利',
      'BE': '比利时',
      'IE': '爱尔兰',
      'PL': '波兰',
      'TR': '土耳其',
      'GR': '希腊',
      'PT': '葡萄牙',
      'CZ': '捷克',
      'HU': '匈牙利',
      'TH': '泰国',
      'MY': '马来西亚',
      'ID': '印尼',
      'PH': '菲律宾',
      'VN': '越南',
      'ZA': '南非',
      'EG': '埃及',
      'IL': '以色列',
      'SA': '沙特阿拉伯',
      'AE': '阿联酋',
      'AR': '阿根廷',
      'CL': '智利',
      'CO': '哥伦比亚',
      'PE': '秘鲁',
      'VE': '委内瑞拉',
      'UA': '乌克兰',
      'RO': '罗马尼亚',
      'BG': '保加利亚',
      'HR': '克罗地亚',
      'RS': '塞尔维亚',
      'SI': '斯洛文尼亚',
      'SK': '斯洛伐克',
      'LT': '立陶宛',
      'LV': '拉脱维亚',
      'EE': '爱沙尼亚'
    };
    
    // 大洲名称中文映射
    const continentNames = {
      'AS': '亚洲',
      'EU': '欧洲',
      'NA': '北美洲',
      'SA': '南美洲',
      'AF': '非洲',
      'OC': '大洋洲',
      'AN': '南极洲'
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

// 验证IP地址格式
function isValidIP(ip) {
  // IPv4 正则表达式
  const ipv4Regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  // IPv6 正则表达式（简化版）
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

module.exports = {
  initGeoIP,
  queryIP,
  isValidIP
};
