export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(generateAndSaveResult());
  },
  async fetch(request, env, ctx) {
    await generateAndSaveResult();
    return new Response("Result generated and saved successfully.", { status: 200 });
  }
};

async function generateAndSaveResult() {
  const firebaseDatabaseURL = "https://canvas2d-result-f4d7d-default-rtdb.firebaseio.com";
  let now = new Date();
  let timeZone = 'Asia/Kolkata';
  
  let hours = now.getHours();
  let minutes = now.getMinutes();
  let totalMinutes = hours * 60 + minutes;
  let slotMinutes = Math.floor(totalMinutes / 15) * 15;
  let h = Math.floor(slotMinutes / 60);
  let m = slotMinutes % 60;
  
  let timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone });
  let dataKey = String(h).padStart(2, '0') + String(m).padStart(2, '0');
  let timeKey = String(h).padStart(2, '0');

  let settingsRes = await fetch(`${firebaseDatabaseURL}/settings.json`);
  let settings = await settingsRes.json();
  
  let nowBlock = `<div class="time-header" data-time="${timeString}"><span>${timeString}</span></div><div class="row-grid">`;
  
  let allSeriesBases = [10, 20, 30, 40, 50, 60, 70, 80, 90];
  allSeriesBases.forEach(base => {
    let fix = String(base);
    let matchedTix = fix; 
    let val = Math.floor(Math.random() * 90 + 10);
    nowBlock += `<div class="cell">${val}</div>`;
  });
  
  nowBlock += `</div>`;

  await fetch(`${firebaseDatabaseURL}/resultsData/${dataKey}.json`, {
    method: 'PUT',
    body: JSON.stringify({ html: nowBlock })
  });

  await fetch(`${firebaseDatabaseURL}/lastGenerated.json`, {
    method: 'PUT',
    body: JSON.stringify({ time: timeString, dataKey: dataKey })
  });
}
