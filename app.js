const FIREBASE_URL = "https://food-os-system-default-rtdb.firebaseio.com";

let currentBusinessToken = null;
let currentBusinessData = {
    business_id: null,
    business_name: "",
    status: "unregistered",
    pins: {},
    pins_area: {},
    menu: []
};

let inputPin = "";

// ==========================================
// 1. CONTROL DE PIN Y TECLADO
// ==========================================
function pressPin(num) {
    if (inputPin.length < 4) {
        inputPin += num;
        actualizarPantallaPin();
    }
}

function actionExitOrClear() {
    inputPin = "";
    actualizarPantallaPin();
}

function actualizarPantallaPin() {
    const display = document.getElementById('pin-display');
    if (display) display.value = inputPin;
}

// ==========================================
// 2. VALIDACIÓN DE PIN Y RUTEO POR ROL
// ==========================================
function submitPin() {
    if (inputPin.length !== 4) {
        alert("⚠️ Por favor ingresa un PIN de 4 dígitos.");
        return;
    }

    if (!currentBusinessData || !currentBusinessData.pins) {
        alert("❌ No hay datos de negocio cargados.");
        return;
    }

    const userRole = currentBusinessData.pins[inputPin];

    if (userRole) {
        let userName = "Empleado";
        if (currentBusinessData.gerente && currentBusinessData.gerente.pin === inputPin) {
            userName = currentBusinessData.gerente.nombre;
        }

        // Obtener área asignada para cocina (si existe)
        const areaCocina = (currentBusinessData.pins_area && currentBusinessData.pins_area[inputPin]) 
            ? currentBusinessData.pins_area[inputPin] 
            : "general";

        iniciarSesionUnica(currentBusinessToken, userRole, userName, areaCocina);
    } else {
        alert("❌ PIN Incorrecto");
        actionExitOrClear();
    }
}

// ==========================================
// 3. REGISTRO DE SESIÓN ÚNICA Y REDIRECCIÓN
// ==========================================
function iniciarSesionUnica(businessToken, userRole, userName, areaCocina) {
    const newSessionId = "SESS_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);

    // Guardar token activo para forzar sesión única
    fetch(`${FIREBASE_URL}/businesses/${businessToken}/active_session_token.json`, {
        method: 'PUT',
        body: JSON.stringify(newSessionId)
    })
    .then(() => {
        // Almacenar credenciales en el cliente
        localStorage.setItem('foodos_session_token', newSessionId);
        localStorage.setItem('foodos_business_token', businessToken);
        localStorage.setItem('foodos_sucursal', currentBusinessData.business_id || "cubito_sushi");
        localStorage.setItem('foodos_role', userRole);
        localStorage.setItem('foodos_user_name', userName);
        localStorage.setItem('foodos_es_gerente', (userRole === 'admin' || userRole === 'gerente').toString());

        // 🔀 RUTEO AUTOMÁTICO SEGÚN ROL
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
                alert("⚠️ Rol no asignado correctamente.");
                break;
        }
    })
    .catch(err => {
        alert("⚠️ Error de conexión con el servidor.");
    });
}
