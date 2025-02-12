const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.getElementById('saveFace').addEventListener('click', async () => {
    const name = document.getElementById('name').value.trim();
    const score = parseInt(document.getElementById('score').value.trim(), 10);
    const absences = parseInt(document.getElementById('absences').value.trim(), 10);
    if (!name || isNaN(score) || isNaN(absences)) return alert("لطفا همه اطلاعات را وارد کنید");
    
    const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
    
    if (detections) {
        await db.collection("students").add({ name, score, absences, descriptor: Array.from(detections.descriptor) });
        alert("اطلاعات ذخیره شد!");
        loadStudents();
    } else {
        alert("چهره‌ای شناسایی نشد!");
    }
});

document.getElementById('video').addEventListener('play', async () => {
    const canvas = document.getElementById('canvas');
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);
    
    const students = await db.collection("students").get();
    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptors();
        
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        
        if (detections.length > 0) {
            let bestMatch = "ناشناس";
            let minDistance = 0.5;
            let studentData = null;
            students.forEach(doc => {
                const data = doc.data();
                const distance = faceapi.euclideanDistance(detections[0].descriptor, data.descriptor);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestMatch = data.name;
                    studentData = data;
                }
            });
            
            if (studentData) {
                document.getElementById('info').innerText = `شناسایی شد: ${bestMatch} | نمره: ${studentData.score} | غیبت: ${studentData.absences}`;
                if (studentData.absences > 3) {
                    ctx.strokeStyle = "red";
                } else if (studentData.score < 12) {
                    ctx.strokeStyle = "blue";
                } else if (studentData.score >= 18) {
                    ctx.strokeStyle = "green";
                }
                ctx.lineWidth = 4;
                faceapi.draw.drawDetections(canvas, resizedDetections);
            }
        } else {
            document.getElementById('info').innerText = "چهره‌ای شناسایی نشده است.";
        }
    }, 200);
});

async function loadStudents() {
    const list = document.getElementById('studentsList');
    list.innerHTML = '';
    const snapshot = await db.collection("students").get();
    snapshot.forEach(doc => {
        const data = doc.data();
        const li = document.createElement('li');
        li.textContent = `${data.name} | نمره: ${data.score} | غیبت: ${data.absences}`;
        if (data.absences > 3) {
            li.classList.add("red-border");
        } else if (data.score < 12) {
            li.classList.add("blue-border");
        } else if (data.score >= 18) {
            li.classList.add("green-border");
        }
        list.appendChild(li);
    });
}
document.addEventListener("DOMContentLoaded", loadStudents);