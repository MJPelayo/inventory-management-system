// backend/src/server.js
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api/health`);
    console.log(`📊 Reports: http://localhost:${PORT}/api/reports/sales`);
    console.log(`📁 Exports: http://localhost:${PORT}/api/export/users`);
});