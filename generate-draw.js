const admin = require("firebase-admin");

// Firebase initialize karein environment variable use karke
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();

async function run() {
    try {
        const settingsSnap = await db.ref('settings').once('value');
        const sObj = settingsSnap.val() || {};
        
        const getCfg = (k) => {
            let c = sObj[k] || {}, g = sObj['all'] || {};
            let fix = (c.fix !== undefined && c.fix !== "") ? String(c.fix).trim() : (g.fix ? String(g.fix).trim() : "");
            let b = (c.bExact ? String(c.bExact).split(/[\s,]+/) : []).concat(g.bExact ? String(g.bExact).split(/[\s,]+/) : []);
            return { fix, bExact: b.map(x => x.trim()).filter(x => x.length > 0) };
        };

        let now = new Date();
        // IST Timezone adjustment (+5:30)
        let istTime = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60000);
        
        let h = istTime.getHours();
        let m = Math.floor(istTime.getMinutes() / 15) * 15;
        
        // Sirf 9 AM se 10 PM ke beech chalane ke liye
        if (h < 9 || h > 22 || (h === 22 && m > 0)) {
            console.log("Outside operating hours.");
            process.exit(0);
        }

        istTime.setHours(h, m, 0, 0);
        let timeString = istTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        
        let dateKey = istTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '_');
        let timeKey = `${dateKey}_${String(istTime.getHours()).padStart(2, '0')}_${String(istTime.getMinutes()).padStart(2, '0')}`;

        let blockRef = db.ref('resultsData/blocks/' + timeKey);
        let existingSnap = await blockRef.once('value');
        
        if (existingSnap.exists()) {
            console.log("Draw already exists for this slot:", timeKey);
            process.exit(0);
        }

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

        await blockRef.set({ html: newBlock, timestamp: istTime.getTime() });
        console.log("Successfully generated draw for:", timeKey);
        process.exit(0);
    } catch (err) {
        console.error("Error generating draw:", err);
        process.exit(1);
    }
}

run();
