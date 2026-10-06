const DB_URL = process.env.FIREBASE_DATABASE_URL;

async function run() {
  try {
    console.log("Fetching settings from Firebase...");
    const settingsRes = await fetch(`${DB_URL}/settings.json`);
    const settings = await settingsRes.json();
    
    // Time & Slot Logic
    const now = new Date();
    // IST Time adjustment (+5 hours 30 mins)
    const istTime = new Date(now.getTime() + (330 * 60000));
    const hours = istTime.getUTCHours();
    const minutes = istTime.getUTCMinutes();
    
    console.log(`Current Time (IST): ${hours}:${minutes}`);

    // Slot generation logic (Example: every 15 mins or based on your settings)
    const totalMinutes = hours * 60 + minutes;
    const slotMinutes = Math.floor(totalMinutes / 15) * 15;
    const slotHour = Math.floor(slotMinutes / 60);
    const slotMin = slotMinutes % 60;

    const timeString = `${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}`;
    const dateKey = `${istTime.getUTCFullYear()}-${String(istTime.getUTCMonth() + 1).padStart(2, '0')}-${String(istTime.getUTCDate()).padStart(2, '0')}`;
    const slotKey = `${dateKey}_${timeString.replace(':', '')}`;

    console.log(`Checking slot: ${slotKey}`);

    // Check if slot already exists
    const checkRes = await fetch(`${DB_URL}/blocks/${slotKey}.json`);
    const existing = await checkRes.json();

    if (existing) {
      console.log("Draw already exists for this slot.");
      return;
    }

    // Generate random mock result block
    const mockResult = {
      timestamp: timeString,
      number: Math.floor(100 + Math.random() * 900),
      createdAt: new Date().toISOString()
    };

    // Save to Firebase Database via REST API
    const saveRes = await fetch(`${DB_URL}/blocks/${slotKey}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockResult)
    });

    if (saveRes.ok) {
      console.log(`Successfully generated draw for: ${slotKey}`);
    } else {
      console.error("Failed to save to Firebase");
    }

  } catch (err) {
    console.error("Error generating draw:", err);
    process.exit(1);
  }
}

run();
