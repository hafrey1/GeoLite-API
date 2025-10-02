const { promises: dns } = require('dns');

// 解析域名为IP地址
async function resolveDomain(domain) {
  try {
    // 移除协议前缀和路径后缀
    domain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    
    // 优先尝试IPv4解析
    try {
      const addresses = await dns.resolve4(domain);
      return {
        domain: domain,
        ip: addresses[0],
        type: 'ipv4',
        status: 'success'
      };
    } catch (ipv4Error) {
      // IPv4失败则尝试IPv6解析
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

// 判断输入是否为域名
function isDomain(input) {
  if (typeof input !== 'string' || input.length === 0) {
    return false;
  }
  
  // 清理URL格式（移除协议和路径）
  let cleanInput = input.trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, ''); // 移除端口号
  
  // 基本长度检查
  if (cleanInput.length > 253) {
    return false;
  }
  
  // ✅ 支持多级域名的正则表达式
  // 匹配格式：subdomain.domain.tld 或 domain.tld
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  
  if (!domainRegex.test(cleanInput)) {
    return false;
  }
  
  // 检查是否包含有效的TLD
  const parts = cleanInput.split('.');
  if (parts.length < 2) {
    return false;
  }
  
  // 验证TLD格式
  const tld = parts[parts.length - 1];
  if (tld.length < 2 || !/^[a-zA-Z]{2,}$/.test(tld)) {
    return false;
  }
  
  // 排除以点开头或结尾
  if (cleanInput.startsWith('.') || cleanInput.endsWith('.')) {
    return false;
  }
  
  // 排除连续的点
  if (cleanInput.includes('..')) {
    return false;
  }
  
  return true;
}

module.exports = {
  resolveDomain,
  isDomain
};
