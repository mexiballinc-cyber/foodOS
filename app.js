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
    pins_area: {},
    menu: []
};

let html5QrcodeScanner = null;
let inputPin = "";

// ==========================================
// 1. TRANSICIÓN DE PANTALLA Y LECTOR QR
// ==========================================
function abrirEscaner() {
    const welcomeScreen = document.getElementById('welcome-screen');
    const scannerScreen = document.getElementById('scanner-screen');

    // Transición visual limpia entre pantallas
    if (welcomeScreen) {
        welcomeScreen.classList.remove('active');
        welcomeScreen.classList.add('hidden');
    }
    
    if (scannerScreen) {
        scannerScreen.classList.remove('hidden');
        scannerScreen.classList.add('active');
    }

    // Inicializar soporte para teclado físico
    iniciarSoporteTeclado();

    // Inicializar el escáner si está la librería Html5QrcodeScanner cargada
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

        if (!html5QrcodeScanner) {
            html5QrcodeScanner = new Html5QrcodeScanner("reader", config, false);
            html5QrcodeScanner.render((tokenLeido) => {
                if (html5QrcodeScanner) html5QrcodeScanner.clear();
                procesarTokenAcceso(tokenLeido);
            }, (error) => {
                // Silenciamos los errores de lectura frame a frame
            });
        }
    }
}

function procesarTokenAcceso(rawToken) {
    let cleanToken = rawToken.trim();
    if (cleanToken.includes('/')) {
        const parts = cleanToken.split('/');
        cleanToken = parts[parts.length - 1] || parts[parts.length - 2];
    }

    // SI ES UN QR DIRECTO DE GERENTE
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
                alert(`✅ Negocio detectado: ${currentBusinessData.business_name || 'Food OS'}`);
            } else {
                alert(`❌ El código "${cleanToken}" no está registrado.`);
                location.reload();
            }
        })
        .catch(err => {
            alert(`⚠️ Error al conectar con Firebase.`);
        });
}

// ==========================================
// 2. AUTENTICACIÓN POR QR GERENTE
// ==========================================
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
                iniciarSesionUnica(negocioEncontradoKey, "admin", negocioData.gerente.nombre, "general");
            } else {
                alert("❌ Código QR de Gerente no reconocido.");
                location.reload();
            }
        });
}

// ==========================================
// 3. TECLADO NUMÉRICO Y PIN
// ==========================================
function pressPin(num) {
    if (inputPin.length < 4) {
        inputPin += num;
        actualizarPinDisplay();
    }
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
        inputPin = "";
        actualizarPinDisplay();
    }
}

function actualizarPinDisplay() {
    const display = document.getElementById('pin-display');
    if (display) {
        display.value = "•".repeat(inputPin.length);
    }
}

function submitPin() {
    if (inputPin.length === 0) {
        alert("⚠️ Ingresa tu PIN de 4 dígitos.");
        return;
    }

    // Si hay datos cargados del negocio, busca el PIN
    if (currentBusinessData && currentBusinessData.pins && currentBusinessData.pins[inputPin]) {
        const rol = currentBusinessData.pins[inputPin];
        let userName = rol.toUpperCase();

        if (currentBusinessData.gerente && currentBusinessData.gerente.pin === inputPin) {
            userName = currentBusinessData.gerente.nombre;
        }

        const areaCocina = (currentBusinessData.pins_area && currentBusinessData.pins_area[inputPin]) 
            ? currentBusinessData.pins_area[inputPin] 
            : "general";

        iniciarSesionUnica(currentBusinessToken || "TOKEN_CUBITO_01", rol, userName, areaCocina);
    } else {
        // Validación directa de respaldo para pruebas rápidas
        if (inputPin === "1234" || inputPin === "1525") {
            const rol = (inputPin === "1525") ? "admin" : "caja";
            iniciarSesionUnica("TOKEN_CUBITO_01", rol, "Empleado Demo", "general");
        } else if (inputPin === "5555" || inputPin === "5556") {
            const area = (inputPin === "5555") ? "barra_fria" : "cocina_caliente";
            iniciarSesionUnica("TOKEN_CUBITO_01", "cocina", "Cocinero", area);
        } else if (inputPin === "7777") {
            iniciarSesionUnica("TOKEN_CUBITO_01", "repartidor", "Repartidor", "general");
        } else {
            alert("❌ PIN Incorrecto");
            inputPin = "";
            actualizarPinDisplay();
        }
    }
}

function iniciarSoporteTeclado() {
    window.addEventListener('keydown', (e) => {
        if (e.key >= '0' && e.key <= '9') {
            pressPin(e.key);
        } else if (e.key === 'Backspace') {
            borrarPin();
        } else if (e.key === 'Enter') {
            submitPin();
        }
    });
}

// ==========================================
// 4. SESIÓN ÚNICA Y RUTEO POR ROLES
// ==========================================
function iniciarSesionUnica(businessToken, userRole, userName, areaCocina = "general") {
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

        // 🔀 RUTEO AUTOMÁTICO DE FOOD OS SEGÚN ROL
        switch (userRole) {
            case 'admin':
            case 'gerente':
            case 'caja':
            case 'cajero':
                window.location.href = 'caja.html';
                break;

            case 'cocina':
            case 'cocinero':
            case 'pizzero':
                window.location.href = `cocina.html?area=${areaCocina}`;
                break;

            case 'repartidor':
            case 'repa':
                window.location.href = 'repa.html';
                break;

            default:
                alert("⚠️ Rol no asignado en el sistema.");
                break;
        }
    })
    .catch(err => {
        // Redirección en caso de falla de red/demo
        if (userRole === 'cocina' || userRole === 'cocinero') {
            window.location.href = `cocina.html?area=${areaCocina}`;
        } else if (userRole === 'repartidor' || userRole === 'repa') {
            window.location.href = 'repa.html';
        } else {
            window.location.href = 'caja.html';
        }
    });
}
