const admin = require('firebase-admin');
const path = require('path');
const maxmind = require('maxmind');
const xlsx = require('xlsx');
const fs = require('fs');

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
const quizIds = ['185'];
const geoLitePath = path.join(__dirname, 'GeoLite/GeoLite2-City.mmdb');

function formatSecondsToHMS(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getTopAndBottomByScore(data, n = 5) {
    const arr = Object.entries(data).map(([key, value]) => ({
        key,
        ...value,
        avgScore: parseFloat(value.avgScore)
    }));
    const top = [...arr].sort((a, b) => b.avgScore - a.avgScore).slice(0, n);
    const bottom = [...arr].sort((a, b) => a.avgScore - b.avgScore).slice(0, n);
    return { top, bottom };
}

async function getLocationData() {
    const geoLookup = await maxmind.open(geoLitePath);

    const countryCounts = {},
        countryTimes = {},
        countryScores = {};
    const cityCounts = {},
        cityTimes = {},
        cityScores = {};

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
            const geo = ip ? geoLookup.get(ip) : null;

            const country = geo?.country?.names?.en || 'Unknown';
            const city = geo?.city?.names?.en || 'Unknown';
            const cityKey = `${city}, ${country}`;

            const completedAt = data.completedAt?.toDate ? data.completedAt.toDate() : new Date(data.completedAt);
            const startedAt = data.startedAt?.toDate ? data.startedAt.toDate() : new Date(data.startedAt);
            let duration = (completedAt - startedAt) / 1000;
            if (duration < 0 || !startedAt || !completedAt) duration = 0;

            const score = data.score || 0;

            countryCounts[country] = (countryCounts[country] || 0) + 1;
            countryTimes[country] = (countryTimes[country] || 0) + duration;
            countryScores[country] = (countryScores[country] || 0) + score;

            cityCounts[cityKey] = (cityCounts[cityKey] || 0) + 1;
            cityTimes[cityKey] = (cityTimes[cityKey] || 0) + duration;
            cityScores[cityKey] = (cityScores[cityKey] || 0) + score;
        }
    }

    const sortedCountries = Object.keys(countryCounts)
        .sort()
        .reduce((obj, key) => {
            obj[key] = {
                count: countryCounts[key],
                avgTime: formatSecondsToHMS(countryTimes[key] / countryCounts[key]),
                avgScore: (countryScores[key] / countryCounts[key]).toFixed(2)
            };
            return obj;
        }, {});

    const sortedCities = Object.keys(cityCounts)
        .sort()
        .reduce((obj, key) => {
            obj[key] = {
                count: cityCounts[key],
                avgTime: formatSecondsToHMS(cityTimes[key] / cityCounts[key]),
                avgScore: (cityScores[key] / cityCounts[key]).toFixed(2)
            };
            return obj;
        }, {});

    const countryScoreExtremes = getTopAndBottomByScore(sortedCountries, 5);
    const cityScoreExtremes = getTopAndBottomByScore(sortedCities, 5);

    // --- Create Excel with xlsx ---
    const workbook = xlsx.utils.book_new();

    function addSheet(sheetName, data) {
        let wsData;
        if (Array.isArray(data)) {
            // For top/bottom arrays
            wsData = data.map((d) => ({ Key: d.key, Count: d.count, AvgTime: d.avgTime, AvgScore: d.avgScore }));
        } else {
            // For objects
            wsData = Object.entries(data).map(([key, value]) => ({
                Key: key,
                Count: value.count,
                AvgTime: value.avgTime,
                AvgScore: value.avgScore
            }));
        }
        const ws = xlsx.utils.json_to_sheet(wsData);
        xlsx.utils.book_append_sheet(workbook, ws, sheetName);
    }

    addSheet('Countries', sortedCountries);
    addSheet('Cities', sortedCities);
    addSheet('Countries Top_Bottom', [...countryScoreExtremes.top, ...countryScoreExtremes.bottom]);
    addSheet('Cities Top_Bottom', [...cityScoreExtremes.top, ...cityScoreExtremes.bottom]);

    const filename = `Quiz ${quizIds[0]} Location Stats.xlsx`;
    xlsx.writeFile(workbook, filename);
    console.log(`✅ Excel file created: ${filename}`);
}

getLocationData()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('❌ Unexpected error:', err);
        process.exit(1);
    });
