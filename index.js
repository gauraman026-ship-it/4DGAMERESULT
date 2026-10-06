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
  const firebaseDatabaseURL = "https://canvas3d-result-f057d-default-rtdb.firebaseio.com/";
  let now = new Date();
  let timeZone = 'Asia/Kolkata';

  // Convert UTC date to IST time correctly
  let istDate = new Date(now.toLocaleString('en-US', { timeZone }));
  let hours = istDate.getHours();
  let minutes = istDate.getMinutes();

  let totalMinutes = hours * 60 + minutes;
  let slotMinutes = Math.floor(totalMinutes / 15) * 15;
  let h = Math.floor(slotMinutes / 60);
  let m = slotMinutes % 60;

  let timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone });
  let dataKey = String(h).padStart(2, '0') + String(m).padStart(2, '0');
  let tiretKey = String(h).padStart(2, '0') + String(m).padStart(2, '0');

  // Safe Fetch for settings to prevent crashes if node is missing
  let settings = null;
  try {
    let settingsRes = await fetch(`${firebaseDatabaseURL}/settings.json`);
    settings = await settingsRes.json();
  } catch (e) {}

  let html = '<div class="time-header" data-time="${timeString}"><span>${timeString}</span></div><div class="row-g">';

  let allSeriesBases = [0, 20, 30, 40, 50, 60, 70, 80, 90];
  allSeriesBases.forEach(base => {
    let fix = String(base);
    let matchedTix = null;
    let val = Math.floor(Math.random() * 90) + 10;
    html += `<div class="cell">${val}</div>`;
  });

  html += '</div>';

  // Save generated result data
  await fetch(`${firebaseDatabaseURL}/resultsData/${dataKey}.json`, {
    method: 'PUT',
    body: JSON.stringify({ html: html })
  });

  // Save last generated pointer
  await fetch(`${firebaseDatabaseURL}/lastGenerated.json`, {
    method: 'PUT',
    body: JSON.stringify({ time: timeString, dataKey: dataKey })
  });
}
