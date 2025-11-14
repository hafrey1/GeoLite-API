#!/usr/bin/env node
/**
 * 网络检测功能测试脚本
 * 测试所有 5 个测试点的 IP 检测
 */

const { detectIP } = require('./lib/all');

// 测试点配置 - 与 api/index.js 中保持同步
const testPoints = [
  { 
    key: 'domestic', 
    name: '国内测试',
    urls: [
      'https://myip.ipip.net/',
      'https://www.atool.online/ip',
      'https://ip.tool.chinaz.com/',
      'https://checkip.amazonaws.com/',
      'https://api.ipify.org?format=json'
    ],
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://myip.ipip.net/',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    }
  },
  { 
    key: 'foreign', 
    name: '国外测试',
    urls: [
      'https://ipv4.icanhazip.com/',
      'https://api.ipify.org?format=json',
      'https://ifconfig.me/',
      'https://ident.me/',
      'https://api.myip.com/'
    ],
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://ipv4.icanhazip.com/',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br'
    }
  },
  { 
    key: 'cloudflare', 
    name: 'CloudFlare CDN',
    urls: [
      'https://www.cloudflare.com/cdn-cgi/trace',
      'https://1.1.1.1/',
      'https://1.0.0.1/',
      'https://ipv4.icanhazip.com/'
    ],
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.cloudflare.com/',
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache'
    }
  },
  { 
    key: 'twitter', 
    name: 'Twitter/X',
    urls: [
      'https://ifconfig.me/',
      'https://api.ipify.org?format=json',
      'https://ipinfo.io/ip',
      'https://www.atool.online/ip'
    ],
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://ifconfig.me/',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br'
    }
  }
];

async function testNetwork() {
  console.log('🌐 开始测试网络检测功能...\n');
  const startTime = Date.now();
  const results = [];

  for (const point of testPoints) {
    console.log(`\n📍 测试: ${point.name} (${point.key})`);
    console.log('━'.repeat(50));
    
    try {
      const pointStartTime = Date.now();
      const result = await detectIP(point);
      const pointTime = Date.now() - pointStartTime;
      
      results.push({
        name: point.name,
        key: point.key,
        result: result,
        time: pointTime
      });
      
      if (result.status === 'success') {
        console.log(`✅ 成功获取 IP: ${result.ip}`);
        console.log(`   国家: ${result.country_name} (${result.country_code})`);
        console.log(`   大洲: ${result.continent_name}`);
        console.log(`   源: ${result.source_url}`);
      } else {
        console.log(`❌ 失败: ${result.message}`);
      }
      console.log(`⏱️  耗时: ${pointTime}ms`);
    } catch (error) {
      console.error(`❌ 异常: ${error.message}`);
      results.push({
        name: point.name,
        key: point.key,
        result: null,
        error: error.message,
        time: Date.now() - startTime
      });
    }
  }

  const totalTime = Date.now() - startTime;
  const successCount = results.filter(r => r.result?.status === 'success').length;

  console.log('\n' + '═'.repeat(50));
  console.log('📊 测试汇总');
  console.log('═'.repeat(50));
  console.log(`总耗时: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
  console.log(`成功: ${successCount}/${results.length}`);
  console.log(`成功率: ${((successCount / results.length) * 100).toFixed(1)}%`);
  
  console.log('\n详细结果:');
  results.forEach(r => {
    const status = r.result?.status === 'success' ? '✅' : '❌';
    const ip = r.result?.ip || 'N/A';
    const country = r.result?.country_code || 'N/A';
    console.log(`  ${status} ${r.name.padEnd(15)} | IP: ${ip.padEnd(15)} | ${country} | ${r.time}ms`);
  });
}

testNetwork().catch(console.error);
