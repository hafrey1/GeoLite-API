const dns = require('dns').promises;

// 解析域名为IP地址
async function resolveDomain(domain) {
  try {
    // 移除协议前缀
    domain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    
    // 优先尝试IPv4
    try {
      const addresses = await dns.resolve4(domain);
      return {
        domain: domain,
        ip: addresses[0],
        type: 'ipv4',
        status: 'success'
      };
    } catch (ipv4Error) {
      // 如果IPv4失败，尝试IPv6
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

// 判断是否为域名
function isDomain(input) {
  // 简单的域名格式检查
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
  const urlRegex = /^https?:\/\//;
  
  return domainRegex.test(input.replace(/^https?:\/\//, '').replace(/\/.*$/, '')) || urlRegex.test(input);
}

module.exports = {
  resolveDomain,
  isDomain
};
