const https = require('https');
const http = require('http');
const { NextResponse } = require('next/server');

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&laquo;/gi, '«')
    .replace(/&raquo;/gi, '»')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .trim();
}

// --- 1. PromoDJ ---
function searchPromoDJ(trimmed, startPage = 1, pageCount = 4) {
  const pagePromises = [];
  for (let p = startPage; p < startPage + pageCount; p++) {
    pagePromises.push(new Promise((resolve) => {
      const encodedQuery = encodeURIComponent(trimmed);
      const url = `https://promodj.com/search?searchfor=${encodedQuery}&mode=audio&results=1&page=${p}`;
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        timeout: 6000
      };

      const req = https.get(url, options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (!data || !data.results) return resolve([]);
            const parsedTracks = [];
            for (const item of data.results) {
              const html = item.html || '';
              const kindID = item.kindID;
              const titleMatch = html.match(/<div class="title">[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
              const durationMatch = html.match(/<span class="duration">([^<]+)<\/span>/);
              const avatarMatch = html.match(/style="background-image:url\(([^)]+)\)/);
              const authorMatch = html.match(/<div class="title">[\s\S]*?<a[^>]*href="https:\/\/promodj\.com\/([^\/]+)\//);
              if (titleMatch && kindID) {
                const pageUrl = titleMatch[1];
                const rawTitle = decodeHtmlEntities(titleMatch[2].replace(/<[^>]+>/g, '').trim());
                const slug = pageUrl.split('/').filter(Boolean).pop();
                const author = decodeHtmlEntities(authorMatch ? authorMatch[1] : '');
                parsedTracks.push({
                  id: kindID,
                  title: rawTitle,
                  author: author || 'PromoDJ',
                  pageUrl: pageUrl,
                  duration: durationMatch ? durationMatch[1].trim() : '',
                  avatar: avatarMatch ? avatarMatch[1] : '',
                  streamUrl: `https://promodj.com/prelisten/${kindID}/${slug}.mp3`,
                  source: 'promodj'
                });
              }
            }
            resolve(parsedTracks);
          } catch (err) {
            resolve([]);
          }
        });
      });
      req.on('error', () => resolve([]));
      req.on('timeout', () => { req.destroy(); resolve([]); });
    }));
  }
  return Promise.all(pagePromises).then(pages => pages.flat());
}

// --- 2. Top Stations ---
function searchTopStations(trimmed) {
  const stationsList = [
    { id: 'soma-groove', title: 'SomaFM — Groove Salad (Downtempo Chillout)', author: 'SomaFM (San Francisco)', duration: 'Live 128k', streamUrl: 'https://ice2.somafm.com/groovesalad-128-mp3', source: 'stations' },
    { id: 'soma-deepspace', title: 'SomaFM — Deep Space One (Ambient Focus)', author: 'SomaFM', duration: 'Live 128k', streamUrl: 'https://ice1.somafm.com/deepspaceone-128-mp3', source: 'stations' },
    { id: 'soma-lush', title: 'SomaFM — Lush (Sensuous Vocal Chillout)', author: 'SomaFM', duration: 'Live 128k', streamUrl: 'https://ice2.somafm.com/lush-128-mp3', source: 'stations' },
    { id: 'soma-secret', title: 'SomaFM — Secret Agent (Spy/Lounge/Surf)', author: 'SomaFM', duration: 'Live 128k', streamUrl: 'https://ice1.somafm.com/secretagent-128-mp3', source: 'stations' },
    { id: 'rec-chill', title: 'Radio Record — Record Chill-Out', author: 'Radio Record', duration: 'Live 320k', streamUrl: 'https://radiorecord.hostingradio.ru/chil96.aacp', source: 'stations' },
    { id: 'rec-deep', title: 'Radio Record — Record Deep House', author: 'Radio Record', duration: 'Live 320k', streamUrl: 'https://radiorecord.hostingradio.ru/deep96.aacp', source: 'stations' },
    { id: 'rec-innocence', title: 'Radio Record — Innocence (Pure Relax)', author: 'Radio Record', duration: 'Live 320k', streamUrl: 'https://radiorecord.hostingradio.ru/mdl96.aacp', source: 'stations' },
    { id: 'relax-fm', title: 'Relax FM (Спокойная музыка)', author: 'Relax FM (Москва)', duration: 'Live 128k', streamUrl: 'https://pub0201.101.ru/stream/trust/mp3/128/24?', source: 'stations' },
    { id: 'ibiza-sonica', title: 'Ibiza Sonica Radio (Live from Ibiza)', author: 'Ibiza Sonica', duration: 'Live 128k', streamUrl: 'https://ibizasonica.live-streams.nl:8010/live', source: 'stations' }
  ];
  const q = trimmed.toLowerCase();
  return stationsList.filter(s => q === 'all' || q.length < 2 || s.title.toLowerCase().includes(q) || s.author.toLowerCase().includes(q));
}

