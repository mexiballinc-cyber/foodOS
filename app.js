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

let currentBusinessToken = null;
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
        const config = {
            fps: 15,
            qrbox: function(viewfinderWidth, viewfinderHeight) {
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
        }, (error) => {});
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

    if (cleanToken.startsWith("QR_GERENTE_")) {
        autenticarGerentePorQR(cleanToken);
        return;
    }

    currentBusinessToken = cleanToken;
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

function autenticarGerentePorQR(qrCode) {
    fetch(`${FIREBASE_URL}/businesses.json`)
        .then(res => res.json())
        .then(businesses => {
            let negocioEncontradoKey = null;
            let negocioData = null;

            for (const key in businesses) {
                if (businesses[key].gerente && businesses[key].gerente.qr_code === qrCode) {
                    negocioEncontradoKey = key;
                    negocioData = businesses[key];
                    break;
                }
            }

            if (negocioData) {
                currentBusinessToken = negocioEncontradoKey;
                currentBusinessData = negocioData;
                alert(`👑 ¡Bienvenido Gerente ${negocioData.gerente.nombre}!\nAcceso directo concedido.`);
                iniciarSesionUnica(negocioEncontradoKey, "admin", negocioData.gerente.nombre);
            } else {
                alert("❌ Código QR de Gerente no reconocido.");
                location.reload();
            }
        });
}

function iniciarReloj() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('clock-display').innerText = 
            now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, 1000);
}

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
        let userName = rol.toUpperCase();

        if (currentBusinessData.gerente && currentBusinessData.gerente.pin === inputPin) {
            userName = currentBusinessData.gerente.nombre;
        } else if (currentBusinessData.empleados && currentBusinessData.empleados[inputPin]) {
            userName = currentBusinessData.empleados[inputPin].nombre || userName;
        }

        const areaTrabajo = (currentBusinessData.pins_area && currentBusinessData.pins_area[inputPin])
            ? currentBusinessData.pins_area[inputPin]
            : "general";

        iniciarSesionUnica(currentBusinessToken, rol, userName, areaTrabajo);
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

function iniciarSesionUnica(businessToken, userRole, userName, areaTrabajo = "general") {
    const newSessionId = "SESS_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);

    fetch(`${FIREBASE_URL}/businesses/${businessToken}/active_session_token.json`, {
        method: 'PUT',
        body: JSON.stringify(newSessionId)
    })
    .then(() => {
        localStorage.setItem('foodos_session_token', newSessionId);
        localStorage.setItem('foodos_business_token', businessToken);
        localStorage.setItem('foodos_business_data', JSON.stringify(currentBusinessData));
        localStorage.setItem('foodos_role', userRole);
        localStorage.setItem('foodos_user_name', userName);
        localStorage.setItem('foodos_area', areaTrabajo);

        escucharCierreDeSesionRemoto(businessToken, newSessionId);

        if (userRole === 'caja' || userRole === 'admin' || userRole === 'gerente') {
            window.location.href = 'caja.html';
        } else if (userRole === 'cocina' || userRole === 'cocinero' || userRole === 'pizzero') {
            window.location.href = `cocina.html?area=${areaTrabajo}`;
        } else if (userRole === 'repartidor' || userRole === 'repa') {
            window.location.href = 'repa.html';
        } else {
            window.location.href = 'caja.html';
        }
    })
    .catch(err => {
        alert("⚠️ Error al registrar la sesión en el servidor.");
    });
}

function escucharCierreDeSesionRemoto(businessToken, mySessionId) {
    setInterval(() => {
        fetch(`${FIREBASE_URL}/businesses/${businessToken}/active_session_token.json`)
            .then(res => res.json())
            .then(remoteSessionId => {
                if (remoteSessionId && remoteSessionId !== mySessionId) {
                    alert("⚠️ ALERTA DE SEGURIDAD\n\nSe ha iniciado sesión desde otro dispositivo en este negocio. Cerrando sesión...");
                    localStorage.clear();
                    window.location.href = 'index.html';
                }
            });
    }, 5000);
}
