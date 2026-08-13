const FIREBASE_URL = "https://food-os-system-default-rtdb.firebaseio.com";

const fondos = [
    "https://i.imgur.com/TcyHW1I.jpeg",
    "https://i.imgur.com/WKCXN5q.jpeg",
    "https://i.imgur.com/lEXZ0VI.jpeg",
    "https://i.imgur.com/YHv9Sjh.jpeg",
    "https://i.imgur.com/TYbsoO3.jpeg",
    "https://i.imgur.com/OscCey8.jpeg"
];
let fondoIndex = 0;

let currentBusinessData = {
    business_id: null,
    business_name: "",
    status: "unregistered",
    pins: {},
    menu: []
};

let html5QrcodeScanner = null;
let inputPin = "";

function abrirEscaner() {
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('scanner-screen').classList.remove('hidden');
    
    if (typeof Html5QrcodeScanner !== "undefined") {
        // --- CONFIGURACIÓN DE ALTA TOLERANCIA Y VELOCIDAD ---
        const config = {
            fps: 15,
            qrbox: function(viewfinderWidth, viewfinderHeight) {
                // Toma el 70% de la pantalla del cuadro para darle más tolerancia a logos y formas
                const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                return {
                    width: Math.floor(minEdge * 0.75),
                    height: Math.floor(minEdge * 0.75)
                };
            },
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
            },
            formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
        };

        html5QrcodeScanner = new Html5QrcodeScanner("reader", config, false);
        html5QrcodeScanner.render((tokenLeido) => {
            if(html5QrcodeScanner) html5QrcodeScanner.clear();
            procesarTokenAcceso(tokenLeido);
        }, (error) => {
            // Silenciamos los errores de frame por frame para evitar avisos molestos en pantalla
        });
    }
}

function validarTokenManual() {
    const token = document.getElementById('manual-token').value.trim();
    if(token !== "") {
        if(html5QrcodeScanner) html5QrcodeScanner.clear();
        procesarTokenAcceso(token);
    } else {
        alert("Por favor ingresa un código válido.");
    }
}

function procesarTokenAcceso(rawToken) {
    let cleanToken = rawToken.trim();
    if (cleanToken.includes('/')) {
        const parts = cleanToken.split('/');
        cleanToken = parts[parts.length - 1] || parts[parts.length - 2];
    }

    const urlConsulta = `${FIREBASE_URL}/businesses/${cleanToken}.json`;

    fetch(urlConsulta)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP: ${res.status}`);
            return res.json();
        })
        .then(data => {
            if (data) {
                if (data.status === "suspended") {
                    alert("🚫 SERVICIO SUSPENDIDO\n\nEste negocio está deshabilitado por falta de pago.");
                    location.reload();
                    return;
                }

                currentBusinessData = data;
                document.getElementById('business-title').innerText = currentBusinessData.business_name;
                document.getElementById('scanner-screen').classList.add('hidden');
                document.getElementById('lockscreen').classList.remove('hidden');
                iniciarReloj();
                iniciarSoporteTeclado();
            } else {
                alert(`❌ El código "${cleanToken}" no está registrado.`);
                location.reload();
            }
        })
        .catch(err => {
            alert(`⚠️ Error al conectar con Firebase.`);
            location.reload();
        });
}

function iniciarReloj() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('clock-display').innerText = 
            now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, 1000);
}

// === LÓGICA DE PIN ===
function pressPin(n) {
    if (inputPin.length < 4) {
        inputPin += n;
        actualizarPinDisplay();
    }
}

function actualizarPinDisplay() {
    const pinDisplay = document.getElementById('pin-display');
    pinDisplay.value = "•".repeat(inputPin.length);
}

function borrarPin() {
    if (inputPin.length > 0) {
        inputPin = inputPin.slice(0, -1);
        actualizarPinDisplay();
    }
}

function actionExitOrClear() {
    if (inputPin.length > 0) {
        borrarPin();
    } else {
        location.reload();
    }
}

function submitPin() {
    if (currentBusinessData.pins && currentBusinessData.pins[inputPin]) {
        const rol = currentBusinessData.pins[inputPin];
        const horaEntrada = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        alert(`🔓 ¡ENTRADA CORRECTA!\n\nLocal: ${currentBusinessData.business_name}\nRol: ${rol.toUpperCase()}\nHora: ${horaEntrada}`);
        inputPin = "";
        actualizarPinDisplay();
    } else {
        alert("❌ PIN Incorrecto.");
        inputPin = "";
        actualizarPinDisplay();
    }
}

function iniciarSoporteTeclado() {
    const pinDisplay = document.getElementById('pin-display');
    pinDisplay.setAttribute('readonly', 'true');

    window.addEventListener('keydown', (e) => {
        if (document.getElementById('lockscreen').classList.contains('hidden')) return;

        if (e.key >= '0' && e.key <= '9') {
            pressPin(e.key);
        } else if (e.key === 'Backspace') {
            borrarPin();
        } else if (e.key === 'Enter') {
            submitPin();
        }
    });
}

function cambiarFondoLockscreen() {
    fondoIndex = (fondoIndex + 1) % fondos.length;
    document.getElementById('lockscreen').style.backgroundImage = `url('${fondos[fondoIndex]}')`;
}