// --- 3. Zaycev.FM ---
function searchZaycev(trimmed) {
  const zaycevStations = [
    { id: 'zfm-pop', title: 'Зайцев.FM — Поп-Музыка', author: 'Zaycev.FM', duration: 'Live', streamUrl: 'http://radio.zaycev.fm:9002/ZaycevFM(128)', source: 'zaycev' },
    { id: 'zfm-club', title: 'Зайцев.FM — Club / Танцевальная', author: 'Zaycev.FM', duration: 'Live', streamUrl: 'http://radio.zaycev.fm:9002/club(128)', source: 'zaycev' },
    { id: 'zfm-disco', title: 'Зайцев.FM — Диско 80-90х', author: 'Zaycev.FM', duration: 'Live', streamUrl: 'http://radio.zaycev.fm:9002/disco(128)', source: 'zaycev' },
    { id: 'zfm-new', title: 'Зайцев.FM — Новинки Эфира', author: 'Zaycev.FM', duration: 'Live', streamUrl: 'http://radio.zaycev.fm:9002/new(128)', source: 'zaycev' },
    { id: 'zfm-relax', title: 'Зайцев.FM — Relax & Chill', author: 'Zaycev.FM', duration: 'Live', streamUrl: 'http://radio.zaycev.fm:9002/relax(128)', source: 'zaycev' }
  ];
  const q = trimmed.toLowerCase();
  return zaycevStations.filter(s => q === 'all' || q.length < 2 || s.title.toLowerCase().includes(q) || s.author.toLowerCase().includes(q));
}

