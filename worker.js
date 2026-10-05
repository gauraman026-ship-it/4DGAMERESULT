export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(generateAndSaveResult());
  },
  async fetch(request, env, ctx) {
    await generateAndSaveResult();
    return new Response("CΛNVΛS4D™ Automated Worker Active", { 
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
};

async function generateAndSaveResult() {
  const dbSettingsUrl = "https://canvas2d-result-default-rtdb.firebaseio.com/settings.json";
  const settingsRes = await fetch(dbSettingsUrl);
  const sObj = settingsRes.ok ? await settingsRes.json() || {} : {};

  const getCfg = (k) => {
    let c = sObj[k] || {}, g = sObj['all'] || {};
    let fix = (c.fix !== undefined && c.fix !== "") ? String(c.fix).trim() : (g.fix ? String(g.fix).trim() : "");
    let b = (c.bExact ? String(c.bExact).split(/[\s,]+/) : []).concat(g.bExact ? String(g.bExact).split(/[\s,]+/) : []);
    return { fix, bExact: b.map(x => x.trim()).filter(x => x.length > 0) };
  };

  const now = new Date(Date.now() + (5.5 * 60 * 60 * 1000)); // IST Offset
  const h = now.getUTCHours();
  const m = Math.floor(now.getUTCMinutes() / 15) * 15;
  
  if (h < 9 || h > 22 || (h === 22 && m > 0)) return;

  now.setUTCHours(h, m, 0, 0);
  const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' });
  
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const formattedDateKey = `${String(now.getUTCDate()).padStart(2, '0')}_${months[now.getUTCMonth()]}_${now.getUTCFullYear()}`;
  const timeKey = `${formattedDateKey}_${String(h).padStart(2, '0')}_${String(m).padStart(2, '0')}`;

  const allSeriesBases = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
  let newBlock = `<div class="result-block" id="block-${timeKey}"><div class="time-header" data-time="${timeString}">${timeString}</div>`;

  allSeriesBases.forEach(baseVal => {
    let cfg = getCfg(String(baseVal)), fix = cfg.fix, blocks = cfg.bExact;
    newBlock += `<div class="chart-table series-${baseVal}"><div class="row-grid">`;
    for(let i=0; i<10; i++) {
      let prefix = String(baseVal + i).padStart(2, '0'), val;
      let matchedFix = fix ? fix.split(/[\s,]+/).find(t => t.length >= 4 ? t.startsWith(prefix) : t === prefix) : null;
      if (matchedFix) {
        val = matchedFix.length >= 4 ? matchedFix : matchedFix + "20";
      } else {
        let valid = [];
        for (let s = 0; s < 100; s++) {
          let suf = String(s).padStart(2, '0'), full = prefix + suf;
          if (!blocks.some(b => {
            let clean = b.replace(/[^0-9]/g, '');
            return clean.length >= 4 ? full === clean : suf === clean || full.slice(-2) === clean;
          })) valid.push(suf);
        }
        if (valid.length === 0) valid = ["20", "55", "77"];
        val = prefix + valid[Math.floor(Math.random() * valid.length)];
      }
      if (val.length < 4) val = val.padEnd(4, '0');
      let p1 = val.slice(0, 2), p2 = val.slice(2, 4);
      let sc = p2[0] === p2[1] ? "var(--accent-red)" : "#1a1a1a";
      newBlock += `<div class="cell"><span style="color:#1a1a1a;font-weight:800;">${p1}</span><span style="color:${sc};font-weight:800;">${p2}</span></div>`;
    }
    newBlock += `</div></div>`;
  });
  newBlock += `</div>`;

  const dbSaveUrl = `https://canvas2d-result-default-rtdb.firebaseio.com/resultsData/blocks/${timeKey}.json`;
  await fetch(dbSaveUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html: newBlock, timestamp: Date.now() })
  });
}
