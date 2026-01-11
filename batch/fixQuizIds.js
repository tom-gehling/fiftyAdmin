const admin = require('firebase-admin');
const path = require('path');

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

async function convertQuizIdsToNumbers() {
    const quizzesRef = db.collection('quizzes');

    try {
        const snapshot = await quizzesRef.get();

        const updates = [];

        snapshot.forEach((doc) => {
            const data = doc.data();

            // Check if quizId exists and is a string
            if (data.quizId && typeof data.quizId === 'string') {
                const numericId = Number(data.quizId);

                if (!isNaN(numericId)) {
                    console.log(`Updating quiz ${doc.id}: "${data.quizId}" → ${numericId}`);

                    updates.push(doc.ref.update({ quizId: numericId }));
                } else {
                    console.warn(`Skipping quiz ${doc.id}: quizId "${data.quizId}" is not numeric`);
                }
            }
        });

        await Promise.all(updates);

        console.log(`✅ Updated ${updates.length} quizzes`);
    } catch (err) {
        console.error('Error updating quizzes:', err);
    }
}

// Run the function
convertQuizIdsToNumbers();
