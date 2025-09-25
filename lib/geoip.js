const maxmind = require('maxmind');
const path = require('path');

let lookup = null;

// 初始化GeoLite2数据库
async function initGeoIP() {
  if (!lookup) {
    try {
      const dbPath = path.join(process.cwd(), 'data', 'GeoLite2-Country.mmdb');
      lookup = await maxmind.open(dbPath);
      console.log('GeoLite2数据库初始化成功');
    } catch (error) {
      console.error('GeoLite2数据库初始化失败:', error);
      throw error;
    }
  }
  return lookup;
}

// 查询IP地理位置
function queryIP(ip) {
  try {
    if (!lookup) {
      throw new Error('GeoIP数据库未初始化');
    }
    
    const result = lookup.get(ip);
    
    if (!result || !result.country) {
      return {
        ip: ip,
        country_code: null,
        country_name: null,
        status: 'not_found',
        message: '未找到该IP的地理位置信息'
      };
    }
    
    return {
      ip: ip,
      country_code: result.country.iso_code || null,
      country_name: result.country.names ? 
        (result.country.names.zh_CN || result.country.names.en || null) : null,
      continent_code: result.continent ? result.continent.code : null,
      continent_name: result.continent ? 
        (result.continent.names.zh_CN || result.continent.names.en || null) : null,
      status: 'success'
    };
  } catch (error) {
    return {
      ip: ip,
      country_code: null,
      country_name: null,
      status: 'error',
      message: error.message
    };
  }
}

// 验证IP地址格式
function isValidIP(ip) {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

module.exports = {
  initGeoIP,
  queryIP,
  isValidIP
};
