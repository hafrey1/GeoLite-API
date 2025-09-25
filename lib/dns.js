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
  // 域名格式检查
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
  const urlRegex = /^https?:\/\//;
  
  // 清理URL格式
  const cleanInput = input.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return domainRegex.test(cleanInput) || urlRegex.test(input);
}

module.exports = {
  resolveDomain,
  isDomain
};
