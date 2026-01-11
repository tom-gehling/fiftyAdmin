const admin = require('firebase-admin');
const path = require('path');
const maxmind = require('maxmind'); // <-- GeoLite2
const luxon = require('luxon');

const serviceAccount = require(path.join(__dirname, '../secrets/adminSDK.json'));

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (err) {
    console.error('❌ Failed to initialize Firebase Admin:', err);
    process.exit(1);
}

const db = admin.firestore();
const quizIds = ['184'];
const geoLitePath = path.join(__dirname, 'GeoLite/GeoLite2-City.mmdb');

// Helper function to format seconds into HH:MM:SS
function formatSecondsToHMS(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

async function getLocationData() {
    const geoLookup = await maxmind.open(geoLitePath);

    // Count and time accumulators
    const countryCounts = {};
    const countryTimes = {};
    const cityCounts = {};
    const cityTimes = {};

    for (const quizId of quizIds) {
        let snapshot;
        try {
            snapshot = await db.collection('quizResults').where('quizId', '==', quizId).where('status', '==', 'completed').get();
            console.log(`Found ${snapshot.size} results for quizId ${quizId}`);
        } catch (err) {
            console.error(`❌ Failed to fetch quizResults for quizId ${quizId}:`, err);
            continue;
        }

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const ip = data.ip;
            let geo = null;

            if (ip) geo = geoLookup.get(ip);

            const country = geo?.country?.names?.en || 'Unknown';
            const city = geo?.city?.names?.en || 'Unknown';
            const cityKey = `${city}, ${country}`;

            // Completion time in seconds
            let completedAt = data.completedAt && data.completedAt.toDate ? data.completedAt.toDate() : new Date(data.completedAt);
            let startedAt = data.startedAt && data.startedAt.toDate ? data.startedAt.toDate() : new Date(data.startedAt);
            let duration = (completedAt - startedAt) / 1000; // seconds
            if (duration < 0 || !startedAt || !completedAt) duration = 0;

            // Update country counts & times
            countryCounts[country] = (countryCounts[country] || 0) + 1;
            countryTimes[country] = (countryTimes[country] || 0) + duration;

            // Update city counts & times
            cityCounts[cityKey] = (cityCounts[cityKey] || 0) + 1;
            cityTimes[cityKey] = (cityTimes[cityKey] || 0) + duration;
        }
    }

    // Sort country counts alphabetically and format avg time
    const sortedCountries = Object.keys(countryCounts)
        .sort((a, b) => a.localeCompare(b))
        .reduce((obj, key) => {
            const avgSeconds = countryTimes[key] / countryCounts[key];
            obj[key] = {
                count: countryCounts[key],
                avgTime: formatSecondsToHMS(avgSeconds)
            };
            return obj;
        }, {});

    // Sort city counts alphabetically by country, then city and format avg time
    const sortedCities = Object.keys(cityCounts)
        .sort((a, b) => {
            const [cityA, countryA] = a.split(', ').map((s) => s.toLowerCase());
            const [cityB, countryB] = b.split(', ').map((s) => s.toLowerCase());

            if (countryA === countryB) return cityA.localeCompare(cityB);
            return countryA.localeCompare(countryB);
        })
        .reduce((obj, key) => {
            const avgSeconds = cityTimes[key] / cityCounts[key];
            obj[key] = {
                count: cityCounts[key],
                avgTime: formatSecondsToHMS(avgSeconds)
            };
            return obj;
        }, {});

    console.log('\n--- Country Counts + Avg Completion Time (HH:MM:SS) ---');
    console.log(sortedCountries);

    console.log('\n--- City Counts + Avg Completion Time (HH:MM:SS) ---');
    console.log(sortedCities);
}

getLocationData()
    .then(() => {
        console.log('All done!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ Unexpected error:', err);
        process.exit(1);
    });
