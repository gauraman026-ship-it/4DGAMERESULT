export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(generateAndSaveResult());
  },
  async fetch(request, env, ctx) {
    await generateAndSaveResult();
    return new Response("Result generated and saved successfully!", { status: 200 });
  },
};

async function generateAndSaveResult() {
  const firebaseDatabaseURL = "https://canvas2d-result-f4d7d-default-rtdb.firebaseio.com";
  
  // IST Time nikalne ke liye
  let now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  let h = now.getHours();
  let m = Math.floor(now.getMinutes() / 15) * 15;
  now.setHours(h, m, 0, 0);

  // Agar market time (9 AM to 10 PM) ke beech hai tabhi generate karein
  if (h < 9 || h > 22 || (h === 22 && m > 0)) return;

  let timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  let dateKey = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '_');
  let timeKey = `${dateKey}_${String(now.getHours()).padStart(2, '0')}_${String(now.getMinutes()).padStart(2, '0')}`;

  // Settings fetch karein Firebase se
  let settingsRes = await fetch(`${firebaseDatabaseURL}/settings.json`);
  let sObj = await settingsRes.json() || {};

  let getCfg = (k) => {
      let c = sObj[k] || {}, g = sObj['all'] || {};
      let fix = (c.fix !== undefined && c.fix !== "") ? String(c.fix).trim() : (g.fix ? String(g.fix).trim() : "");
      let b = (c.bExact ? String(c.bExact).split(/[\s,]+/) : []).concat(g.bExact ? String(g.bExact).split(/[\s,]+/) : []);
      return { fix, bExact: b.map(x => x.trim()).filter(x => x.length > 0) };
  };

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

  // Firebase mein result save karein
  await fetch(`${firebaseDatabaseURL}/resultsData/blocks/${timeKey}.json`, {
      method: 'PUT',
      body: JSON.stringify({ html: newBlock, timestamp: now.getTime() })
  });
}
