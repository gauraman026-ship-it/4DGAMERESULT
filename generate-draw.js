import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyCNLfjZ0hctznOLuyD6EIg-Z_ef-KO8i3Q",
    databaseURL: "https://canvas2d-result-f4d7d-default-rtdb.firebaseio.com",
    projectId: "canvas2d-result"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const allSeriesBases = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];

async function generateAndSaveScheduledDraw() {
    try {
        // 1. Fetch settings from Firebase (Fix numbers & Blocked numbers)
        const settingsSnap = await get(ref(db, 'settings'));
        let sObj = settingsSnap.exists() ? settingsSnap.val() : {};

        let getCfg = (k) => {
            let c = sObj[k] || {}, g = sObj['all'] || {};
            let fix = (c.fix !== undefined && c.fix !== "") ? String(c.fix).trim() : (g.fix ? String(g.fix).trim() : "");
            let b = (c.bExact ? String(c.bExact).split(/[\s,]+/) : []).concat(g.bExact ? String(g.bExact).split(/[\s,]+/) : []);
            return { fix, bExact: b.map(x => x.trim()).filter(x => x.length > 0) };
        };

        // 2. Get current IST time details
        let now = new Date(Date.now() + (5.5 * 60 * 60 * 1000)); // UTC to IST offset approx for server
        // Better yet, use Intl to get exact IST hours/minutes
        let optionsIST = { timeZone: 'Asia/Kolkata', hour12: false, hour: 'numeric', minute: 'numeric', day: '2-digit', month: 'short', year: 'numeric' };
        
        let formatter = new Intl.DateTimeFormat('en-US', optionsIST);
        let parts = formatter.formatToParts(new Date());
        let partMap = {};
        parts.forEach(p => partMap[p.type] = p.value);

        let h = parseInt(partMap.hour, 10);
        let m = Math.floor(parseInt(partMap.minute, 10) / 15) * 15;
        
        let targetDate = new Date();
        targetDate.setHours(h, m, 0, 0);

        let timeString = targetDate.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
        let dateKey = targetDate.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '_');
        let timeKey = `${dateKey}_${String(targetDate.getHours()).padStart(2, '0')}_${String(targetDate.getMinutes()).padStart(2, '0')}`;

        let blockRef = ref(db, 'resultsData/blocks/' + timeKey);
        let existingSnap = await get(blockRef);
        if (existingSnap.exists()) {
            console.log("Draw already exists for this slot:", timeKey);
            return;
        }

        // 3. Build the HTML block using your exact game logic
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

        // 4. Save to Firebase
        await set(blockRef, { 
            html: newBlock, 
            timestamp: Date.now() 
        });

        console.log("Successfully generated and saved 4-digit draw block for:", timeKey);
    } catch (error) {
        console.error("Error generating draw:", error);
        process.exit(1);
    }
}

generateAndSaveScheduledDraw();
