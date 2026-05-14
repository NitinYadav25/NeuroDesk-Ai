const cron = require('node-cron');
const axios = require('axios');

const initializeKeepAlive = () => {
  // Har 14 minute mein chalega (Render 15 min mein sleep karta hai)
  cron.schedule('*/14 * * * *', async () => {
    try {
      const url = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
      console.log(`⏱️  Keep-alive pinging: ${url}/api/health`);
      await axios.get(`${url}/api/health`);
      console.log('✅ Ping successful');
    } catch (err) {
      console.error('❌ Keep-alive ping failed:', err.message);
    }
  });
};

module.exports = initializeKeepAlive;