// --- 4. Radio-Browser ---
function searchRadioBrowser(trimmed, limit = 60, offset = 0) {
  return new Promise((resolve) => {
    const url = `https://de1.api.radio-browser.info/json/stations/search?name=${encodeURIComponent(trimmed)}&limit=${limit}&offset=${offset}`;
    const req = https.get(url, { headers: { 'User-Agent': 'Fonograficus/1.0' }, timeout: 6000 }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const list = JSON.parse(body);
          if (!Array.isArray(list)) return resolve([]);
          const stations = list.map(s => ({
            id: s.stationuuid,
            title: s.name.trim(),
            author: s.country ? `${s.country} • Live Radio` : 'Online Radio',
            duration: s.bitrate ? `${s.bitrate} kbps` : 'Live',
            avatar: s.favicon || '',
            streamUrl: s.url_resolved || s.url,
            source: 'radio'
          })).filter(s => s.streamUrl && s.streamUrl.startsWith('http'));
          resolve(stations);
        } catch(e) { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.on('timeout', () => { req.destroy(); resolve([]); });
  });
}

// --- 5. BananaStreet Radio ---
const bananaRadioStations = [
  { id: 'bs-deep', title: 'BananaStreet — Deep House', author: 'BananaStreet Radio', duration: 'Live 320k', streamUrl: 'https://azurabanana.bananastreet.ru/listen/deep/radio.mp3', avatar: 'https://bananastreet.ru/assets/CgpEfSbz.png', source: 'banana' },
  { id: 'bs-lounge', title: 'BananaStreet — Lounge & Chillout', author: 'BananaStreet Radio', duration: 'Live 320k', streamUrl: 'https://azurabanana.bananastreet.ru/listen/lounge/radio.mp3', avatar: 'https://bananastreet.ru/assets/CgpEfSbz.png', source: 'banana' },
  { id: 'bs-club', title: 'BananaStreet — EDM & Club Dance', author: 'BananaStreet Radio', duration: 'Live 320k', streamUrl: 'https://azurabanana.bananastreet.ru/listen/club/radio.mp3', avatar: 'https://bananastreet.ru/assets/CgpEfSbz.png', source: 'banana' },
  { id: 'bs-retro', title: 'BananaStreet — Retro & Melodies', author: 'BananaStreet Radio', duration: 'Live 320k', streamUrl: 'https://azurabanana.bananastreet.ru/listen/retro/radio.mp3', avatar: 'https://bananastreet.ru/assets/CgpEfSbz.png', source: 'banana' },
  { id: 'bs-russian', title: 'BananaStreet — Russian Dance / Поп', author: 'BananaStreet Radio', duration: 'Live 320k', streamUrl: 'https://azurabanana.bananastreet.ru/listen/bananastreet_russian/radio.mp3', avatar: 'https://bananastreet.ru/assets/CgpEfSbz.png', source: 'banana' },
  { id: 'bs-summer', title: 'BananaStreet — Summer Vibes & Beach', author: 'BananaStreet Radio', duration: 'Live 320k', streamUrl: 'https://azurabanana.bananastreet.ru/listen/summer/radio.mp3', avatar: 'https://bananastreet.ru/assets/CgpEfSbz.png', source: 'banana' },
  { id: 'bs-organic', title: 'BananaStreet — Organic House / Oriental', author: 'BananaStreet Radio', duration: 'Live 320k', streamUrl: 'https://azurabanana.bananastreet.ru/listen/organic/radio.mp3', avatar: 'https://bananastreet.ru/assets/CgpEfSbz.png', source: 'banana' },
  { id: 'bs-hiphop', title: 'BananaStreet — Hip-Hop & R&B', author: 'BananaStreet Radio', duration: 'Live 320k', streamUrl: 'https://azurabanana.bananastreet.ru/listen/hip-hop/radio.mp3', avatar: 'https://bananastreet.ru/assets/CgpEfSbz.png', source: 'banana' },
  { id: 'bs-main', title: 'BananaStreet — Main Station', author: 'BananaStreet Radio', duration: 'Live 320k', streamUrl: 'https://azurabanana.bananastreet.ru/listen/main_station/radio.mp3', avatar: 'https://bananastreet.ru/assets/CgpEfSbz.png', source: 'banana' },
  { id: 'bs-hits', title: 'BananaStreet — Hits & Covers', author: 'BananaStreet Radio', duration: 'Live 320k', streamUrl: 'https://azurabanana.bananastreet.ru/listen/hits__covers/radio.mp3', avatar: 'https://bananastreet.ru/assets/CgpEfSbz.png', source: 'banana' },
  { id: 'bs-focus', title: 'BananaStreet — Focus & Coding Ambient', author: 'BananaStreet Radio', duration: 'Live 320k', streamUrl: 'https://azurabanana.bananastreet.ru/listen/focus/radio.mp3', avatar: 'https://bananastreet.ru/assets/CgpEfSbz.png', source: 'banana' },
  { id: 'bs-remixes', title: 'BananaStreet — Special Club Remixes', author: 'BananaStreet Radio', duration: 'Live 320k', streamUrl: 'https://azurabanana.bananastreet.ru/listen/remixes/radio.mp3', avatar: 'https://bananastreet.ru/assets/CgpEfSbz.png', source: 'banana' },
  { id: 'bs-house', title: 'BananaStreet — Pure House Music', author: 'BananaStreet Radio', duration: 'Live 320k', streamUrl: 'https://azurabanana.bananastreet.ru/listen/house/radio.mp3', avatar: 'https://bananastreet.ru/assets/CgpEfSbz.png', source: 'banana' },
  { id: 'bs-soft', title: 'BananaStreet — Soft & Acoustic / Calm', author: 'BananaStreet Radio', duration: 'Live 320k', streamUrl: 'https://azurabanana.bananastreet.ru/listen/soft/radio.mp3', avatar: 'https://bananastreet.ru/assets/CgpEfSbz.png', source: 'banana' },
  { id: 'bs-slow', title: 'BananaStreet — Slow & Lo-Fi Beats', author: 'BananaStreet Radio', duration: 'Live 320k', streamUrl: 'https://azurabanana.bananastreet.ru/listen/slow/radio.mp3', avatar: 'https://bananastreet.ru/assets/CgpEfSbz.png', source: 'banana' },
  { id: 'bs-afro', title: 'BananaStreet — Afro House', author: 'BananaStreet Radio', duration: 'Live 320k', streamUrl: 'https://azurabanana.bananastreet.ru/listen/afro_house/radio.mp3', avatar: 'https://bananastreet.ru/assets/CgpEfSbz.png', source: 'banana' }
];

function searchBananaRadio(trimmed) {
  const q = trimmed.toLowerCase();
  if (q === 'all' || q.length < 2 || q.includes('banana') || q.includes('банан') || q.includes('радио') || q.includes('radio')) {
    return bananaRadioStations;
  }
  return bananaRadioStations.filter(s => s.title.toLowerCase().includes(q) || s.author.toLowerCase().includes(q));
}

// --- 6. BananaStreet Tracks ---
function bananaGraphQL(query, variables = {}, timeout = 6000) {
  return new Promise((resolve) => {
    try {
      const postData = JSON.stringify({ query, variables });
      const req = https.request('https://bananastreet.ru/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout
      }, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); } catch (e) { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.write(postData);
      req.end();
    } catch (e) { resolve(null); }
  });
}

