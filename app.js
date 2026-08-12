// REEMPLAZA ESTA URL POR LA TUYA DE FIREBASE:
const FIREBASE_URL = "https://console.firebase.google.com/u/0/project/food-os-system/database/food-os-system-default-rtdb/data/~2F?hl=es";

// TUS 6 FONDOS OFICIALES DE IMGUR
const fondos = [
    "https://i.imgur.com/TcyHW1I.jpeg", // Azul
    "https://i.imgur.com/WKCXN5q.jpeg", // Amarillo
    "https://i.imgur.com/lEXZ0VI.jpeg", // Cian
    "https://i.imgur.com/YHv9Sjh.jpeg", // Rojo
    "https://i.imgur.com/TYbsoO3.jpeg", // Rosa
    "https://i.imgur.com/OscCey8.jpeg"  // Verde
];
let fondoIndex = 0;

let currentBusiness = null;
let html5QrcodeScanner = null;

// --- NAVEGACIÓN Y QR ---
function abrirEscaner() {
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('scanner-screen').classList.remove('hidden');
    
    if (typeof Html5QrcodeScanner !== "undefined") {
        html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
        html5QrcodeScanner.render((token) => {
            if(html5QrcodeScanner) html5QrcodeScanner.clear();
            procesarTokenAcceso(token);
        }, () => {});
    }
}

function validarTokenManual() {
    const token = document.getElementById('manual-token').value.trim();
    if(token !== "") {
        if(html5QrcodeScanner) html5QrcodeScanner.clear();
        procesarTokenAcceso(token);
    }
}

// --- CONEXIÓN AL SERVIDOR REAL ---
function procesarTokenAcceso(token) {
    fetch(`${FIREBASE_URL}/businesses/${token}.json`)
        .then(res => res.json())
        .then(data => {
            if (data) {
                currentBusiness = data;
                document.getElementById('business-title').innerText = data.business_name;
                
                // Transición a Pantalla Azul
                document.getElementById('scanner-screen').classList.add('hidden');
                document.getElementById('lockscreen').classList.remove('hidden');
                iniciarReloj();
            } else {
                alert("❌ Token o QR no registrado en los servidores.");
            }
        })
        .catch(err => alert("Error de conexión con Firebase."));
}

// --- RELOJ Y ASISTENCIA ---
function iniciarReloj() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('clock-display').innerText = 
            now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, 1000);
}

// --- VALIDADOR DE PIN CON REGISTRO DE HORA DE ENTRADA ---
let inputPin = "";

function pressPin(n) {
    if (inputPin.length < 4) {
        inputPin += n;
        document.getElementById('pin-display').value = "•".repeat(inputPin.length);
    }
}

function clearPin() {
    inputPin = "";
    document.getElementById('pin-display').value = "";
}

function submitPin() {
    if (currentBusiness && currentBusiness.pins[inputPin]) {
        const rol = currentBusiness.pins[inputPin];
        const horaEntrada = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        alert(`🔓 ¡Acceso Correcto!\nRol: ${rol.toUpperCase()}\nHora de entrada registrada: ${horaEntrada}`);
        clearPin();
    } else {
        alert("❌ PIN Incorrecto.");
        clearPin();
    }
}

// --- SELECTOR TIKTOK DE FONDOS ---
function cambiarFondoLockscreen() {
    fondoIndex = (fondoIndex + 1) % fondos.length;
    document.getElementById('lockscreen').style.backgroundImage = `url('${fondos[fondoIndex]}')`;
}
