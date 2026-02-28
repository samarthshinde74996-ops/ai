const video = document.getElementById("webcam");
const resultText = document.getElementById("result-text");
const status = document.getElementById("status");
const scanBtn = document.getElementById("scan-btn");
const progressFill = document.getElementById("progress-fill");
const loadingOverlay = document.getElementById("loading-overlay");

let model = null;
let scanning = false;
let totalCount = 0; // Linked to stats page

const dictionary = {
    person:"माणूस", chair:"खुर्ची", table:"टेबल", bed:"पलंग",
    "cell phone":"मोबाईल", laptop:"लॅपटॉप", keyboard:"कीबोर्ड",
    mouse:"माऊस", remote:"रिमोट", headphones:"हेडफोन",
    book:"पुस्तक", backpack:"बॅग", umbrella:"छत्री",
    bottle:"बाटली", cup:"कप", dog:"कुत्रा", cat:"मांजर",
    car:"गाडी", bus:"बस", motorcycle:"बाईक"
};

/* ===== YOUR PREFERRED SPEECH LOGIC ===== */
function speak(text){
    if (speechSynthesis.speaking) return;
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "mr-IN";
    speech.rate = 1;
    speechSynthesis.speak(speech);
}

/* ===== CAMERA ===== */
navigator.mediaDevices.getUserMedia({
    video:{facingMode:"environment", width:240, height:180}
})
.then(stream=>{ video.srcObject = stream; })
.catch(err=>{ status.innerText = "Camera access denied"; });

/* ===== LOAD MODEL ===== */
async function loadAI(){
    try{
        // Progress bar simulation
        let p = 0;
        let timer = setInterval(() => {
            p += 5;
            if(p < 90) progressFill.style.width = p + "%";
        }, 150);

        model = await cocoSsd.load({ base:"lite_mobilenet_v2" });
        
        clearInterval(timer);
        progressFill.style.width = "100%";
        
        status.innerText = "सिस्टम तयार आहे!";
        
        // Hide loader and show start button
        setTimeout(() => {
            loadingOverlay.style.opacity = "0";
            setTimeout(() => {
                loadingOverlay.style.display = "none";
                scanBtn.style.display = "block";
            }, 500);
        }, 500);

    }catch(e){
        status.innerText = "लोडिंग एरर!";
    }
}

/* ===== DETECT LOGIC (YOUR ORIGINAL) ===== */
let lastObject = "";
let lastTime = 0;

async function detect(){
    if(!model) return;
    const predictions = await model.detect(video);

    if(predictions.length > 0){
        if(predictions[0].score < 0.6) return;

        const rawObj = predictions[0].class;
        const obj = dictionary[rawObj] || rawObj;
        const bbox = predictions[0].bbox;
        const dist = (250 / bbox[2]).toFixed(1);

        // Update stats page counter
        totalCount++;
        const countDisplay = document.getElementById("obj-count");
        if(countDisplay) countDisplay.innerText = totalCount;

        const center = bbox[0] + bbox[2]/2;
        let direction = "समोर";
        if(center < video.videoWidth * 0.33) direction = "डावीकडे";
        else if(center > video.videoWidth * 0.66) direction = "उजवीकडे";

        resultText.innerText = `${direction} ${obj} आहे (${dist}m)`;

        const now = Date.now();
        if(obj !== lastObject || now - lastTime > 2000){
            speak(`${direction} ${obj} आहे. अंतर ${dist} मीटर.`);
            lastObject = obj;
            lastTime = now;
        }
    }
}

async function detectLoop(){
    if(!scanning) return;
    await detect();
    requestAnimationFrame(detectLoop);
}

/* ===== BUTTON CLICK ===== */
scanBtn.onclick = () => {
    speak("स्कॅनिंग सुरू झाले");
    scanBtn.style.display = "none";
    scanning = true;
    detectLoop();
};

loadAI();