async function searchBananaTracks(trimmed, pageNum = 1, limit = 12) {
  try {
    const after = pageNum > 1 ? String((pageNum - 1) * limit) : undefined;
    const searchTargetQuery = `
      query GetSearchTarget($target: SearchTargetTypeEnum!, $q: String!, $first: Int = 12, $after: String) {
        search(q: $q, isMedia: false) {
          byTarget(first: $first, target: $target, after: $after) {
            nodes {
              ... on Release {
                id
                title
                slug
                cover { src }
                djs { title }
              }
            }
          }
        }
      }
    `;

    const searchRes = await bananaGraphQL(searchTargetQuery, { target: 'releases', q: trimmed, first: limit, after }, 5000);
    const releases = searchRes?.data?.search?.byTarget?.nodes || [];
    if (!releases.length) return [];

    const releaseTracksQuery = `
      query GetReleaseTracksQuery($id: Int!) {
        release(id: $id) {
          id
          tracks(first: 5) {
            nodes {
              id
              title
              file { url }
            }
          }
        }
      }
    `;

    const trackPromises = releases.map(rel => bananaGraphQL(releaseTracksQuery, { id: rel.id }, 4000));
    const trackResults = await Promise.all(trackPromises);
    const tracks = [];

    trackResults.forEach((res, i) => {
      const rel = releases[i];
      if (!rel) return;
      const nodes = res?.data?.release?.tracks?.nodes || [];
      const author = rel.djs && rel.djs.length > 0 ? rel.djs.map(d => d.title).join(', ') : 'BananaStreet';
      const cover = rel.cover?.src || 'https://bananastreet.ru/assets/CgpEfSbz.png';

      nodes.forEach(tr => {
        if (tr && tr.file && tr.file.url) {
          let audioUrl = tr.file.url;
          try { audioUrl = encodeURI(decodeURI(audioUrl)); } catch(e) { audioUrl = encodeURI(audioUrl); }
          tracks.push({
            id: `bs-tr-${tr.id}`,
            title: tr.title ? `${tr.title}` : rel.title,
            author: author,
            duration: 'MP3',
            streamUrl: audioUrl,
            avatar: cover,
            source: 'banana'
          });
        }
      });
    });

    return tracks;
  } catch (err) {
    return [];
  }
}

