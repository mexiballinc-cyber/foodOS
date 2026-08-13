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
        html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 180 }, false);
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
    } else {
        alert("Por favor ingresa un código válido.");
    }
}

function procesarTokenAcceso(token) {
    const urlConsulta = `${FIREBASE_URL}/businesses/${token}.json`;

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
                alert("❌ El código ingresado no existe.");
            }
        })
        .catch(err => {
            alert("⚠️ Error al conectar con Firebase.");
        });
}

function iniciarReloj() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('clock-display').innerText = 
            now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, 1000);
}

// === LÓGICA DE PIN SIN DUPLICACIONES ===
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

// Solo borra números. NO saca a la pantalla de inicio por teclado.
function borrarPin() {
    if (inputPin.length > 0) {
        inputPin = inputPin.slice(0, -1);
        actualizarPinDisplay();
    }
}

// Acción del botón X en la pantalla: borra dígitos o sale si ya está vacío
function actionExitOrClear() {
    if (inputPin.length > 0) {
        borrarPin();
    } else {
        location.reload(); // Solo regresa al inicio si le das clic a la 'X' estando el PIN en blanco
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
    // Evitamos que el input atrape el foco para que no duplique teclas
    const pinDisplay = document.getElementById('pin-display');
    pinDisplay.setAttribute('readonly', 'true');

    window.addEventListener('keydown', (e) => {
        if (document.getElementById('lockscreen').classList.contains('hidden')) return;

        if (e.key >= '0' && e.key <= '9') {
            pressPin(e.key);
        } else if (e.key === 'Backspace') {
            borrarPin(); // Borra limpiamente sin regresar al inicio
        } else if (e.key === 'Enter') {
            submitPin();
        }
    });
}

function cambiarFondoLockscreen() {
    fondoIndex = (fondoIndex + 1) % fondos.length;
    document.getElementById('lockscreen').style.backgroundImage = `url('${fondos[fondoIndex]}')`;
}
