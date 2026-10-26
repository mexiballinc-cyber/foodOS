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

// DETECTOR DE CONEXIÓN A INTERNET
window.addEventListener('online', actualizarEstadoRed);
window.addEventListener('offline', actualizarEstadoRed);

function actualizarEstadoRed() {
    let badge = document.getElementById('network-status-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'network-status-badge';
        badge.style.cssText = 'position:fixed; bottom:15px; left:15px; z-index:9999; padding:6px 12px; border-radius:20px; font-size:11px; font-weight:bold; backdrop-filter:blur(10px); transition:all 0.3s;';
        document.body.appendChild(badge);
    }

    if (navigator.onLine) {
        badge.style.background = 'rgba(16, 185, 129, 0.2)';
        badge.style.color = '#10b981';
        badge.style.border = '1px solid rgba(16, 185, 129, 0.4)';
        badge.innerText = '🟢 CONECTADO';
        setTimeout(() => { badge.style.opacity = '0.3'; }, 3000);
    } else {
        badge.style.opacity = '1';
        badge.style.background = 'rgba(239, 68, 68, 0.2)';
        badge.style.color = '#ef4444';
        badge.style.border = '1px solid rgba(239, 68, 68, 0.4)';
        badge.innerText = '🔴 SIN INTERNET';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    actualizarEstadoRed();
    verificarNegociosGuardados();
});

// MEMORIA MULTINEGOCIO LOCALSTORAGE (SOPORTA MÚLTIPLES TOKENS)
function guardarNegocioEnHistorial(token, nombre) {
    let historial = JSON.parse(localStorage.getItem('foodos_saved_businesses') || '{}');
    historial[token] = { name: nombre, lastUsed: Date.now() };
    localStorage.setItem('foodos_saved_businesses', JSON.stringify(historial));
}

function verificarNegociosGuardados() {
    const historial = JSON.parse(localStorage.getItem('foodos_saved_businesses') || '{}');
    const tokens = Object.keys(historial);
    const container = document.getElementById('saved-businesses-list');
    const secSaved = document.getElementById('saved-businesses-section');
    const btnIniciar = document.getElementById('btn-iniciar');

    if (tokens.length > 0 && container && secSaved) {
        container.innerHTML = "";
        tokens.forEach(tok => {
            const biz = historial[tok];
            container.innerHTML += `
                <div onclick="seleccionarNegocioGuardado('${tok}')" class="saved-biz-card">
                    <span class="biz-icon">🏪</span>
                    <div class="biz-info">
                        <p class="biz-name">${biz.name || tok}</p>
                        <p class="biz-token">Token: ${tok}</p>
                    </div>
                    <button onclick="event.stopPropagation(); olvidarNegocioGuardado('${tok}')" class="btn-forget-biz" title="Olvidar local">✕</button>
                </div>
            `;
        });
        secSaved.classList.remove('hidden');
        if (btnIniciar) btnIniciar.classList.add('hidden');
    } else {
        if (secSaved) secSaved.classList.add('hidden');
        if (btnIniciar) btnIniciar.classList.remove('hidden');
    }
}

function seleccionarNegocioGuardado(token) {
    procesarTokenAcceso(token);
}

function olvidarNegocioGuardado(token) {
    let historial = JSON.parse(localStorage.getItem('foodos_saved_businesses') || '{}');
    delete historial[token];
    localStorage.setItem('foodos_saved_businesses', JSON.stringify(historial));
    verificarNegociosGuardados();
}

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

async function procesarTokenAcceso(rawToken) {
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

    try {
        const res = await fetch(urlConsulta);
        let data = await res.json();

        if (!data) {
            data = await autoRegistrarNegocioDesdeLocalJson(cleanToken);
        }

        if (data) {
            if (data.status === "suspended") {
                alert("🚫 SERVICIO SUSPENDIDO\n\nEste negocio está deshabilitado por falta de pago.");
                location.reload();
                return;
            }

            currentBusinessData = data;
            guardarNegocioEnHistorial(cleanToken, currentBusinessData.business_name || cleanToken);

            document.getElementById('business-title').innerText = currentBusinessData.business_name;
            document.getElementById('welcome-screen').classList.add('hidden');
            document.getElementById('scanner-screen').classList.add('hidden');
            document.getElementById('lockscreen').classList.remove('hidden');
            
            iniciarReloj();
            iniciarSoporteTeclado();
        } else {
            alert(`❌ El código "${cleanToken}" no está registrado.`);
            location.reload();
        }
    } catch (err) {
        alert(`⚠️ Error al conectar con Firebase.`);
        location.reload();
    }
}

async function autoRegistrarNegocioDesdeLocalJson(tokenBuscado) {
    try {
        const resLocal = await fetch('negocios.json');
        const localData = await resLocal.json();
        const bizLocal = localData?.businesses?.[tokenBuscado];

        if (bizLocal) {
            await fetch(`${FIREBASE_URL}/businesses/${tokenBuscado}.json`, {
                method: 'PUT',
                body: JSON.stringify(bizLocal)
            });

            await fetch(`${FIREBASE_URL}/businesses/${tokenBuscado}/security_code/config/nombreLocal.json`, {
                method: 'PUT',
                body: JSON.stringify(bizLocal.business_name)
            });

            return bizLocal;
        }
    } catch (e) {
        console.warn("No se pudo auto-registrar desde negocios.json", e);
    }
    return null;
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
                guardarNegocioEnHistorial(negocioEncontradoKey, negocioData.business_name || negocioEncontradoKey);
                alert(`👑 ¡Bienvenido Gerente ${negocioData.gerente.nombre}!\nAcceso concedido a Cajas/Panel Admin.`);
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
            : (currentBusinessData.empleados && currentBusinessData.empleados[inputPin] && currentBusinessData.empleados[inputPin].area)
            ? currentBusinessData.empleados[inputPin].area
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
    if (pinDisplay) pinDisplay.setAttribute('readonly', 'true');

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