// --- 7. Radio Garden ---
function resolveRadioGardenStream(channelId) {
  return new Promise((resolve) => {
    const url = `https://radio.garden/api/ara/content/listen/${channelId}/channel.mp3`;
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://radio.garden/'
      },
      timeout: 3500
    }, (res) => {
      if (res.headers.location) {
        resolve(res.headers.location);
      } else if (res.statusCode === 200) {
        resolve(url);
      } else {
        resolve(null);
      }
      res.destroy();
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function searchRadioGarden(query, limit = 20) {
  return new Promise((resolve) => {
    const trimmed = (query || '').trim();
    const isGeneric = !trimmed || trimmed.length < 2 || ['all', 'garden', 'радио', 'radio'].includes(trimmed.toLowerCase());
    const searchUrl = isGeneric
      ? 'https://radio.garden/api/ara/content/search?q='
      : `https://radio.garden/api/search?q=${encodeURIComponent(trimmed)}`;

    const req = https.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://radio.garden/',
        'Accept': 'application/json'
      },
      timeout: 5000
    }, async (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', async () => {
        try {
          const json = JSON.parse(body);
          let rawChannels = [];

          if (isGeneric) {
            const content = json?.data?.content || [];
            content.forEach(sec => {
              if (sec.items && Array.isArray(sec.items)) {
                sec.items.forEach(it => {
                  if (it.page && it.page.type === 'channel') {
                    const m = (it.page.url || '').match(/\/listen\/[^\/]+\/([A-Za-z0-9_-]+)/);
                    if (m) {
                      rawChannels.push({ id: m[1], title: it.page.title, subtitle: it.page.subtitle || `${it.page.place?.title || ''}, ${it.page.country?.title || ''}` });
                    }
                  }
                });
              }
            });
          } else {
            const hits = json?.hits?.hits || [];
            hits.forEach(h => {
              const src = h._source;
              if (src && (src.type === 'channel' || src.page?.type === 'channel')) {
                const page = src.page || {};
                const m = (page.url || '').match(/\/listen\/[^\/]+\/([A-Za-z0-9_-]+)/);
                if (m) {
                  rawChannels.push({ id: m[1], title: page.title || src.title, subtitle: page.subtitle || (src.code ? `${page.place?.title || ''} [${src.code}]` : '') });
                }
              }
            });
          }

          const top = rawChannels.slice(0, limit);
          const resolved = await Promise.all(top.map(async (ch) => {
            const stream = await resolveRadioGardenStream(ch.id);
            if (!stream) return null;
            return {
              id: `garden-${ch.id}`,
              title: ch.title,
              author: ch.subtitle ? `${ch.subtitle} • Radio Garden` : 'Radio Garden',
              duration: 'Live',
              avatar: 'https://radio.garden/icons/favicon.png',
              streamUrl: stream,
              source: 'garden'
            };
          }));

          resolve(resolved.filter(Boolean));
        } catch (e) { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.on('timeout', () => { req.destroy(); resolve([]); });
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const sourceParam = searchParams.get('source') || 'all';
  const sourcesParam = searchParams.get('sources');

  if (!query || query.trim() === '') {
    return NextResponse.json([]);
  }
  const trimmed = query.trim();
  const pageNum = Math.max(1, page);

  let targetSources = [];
  if (sourcesParam) {
    targetSources = sourcesParam.split(',');
  } else if (sourceParam) {
    if (sourceParam === 'all') {
      targetSources = ['promodj', 'stations', 'zaycev', 'radio', 'banana', 'garden'];
    } else {
      targetSources = [sourceParam];
    }
  } else {
    targetSources = ['promodj', 'stations', 'zaycev', 'radio', 'banana', 'garden'];
  }

  const tasks = [];
  
  const promoStartPage = ((pageNum - 1) * 4) + 1;
  if (targetSources.includes('promodj')) {
    tasks.push(searchPromoDJ(trimmed, promoStartPage, 4));
  }
  
  if (pageNum === 1) {
    if (targetSources.includes('stations')) {
      tasks.push(Promise.resolve(searchTopStations(trimmed)));
    }
    if (targetSources.includes('zaycev')) {
      tasks.push(Promise.resolve(searchZaycev(trimmed)));
    }
    if (targetSources.includes('banana')) {
      tasks.push(Promise.resolve(searchBananaRadio(trimmed)));
    }
  }
  
  if (targetSources.includes('banana')) {
    tasks.push(searchBananaTracks(trimmed, pageNum, 12));
  }
  
  if (targetSources.includes('garden')) {
    tasks.push(searchRadioGarden(trimmed, 20));
  }
  
  if (targetSources.includes('radio')) {
    const radioOffset = (pageNum - 1) * 60;
    tasks.push(searchRadioBrowser(trimmed, 60, radioOffset));
  }

  const resultsNested = await Promise.all(tasks);
  const combined = [];
  const seenUrls = new Set();

  for (const list of resultsNested) {
    if (Array.isArray(list)) {
      for (const item of list) {
        if (item && item.streamUrl && !seenUrls.has(item.streamUrl)) {
          seenUrls.add(item.streamUrl);
          combined.push(item);
        }
      }
    }
  }

  return NextResponse.json(combined);
}
