'use strict';
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator['throw'](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
var __generator =
    (this && this.__generator) ||
    function (thisArg, body) {
        var _ = {
                label: 0,
                sent: function () {
                    if (t[0] & 1) throw t[1];
                    return t[1];
                },
                trys: [],
                ops: []
            },
            f,
            y,
            t,
            g = Object.create((typeof Iterator === 'function' ? Iterator : Object).prototype);
        return (
            (g.next = verb(0)),
            (g['throw'] = verb(1)),
            (g['return'] = verb(2)),
            typeof Symbol === 'function' &&
                (g[Symbol.iterator] = function () {
                    return this;
                }),
            g
        );
        function verb(n) {
            return function (v) {
                return step([n, v]);
            };
        }
        function step(op) {
            if (f) throw new TypeError('Generator is already executing.');
            while ((g && ((g = 0), op[0] && (_ = 0)), _))
                try {
                    if (((f = 1), y && (t = op[0] & 2 ? y['return'] : op[0] ? y['throw'] || ((t = y['return']) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)) return t;
                    if (((y = 0), t)) op = [op[0] & 2, t.value];
                    switch (op[0]) {
                        case 0:
                        case 1:
                            t = op;
                            break;
                        case 4:
                            _.label++;
                            return { value: op[1], done: false };
                        case 5:
                            _.label++;
                            y = op[1];
                            op = [0];
                            continue;
                        case 7:
                            op = _.ops.pop();
                            _.trys.pop();
                            continue;
                        default:
                            if (!((t = _.trys), (t = t.length > 0 && t[t.length - 1])) && (op[0] === 6 || op[0] === 2)) {
                                _ = 0;
                                continue;
                            }
                            if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                                _.label = op[1];
                                break;
                            }
                            if (op[0] === 6 && _.label < t[1]) {
                                _.label = t[1];
                                t = op;
                                break;
                            }
                            if (t && _.label < t[2]) {
                                _.label = t[2];
                                _.ops.push(op);
                                break;
                            }
                            if (t[2]) _.ops.pop();
                            _.trys.pop();
                            continue;
                    }
                    op = body.call(thisArg, _);
                } catch (e) {
                    op = [6, e];
                    y = 0;
                } finally {
                    f = t = 0;
                }
            if (op[0] & 5) throw op[1];
            return { value: op[0] ? op[1] : void 0, done: true };
        }
    };
var __spreadArray =
    (this && this.__spreadArray) ||
    function (to, from, pack) {
        if (pack || arguments.length === 2)
            for (var i = 0, l = from.length, ar; i < l; i++) {
                if (ar || !(i in from)) {
                    if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                    ar[i] = from[i];
                }
            }
        return to.concat(ar || Array.prototype.slice.call(from));
    };
Object.defineProperty(exports, '__esModule', { value: true });
var admin = require('firebase-admin');
var path = require('path');
var luxon = require('luxon');
var serviceAccount = require(path.join(__dirname, '../secrets/adminSDK.json'));
var serviceAccount = require(path.join(__dirname, '../secrets/adminSDK.json'));
try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (err) {
    console.error('❌ Failed to initialize Firebase Admin:', err);
    process.exit(1);
}
var db = admin.firestore();
function buildQuizAggregates() {
    return __awaiter(this, void 0, void 0, function () {
        var snapshot,
            err_1,
            aggregates,
            _i,
            _a,
            doc,
            data,
            quizId,
            agg,
            startedAt,
            completedAt,
            startedAdelaide,
            hourKey,
            locKey,
            answers,
            score,
            isShort,
            duration,
            _b,
            answers_1,
            ans,
            qid,
            sortedAnswers,
            i,
            prev,
            curr,
            diffSec,
            duration,
            _c,
            _d,
            agg,
            perQuestion,
            _e,
            _f,
            entry,
            batch,
            _g,
            _h,
            _j,
            quizId,
            agg,
            averageScore,
            averageTime,
            questionAccuracy,
            hardestQuestions,
            easiestQuestions,
            docRef,
            err_2;
        var _k, _l, _m, _o, _p, _q, _r;
        return __generator(this, function (_s) {
            switch (_s.label) {
                case 0:
                    _s.trys.push([0, 2, , 3]);
                    console.log('Loading quizResults for quizId 180...');
                    return [4 /*yield*/, db.collection('quizResults').where('quizId', '==', '180').get()];
                case 1:
                    snapshot = _s.sent();
                    console.log('Found '.concat(snapshot.size, ' results'));
                    return [3 /*break*/, 3];
                case 2:
                    err_1 = _s.sent();
                    console.error('❌ Failed to fetch quizResults:', err_1);
                    return [2 /*return*/];
                case 3:
                    aggregates = {};
                    for (_i = 0, _a = snapshot.docs; _i < _a.length; _i++) {
                        doc = _a[_i];
                        try {
                            data = doc.data();
                            quizId = data['quizId'];
                            if (quizId !== '180') continue;
                            if (!aggregates[quizId]) {
                                aggregates[quizId] = {
                                    completedCount: 0,
                                    inProgressCount: 0,
                                    abandonedCount: 0,
                                    totalScore: 0,
                                    totalTime: 0,
                                    hourlyCounts: {},
                                    locationCounts: {},
                                    questionStats: {},
                                    sequentialQuestionTimes: [],
                                    maxScore: Number.NEGATIVE_INFINITY,
                                    minScore: Number.POSITIVE_INFINITY,
                                    validStatsCount: 0
                                };
                            }
                            agg = aggregates[quizId];
                            ((startedAt = void 0), (completedAt = void 0));
                            try {
                                startedAt = (_m = (_l = (_k = data['startedAt']) === null || _k === void 0 ? void 0 : _k.toDate) === null || _l === void 0 ? void 0 : _l.call(_k)) !== null && _m !== void 0 ? _m : new Date(data['startedAt']);
                                completedAt =
                                    (_q = (_p = (_o = data['completedAt']) === null || _o === void 0 ? void 0 : _o.toDate) === null || _p === void 0 ? void 0 : _p.call(_o)) !== null && _q !== void 0
                                        ? _q
                                        : data['completedAt']
                                          ? new Date(data['completedAt'])
                                          : null;
                            } catch (err) {
                                console.error('\u274C Failed to parse timestamps for quizId '.concat(quizId, ':'), err);
                                continue;
                            }
                            // Hourly counts (Adelaide time)
                            if (startedAt) {
                                startedAdelaide = luxon.DateTime.fromJSDate(startedAt).setZone('Australia/Adelaide');
                                hourKey = startedAdelaide.toFormat('yyyy-MM-dd HH');
                                agg.hourlyCounts[hourKey] = (agg.hourlyCounts[hourKey] || 0) + 1;
                            }
                            locKey = 'Unknown - Unknown';
                            agg.locationCounts[locKey] = (agg.locationCounts[locKey] || 0) + 1;
                            // Status-based logic
                            if (completedAt) {
                                answers = data['answers'] || [];
                                score = (_r = data['score']) !== null && _r !== void 0 ? _r : 0;
                                isShort = answers.length < 5;
                                agg.completedCount++;
                                agg.totalScore += score;
                                duration = (completedAt.getTime() - startedAt.getTime()) / 1000;
                                if (duration > 3 * 60 * 60) duration = 3 * 60 * 60; // cap at 3 hours
                                agg.totalTime += duration;
                                // Record question correctness (all)
                                for (_b = 0, answers_1 = answers; _b < answers_1.length; _b++) {
                                    ans = answers_1[_b];
                                    qid = String(ans['questionId']);
                                    if (!agg.questionStats[qid]) agg.questionStats[qid] = { correct: 0, total: 0 };
                                    agg.questionStats[qid].total++;
                                    if (ans['correct']) agg.questionStats[qid].correct++;
                                }
                                // Derived stats only if valid (>=5 answers)
                                if (!isShort) {
                                    agg.validStatsCount++;
                                    // Max / Min scores
                                    if (score > agg.maxScore) agg.maxScore = score;
                                    if (score < agg.minScore) agg.minScore = score;
                                    sortedAnswers = __spreadArray([], answers, true)
                                        .filter(function (a) {
                                            return a.timestamp;
                                        })
                                        .sort(function (a, b) {
                                            return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
                                        });
                                    for (i = 1; i < sortedAnswers.length; i++) {
                                        prev = new Date(sortedAnswers[i - 1].timestamp).getTime();
                                        curr = new Date(sortedAnswers[i].timestamp).getTime();
                                        diffSec = (curr - prev) / 1000;
                                        if (diffSec > 0 && diffSec <= 10 * 60) {
                                            agg.sequentialQuestionTimes.push({
                                                questionId: sortedAnswers[i - 1].questionId,
                                                diffSec: diffSec
                                            });
                                        }
                                    }
                                }
                            } else if (data['status'] === 'in_progress') {
                                duration = (new Date().getTime() - startedAt.getTime()) / 1000;
                                if (duration > 3 * 60 * 60) agg.abandonedCount++;
                                else agg.inProgressCount++;
                            } else {
                                agg.abandonedCount++;
                            }
                        } catch (err) {
                            console.error('❌ Failed to process document:', err);
                        }
                    }
                    // Compute derived aggregates
                    for (_c = 0, _d = Object.values(aggregates); _c < _d.length; _c++) {
                        agg = _d[_c];
                        // ✅ Overall average time between questions
                        agg.avgTimeBetweenQuestions =
                            agg.sequentialQuestionTimes.length > 0
                                ? agg.sequentialQuestionTimes.reduce(function (a, b) {
                                      return a + b.diffSec;
                                  }, 0) / agg.sequentialQuestionTimes.length
                                : 0;
                        perQuestion = {};
                        for (_e = 0, _f = agg.sequentialQuestionTimes; _e < _f.length; _e++) {
                            entry = _f[_e];
                            if (!perQuestion[entry.questionId]) perQuestion[entry.questionId] = { total: 0, count: 0 };
                            perQuestion[entry.questionId].total += entry.diffSec;
                            perQuestion[entry.questionId].count++;
                        }
                        agg.avgTimeBetweenByQuestion = Object.entries(perQuestion).map(function (_a) {
                            var questionId = _a[0],
                                _b = _a[1],
                                total = _b.total,
                                count = _b.count;
                            return {
                                questionId: questionId,
                                avgDiffSec: total / count
                            };
                        });
                        if (agg.maxScore === Number.NEGATIVE_INFINITY) agg.maxScore = 0;
                        if (agg.minScore === Number.POSITIVE_INFINITY) agg.minScore = 0;
                    }
                    _s.label = 4;
                case 4:
                    _s.trys.push([4, 6, , 7]);
                    batch = db.batch();
                    for (_g = 0, _h = Object.entries(aggregates); _g < _h.length; _g++) {
                        ((_j = _h[_g]), (quizId = _j[0]), (agg = _j[1]));
                        console.log('Sequential:', agg.sequentialQuestionTimes);
                        console.log('Per-question avg:', agg.avgTimeBetweenByQuestion);
                        averageScore = agg.validStatsCount > 0 ? agg.totalScore / agg.validStatsCount : 0;
                        averageTime = agg.validStatsCount > 0 ? agg.totalTime / agg.validStatsCount : 0;
                        questionAccuracy = Object.entries(agg.questionStats).map(function (_a) {
                            var qid = _a[0],
                                stat = _a[1];
                            return {
                                questionId: qid,
                                totalAttempts: stat.total,
                                correctCount: stat.correct,
                                correctRate: stat.total > 0 ? stat.correct / stat.total : 0
                            };
                        });
                        hardestQuestions = __spreadArray([], questionAccuracy, true)
                            .sort(function (a, b) {
                                return a.correctRate - b.correctRate;
                            })
                            .slice(0, 5);
                        easiestQuestions = __spreadArray([], questionAccuracy, true)
                            .sort(function (a, b) {
                                return b.correctRate - a.correctRate;
                            })
                            .slice(0, 5);
                        docRef = db.collection('quizAggregates').doc(String(quizId));
                        batch.set(docRef, {
                            quizId: quizId,
                            completedCount: agg.completedCount,
                            inProgressCount: agg.inProgressCount,
                            abandonedCount: agg.abandonedCount,
                            totalScore: agg.totalScore,
                            totalTime: agg.totalTime,
                            averageScore: averageScore,
                            averageTime: averageTime,
                            hourlyCounts: agg.hourlyCounts,
                            locationCounts: agg.locationCounts,
                            questionStats: agg.questionStats,
                            questionAccuracy: questionAccuracy,
                            hardestQuestions: hardestQuestions,
                            easiestQuestions: easiestQuestions,
                            avgTimeBetweenQuestions: agg.avgTimeBetweenQuestions,
                            avgTimeBetweenByQuestion: agg.avgTimeBetweenByQuestion, // ✅ new
                            maxScore: agg.maxScore,
                            minScore: agg.minScore,
                            validStatsCount: agg.validStatsCount,
                            updatedAt: new Date()
                        });
                        console.log(averageScore);
                        console.log(hardestQuestions);
                        console.log(easiestQuestions);
                    }
                    return [4 /*yield*/, batch.commit()];
                case 5:
                    _s.sent();
                    console.log('\u2705 Wrote '.concat(Object.keys(aggregates).length, ' quiz aggregates for quizId 180.'));
                    return [3 /*break*/, 7];
                case 6:
                    err_2 = _s.sent();
                    console.error('❌ Failed to write aggregates to Firestore:', err_2);
                    return [3 /*break*/, 7];
                case 7:
                    return [2 /*return*/];
            }
        });
    });
}
buildQuizAggregates()
    .then(function () {
        console.log('Done!');
        process.exit(0);
    })
    .catch(function (err) {
        console.error('❌ Unexpected error:', err);
        process.exit(1);
    });
