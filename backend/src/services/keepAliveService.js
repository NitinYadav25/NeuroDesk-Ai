const cron = require('node-cron');
const axios = require('axios');

const initializeKeepAlive = () => {
  // Har 30 minute mein ping karta hai taaki Render backend alive rahe
  cron.schedule('*/30 * * * *', async () => {
    try {
      const url = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
      console.log(`⏱️  [KeepAlive] Pinging: ${url}/api/health at ${new Date().toISOString()}`);
      const response = await axios.get(`${url}/api/health`, { timeout: 10000 });
      console.log(`✅ [KeepAlive] Ping successful - Status: ${response.status}`);
    } catch (err) {
      console.error(`❌ [KeepAlive] Ping failed: ${err.message}`);
    }
  });
  console.log('⏰ [KeepAlive] Cron job initialized - pinging every 30 minutes');
};

module.exports = initializeKeepAlive;
