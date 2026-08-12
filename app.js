// PON AQUÍ TU URL REAL DE FIREBASE:
const FIREBASE_URL = "https://food-os-system-default-rtdb.firebaseio.com/";

const fondos = [
    "https://i.imgur.com/TcyHW1I.jpeg", // Azul
    "https://i.imgur.com/WKCXN5q.jpeg", // Amarillo
    "https://i.imgur.com/lEXZ0VI.jpeg", // Cian
    "https://i.imgur.com/YHv9Sjh.jpeg", // Rojo
    "https://i.imgur.com/TYbsoO3.jpeg", // Rosa
    "https://i.imgur.com/OscCey8.jpeg"  // Verde
];
let fondoIndex = 0;

// EL JSON VACÍO EN MEMORIA (Receptor Dinámico)
let currentBusinessData = {
    business_id: null,
    business_name: "",
    status: "unregistered",
    pins: {},
    menu: []
};

let html5QrcodeScanner = null;

function abrirEscaner() {
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('scanner-screen').classList.remove('hidden');
    
    if (typeof Html5QrcodeScanner !== "undefined") {
        html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 200 }, false);
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

// === CONEXIÓN DIRECTA Y CONTROL DE SUSCRIPCIÓN ("status") ===
function procesarTokenAcceso(token) {
    console.log("Consultando servidor de Firebase para token:", token);

    fetch(`${FIREBASE_URL}/businesses/${token}.json`)
        .then(res => res.json())
        .then(data => {
            if (data) {
                // VERIFICAR SI EL NEGOCIO ESTÁ SUSPENDIDO
                if (data.status === "suspended") {
                    alert("🚫 SERVICIO SUSPENDIDO\n\nEste negocio está deshabilitado por falta de pago o mantenimiento. Contacta a Food OS.");
                    location.reload();
                    return;
                }

                // SI ESTÁ ACTIVO ("active"), INYECTAMOS LA INFO EN EL JSON VACÍO
                currentBusinessData = data;
                
                // Actualizar el nombre en vivo en la pantalla azul
                document.getElementById('business-title').innerText = currentBusinessData.business_name;
                
                // Transición de pantallas
                document.getElementById('scanner-screen').classList.add('hidden');
                document.getElementById('lockscreen').classList.remove('hidden');
                iniciarReloj();
            } else {
                alert("❌ El Token o QR no existe en el servidor.");
            }
        })
        .catch(err => {
            console.error(err);
            alert("Error al conectar con los servidores de Firebase.");
        });
}

function iniciarReloj() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('clock-display').innerText = 
            now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, 1000);
}

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
    if (currentBusinessData.pins && currentBusinessData.pins[inputPin]) {
        const rol = currentBusinessData.pins[inputPin];
        const horaEntrada = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        alert(`🔓 ¡ENTRADA CORRECTA!\n\nLocal: ${currentBusinessData.business_name}\nRol: ${rol.toUpperCase()}\nHora de Asistencia: ${horaEntrada}`);
        clearPin();
    } else {
        alert("❌ PIN Incorrecto para este negocio.");
        clearPin();
    }
}

function cambiarFondoLockscreen() {
    fondoIndex = (fondoIndex + 1) % fondos.length;
    document.getElementById('lockscreen').style.backgroundImage = `url('${fondos[fondoIndex]}')`;
}
