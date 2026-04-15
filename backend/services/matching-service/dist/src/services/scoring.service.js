"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCompatibility = calculateCompatibility;
function intersectionCount(a, b) {
    const setB = new Set(b.map((x) => x.trim().toLowerCase()));
    return a.map((x) => x.trim().toLowerCase()).filter((x) => setB.has(x)).length;
}
function timeToMinutes(time) {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}
function calculateOverlapMinutes(a, b) {
    let total = 0;
    for (const slotA of a) {
        for (const slotB of b) {
            if (slotA.dayOfWeek.toLowerCase() !== slotB.dayOfWeek.toLowerCase())
                continue;
            const start = Math.max(timeToMinutes(slotA.startTime), timeToMinutes(slotB.startTime));
            const end = Math.min(timeToMinutes(slotA.endTime), timeToMinutes(slotB.endTime));
            if (end > start) {
                total += end - start;
            }
        }
    }
    return total;
}
function calculateCompatibility(currentUser, candidate) {
    let score = 0;
    const reasons = [];
    const sharedCourses = intersectionCount(currentUser.courses, candidate.courses);
    if (sharedCourses > 0) {
        const coursePoints = Math.min(sharedCourses * 15, 30);
        score += coursePoints;
        reasons.push(`Shared courses (${sharedCourses})`);
    }
    const sharedTopics = intersectionCount(currentUser.topics, candidate.topics);
    if (sharedTopics > 0) {
        const topicPoints = Math.min(sharedTopics * 10, 20);
        score += topicPoints;
        reasons.push(`Shared topics (${sharedTopics})`);
    }
    const overlapMinutes = calculateOverlapMinutes(currentUser.availabilitySlots, candidate.availabilitySlots);
    if (overlapMinutes > 0) {
        if (overlapMinutes >= 180) {
            score += 25;
        }
        else if (overlapMinutes >= 60) {
            score += 18;
        }
        else {
            score += 10;
        }
        reasons.push(`Overlapping availability (${overlapMinutes} mins)`);
    }
    if (currentUser.studyMode &&
        candidate.studyMode &&
        currentUser.studyMode.toLowerCase() === candidate.studyMode.toLowerCase()) {
        score += 10;
        reasons.push("Same study mode");
    }
    if (currentUser.studyPace &&
        candidate.studyPace &&
        currentUser.studyPace.toLowerCase() === candidate.studyPace.toLowerCase()) {
        score += 5;
        reasons.push("Same study pace");
    }
    if (currentUser.studyStyle &&
        candidate.studyStyle &&
        currentUser.studyStyle.toLowerCase() === candidate.studyStyle.toLowerCase()) {
        score += 5;
        reasons.push("Same study style");
    }
    if (currentUser.groupSize !== null &&
        currentUser.groupSize !== undefined &&
        candidate.groupSize !== null &&
        candidate.groupSize !== undefined) {
        const diff = Math.abs(currentUser.groupSize - candidate.groupSize);
        if (diff === 0) {
            score += 5;
            reasons.push("Same preferred group size");
        }
        else if (diff === 1) {
            score += 2;
            reasons.push("Similar preferred group size");
        }
    }
    if (score > 100)
        score = 100;
    return { score, reasons };
}
