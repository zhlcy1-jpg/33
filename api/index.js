import yahooFinance from 'yahoo-finance2';

export default async function handler(req, res) {
  // 設置 Header
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // 獲取 ISIN (從 Query 獲取，或默認使用你的基金)
  const isin = req.query.isin || 'LU1929549753';

  try {
    // 1. 搜尋基金
    const searchResult = await yahooFinance.search(isin);
    
    if (!searchResult.quotes || searchResult.quotes.length === 0) {
      return res.status(404).json({ error: `ISIN ${isin} not found` });
    }

    const symbol = searchResult.quotes[0].symbol;

    // 2. 並行抓取淨值與宏觀新聞
    const [quote, newsSearch] = await Promise.all([
      yahooFinance.quote(symbol),
      yahooFinance.search('Global Macro Economy', { newsCount: 5 })
    ]);

    // 3. 整理輸出
    const data = {
      status: "success",
      timestamp: new Date().toISOString(),
      fund: {
        isin: isin,
        symbol: symbol,
        name: quote.shortName || quote.longName,
        nav: quote.regularMarketPrice,
        currency: quote.currency,
        changePercent: quote.regularMarketChangePercent,
        lastUpdated: quote.regularMarketTime
      },
      macro_news: (newsSearch.news || []).map(n => ({
        title: n.title,
        publisher: n.publisher,
        link: n.link,
        time: n.providerPublishTime
      }))
    };

    return res.status(200).json(data);

  } catch (error) {
    console.error('Runtime Error:', error);
    return res.status(500).json({ 
      status: "error", 
      message: error.message,
      tip: "Check if Yahoo Finance is blocking the request"
    });
  }
}