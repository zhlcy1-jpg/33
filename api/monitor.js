import yahooFinance from 'yahoo-finance2';

export default async function handler(req, res) {
  // 設置跨域與格式
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const ISIN = 'LU1929549753'; // 富蘭克林入息基金 A (Mdis) HKD

  try {
    // 1. 透過 ISIN 搜尋對應的 Yahoo Finance Symbol
    // 許多盧森堡基金在 Yahoo 的 Ticker 是內部編碼（例如 0P0001FXYZ.HK），直接搜 ISIN 最準確
    const searchResult = await yahooFinance.search(ISIN);
    
    if (!searchResult.quotes || searchResult.quotes.length === 0) {
      return res.status(404).json({ error: `找不到 ISIN 為 ${ISIN} 的標的` });
    }

    const fundSymbol = searchResult.quotes[0].symbol;
    const fundName = searchResult.quotes[0].shortname || searchResult.quotes[0].longname;

    // 2. 獲取基金即時報價 (NAV)
    const quote = await yahooFinance.quote(fundSymbol);

    // 3. 獲取全球宏觀新聞 (以 "Global Macro" 和 "Economic News" 為關鍵字)
    // 我們使用 yahooFinance.search 的新聞功能，這比解析 RSS 更穩定且格式統一
    const newsSearch = await yahooFinance.search('Global Macro Economy', { newsCount: 5 });
    const macroNews = newsSearch.news.map(item => ({
      title: item.title,
      publisher: item.publisher,
      link: item.link,
      providerPublishTime: new Date(item.providerPublishTime).toISOString(),
      type: item.type
    }));

    // 4. 整合輸出數據
    const output = {
      timestamp: new Date().toISOString(),
      fund_info: {
        isin: ISIN,
        symbol: fundSymbol,
        name: fundName,
        nav: quote.regularMarketPrice, // 基金的最新淨值
        currency: quote.currency,
        change: quote.regularMarketChange,
        change_percent: quote.regularMarketChangePercent,
        last_updated: new Date(quote.regularMarketTime).toISOString()
      },
      global_macro_news: macroNews
    };

    return res.status(200).json(output);

  } catch (error) {
    console.error('Fetch Error:', error);
    return res.status(500).json({ 
      error: '無法抓取金融數據', 
      message: error.message 
    });
  }
}