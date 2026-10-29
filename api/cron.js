export default async function handler(req, res) {
    try {
        const now = new Date();
        
        // Exact IST Time Extraction for Node.js (Vercel)
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: 'numeric',
            minute: 'numeric',
            hour12: false
        });

        const parts = formatter.formatToParts(now);
        let h = 0, m = 0, day = '', month = '', year = '';
        
        parts.forEach(p => {
            if (p.type === 'hour') h = parseInt(p.value, 10);
            if (p.type === 'minute') m = parseInt(p.value, 10);
            if (p.type === 'day') day = p.value;
            if (p.type === 'month') month = p.value;
            if (p.type === 'year') year = p.value;
        });

        // Exact 15-min rounding
        m = Math.floor(m / 15) * 15;

        // Market Hours Check (09:00 AM to 10:00 PM IST)
        if (h < 9 || (h > 22 || (h === 22 && m > 0))) {
            return res.status(200).json({ status: "Market closed" });
        }

        const dateKey = `${day}_${month}_${year}`;
        const timeKey = `${dateKey}_${String(h).padStart(2, '0')}_${String(m).padStart(2, '0')}`;

        // Slot Date for Time Header
        let slotDate = new Date();
        slotDate.setHours(h, m, 0, 0);
        const timeString = slotDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        const firebaseBaseUrl = 'https://canvas2d-result-f4d7d-default-rtdb.firebaseio.com';
        const firebaseUri = `${firebaseBaseUrl}/resultsData/blocks/${timeKey}.json`;
        const settingsUrl = `${firebaseBaseUrl}/settings.json`;

        // Check if result already exists for this exact slot
        const checkRes = await fetch(firebaseUri);
        const checkData = await checkRes.json();

        if (checkData && checkData.html) {
            return res.status(200).json({ status: "Already generated", timeKey });
        }

        // Firebase se Fix & Block Settings fetch karna
        let sObj = {};
        try {
            const settingsRes = await fetch(settingsUrl);
            sObj = await settingsRes.json() || {};
        } catch (w) {}

        const getCfg = (k) => {
            let c = sObj[k] || {}, g = sObj['all'] || {};
            let fix = (c.fix !== undefined && c.fix !== "") ? String(c.fix).trim() : (g.fix ? String(g.fix).trim() : "");
            let b = (c.bExact ? String(c.bExact).split(/[\s,]+/) : []).concat(g.bExact ? String(g.bExact).split(/[\s,]+/) : []);
            return { fix, bExact: b.map(x => x.trim()).filter(x => x.length > 0) };
        };

        // Strong FNV-1a Hashing for Mixed Unpredictable Numbers
        const getSeededIndex = (seedString, maxLimit) => {
            let hash = 2166136261;
            for (let i = 0; i < seedString.length; i++) {
                hash ^= seedString.charCodeAt(i);
                hash = Math.imul(hash, 16777619);
            }
            return Math.abs(hash) % maxLimit;
        };

        const allSeriesBases = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
        let newBlock = `<div class="result-block" id="block-${timeKey}"><div class="time-header" data-time="${timeString}">${timeString}</div>`;

        allSeriesBases.forEach(baseVal => {
            let cfg = getCfg(String(baseVal)), fix = cfg.fix, blocks = cfg.bExact;
            newBlock += `<div class="chart-table series-${baseVal}"><div class="row-grid">`;
            
            for (let i = 0; i < 10; i++) {
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
                    
                    // Strong Random Mixed Seed Key for Cron
                    let seedKey = "CANVAS_RANDOM_SLOT_" + timeKey + "_series_" + baseVal + "_cell_" + i + "_mix_" + (Math.sin(i + 1) * 10000);
                    let chosenIndex = getSeededIndex(seedKey, valid.length);
                    val = prefix + valid[chosenIndex];
                }
                
                if (val.length < 4) val = val.padEnd(4, '0');
                let p1 = val.slice(0, 2), p2 = val.slice(2, 4);
                let sc = p2[0] === p2[1] ? "var(--accent-red)" : "#1a1a1a";
                newBlock += `<div class="cell"><span style="color:#1a1a1a;font-weight:800;">${p1}</span><span style="color:${sc};font-weight:800;">${p2}</span></div>`;
            }
            newBlock += `</div></div>`;
        });
        newBlock += `</div>`;

        // Save to Firebase Realtime Database
        const saveRes = await fetch(firebaseUri, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ html: newBlock, timestamp: now.getTime() })
        });

        if (saveRes.ok) {
            return res.status(200).json({ status: "Success", timeKey });
        } else {
            return res.status(500).json({ status: "Firebase save failed" });
        }

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
