import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.38.co.kr';
const LIST_URL = `${BASE_URL}/html/fund/index.htm?o=k`;

interface IpoListItem {
  externalId: number;
  stockName: string;
  subscriptionDate: string | null;
  offeringPrice: string | null;
  offeringPriceRange: string | null;
  leadUnderwriter: string | null;
}

interface IpoDetail {
  stockCode: string | null;
  category: string | null;
  totalShares: string | null;
  confirmedPrice: string | null;
  institutionalCompetitionRate: string | null;
  lockUpRate: string | null;
  subscriptionCompetitionRate: string | null;
  irDate: string | null;
  listingDate: string | null;
  refundDate: string | null;
}

export interface IpoScrapedData extends IpoListItem, IpoDetail {}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MyStockBot/1.0)' },
  });
  const buffer = await res.arrayBuffer();
  const decoder = new TextDecoder('euc-kr');
  return decoder.decode(buffer);
}

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function emptyToNull(text: string): string | null {
  const v = clean(text);
  return (v && v !== '-') ? v : null;
}

export async function scrapeIpoList(page = 1): Promise<IpoListItem[]> {
  const url = page === 1 ? LIST_URL : `${LIST_URL}&page=${page}`;
  const html = await fetchPage(url);
  const $ = cheerio.load(html);
  const items: IpoListItem[] = [];

  // 공모주 상세 링크: /html/fund/?o=v&no=XXXX&l=&page=1 형태
  $('a[href*="/html/fund/?o=v&no="]').each((_, el) => {
    const $link = $(el);
    const href = $link.attr('href') || '';
    if (!href.includes('l=') || !href.includes('page=')) return;

    const noMatch = href.match(/no=(\d+)/);
    if (!noMatch) return;

    const externalId = parseInt(noMatch[1], 10);
    const stockName = clean($link.text());
    if (!stockName) return;

    const $row = $link.closest('tr');
    const tds = $row.children('td');
    if (tds.length < 6) return;

    items.push({
      externalId,
      stockName,
      subscriptionDate: emptyToNull(tds.eq(1).text()),
      offeringPrice: emptyToNull(tds.eq(2).text()),
      offeringPriceRange: emptyToNull(tds.eq(3).text()),
      leadUnderwriter: emptyToNull(tds.eq(5).text()),
    });
  });

  return items;
}

function buildLabelMap($: cheerio.CheerioAPI): Map<string, string> {
  const map = new Map<string, string>();

  // 4-cell rows: label, value, label, value
  $('tr').each((_, tr) => {
    const tds = $(tr).children('td');
    if (tds.length === 4) {
      const l1 = clean(tds.eq(0).text());
      const v1 = clean(tds.eq(1).text());
      const l2 = clean(tds.eq(2).text());
      const v2 = clean(tds.eq(3).text());
      if (l1 && v1 && l1.length < 20) map.set(l1, v1);
      if (l2 && v2 && l2.length < 20) map.set(l2, v2);
    }
    // 2-cell rows: label, value
    if (tds.length === 2) {
      const label = clean(tds.eq(0).text());
      const value = clean(tds.eq(1).text());
      if (label && value && label.length < 20) map.set(label, value);
    }
  });

  return map;
}

function getFromMap(map: Map<string, string>, ...keys: string[]): string | null {
  for (const key of keys) {
    const val = map.get(key);
    if (val && val !== '-') return val;
  }
  return null;
}

export async function scrapeIpoDetail(externalId: number): Promise<IpoDetail> {
  const url = `${BASE_URL}/html/fund/?o=v&no=${externalId}`;
  const html = await fetchPage(url);
  const $ = cheerio.load(html);
  const map = buildLabelMap($);

  return {
    stockCode: getFromMap(map, '종목코드'),
    category: getFromMap(map, '업종'),
    totalShares: getFromMap(map, '총공모주식수', '공모주식수'),
    confirmedPrice: getFromMap(map, '확정공모가'),
    institutionalCompetitionRate: getFromMap(map, '기관경쟁률'),
    lockUpRate: getFromMap(map, '의무보유확약'),
    subscriptionCompetitionRate: getFromMap(map, '청약경쟁률'),
    irDate: getFromMap(map, '공모청약일'),
    listingDate: getFromMap(map, '신규상장일', '상장일'),
    refundDate: getFromMap(map, '환불일', '납입일'),
  };
}

export async function scrapeAll(pages = 2): Promise<IpoScrapedData[]> {
  const allItems: IpoListItem[] = [];

  for (let page = 1; page <= pages; page++) {
    const items = await scrapeIpoList(page);
    allItems.push(...items);
    if (page < pages) await delay(500);
  }

  const results: IpoScrapedData[] = [];

  for (const item of allItems) {
    try {
      const detail = await scrapeIpoDetail(item.externalId);
      results.push({ ...item, ...detail });
      await delay(300);
    } catch {
      results.push({
        ...item,
        stockCode: null,
        category: null,
        totalShares: null,
        confirmedPrice: null,
        institutionalCompetitionRate: null,
        lockUpRate: null,
        subscriptionCompetitionRate: null,
        irDate: null,
        listingDate: null,
        refundDate: null,
      });
    }
  }

  return results;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
