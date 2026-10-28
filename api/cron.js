export default async function handler(req, res) {
    try {
        const now = new Date();
        const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        
        let h = istTime.getHours();
        let m = Math.floor(istTime.getMinutes() / 15) * 15;
        
        if (h < 9 || h > 22 || (h === 22 && m > 0)) {
            return res.status(200).json({ status: "Market closed" });
        }

        const dateKey = istTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '_');
        const timeKey = `${dateKey}_${String(h).padStart(2, '0')}_${String(m).padStart(2, '0')}`;
        const timeString = istTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        
        const firebaseUrl = `https://canvas2d-result-f4d7d-default-rtdb.firebaseio.com/resultsData/blocks/${timeKey}.json`;
        
        const checkRes = await fetch(firebaseUrl);
        const checkData = await checkRes.json();
        
        if (checkData !== null) {
            return res.status(200).json({ status: "Already generated", timeKey });
        }

        const allSeriesBases = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
        let newBlock = `<div class="result-block" id="block-${timeKey}"><div class="time-header" data-time="${timeString}">${timeString}</div>`;
        
        allSeriesBases.forEach(baseVal => {
            newBlock += `<div class="chart-table series-${baseVal}"><div class="row-grid">`;
            for(let i=0; i<10; i++) {
                let prefix = String(baseVal + i).padStart(2, '0');
                let valid = [];
                for (let s = 0; s < 100; s++) {
                    valid.push(String(s).padStart(2, '0'));
                }
                let chosenIndex = Math.floor(Math.random() * valid.length);
                let val = prefix + valid[chosenIndex];
                let p1 = val.slice(0, 2), p2 = val.slice(2, 4);
                let sc = p2[0] === p2[1] ? "var(--accent-red)" : "#1a1a1a";
                newBlock += `<div class="cell"><span style="color:#1a1a1a;font-weight:800;">${p1}</span><span style="color:${sc};font-weight:800;">${p2}</span></div>`;
            }
            newBlock += `</div></div>`;
        });
        newBlock += `</div>`;

        await fetch(firebaseUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ html: newBlock, timestamp: istTime.getTime() })
        });

        return res.status(200).json({ success: true, message: "Result generated successfully!", timeKey });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
