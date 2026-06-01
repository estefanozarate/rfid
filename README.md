# stamping.io — RFID Reader App

App demo de lectura **real** de tags RFID/NFC para stamping.io.
Conecta directamente con la antena NFC del dispositivo usando `react-native-nfc-manager`.

---

## Estructura de archivos

```
stamping-rfid/
├── App.js                          # Entry point
├── app.json                        # Config Expo: permisos NFC, entitlements iOS, plugin
├── package.json
├── babel.config.js
└── src/
    ├── theme/
    │   └── index.js                # Tokens de diseño (colores, tipografía, espaciado)
    ├── hooks/
    │   └── useNfcReader.js         # 🔑 Hook NFC: toda la lógica de hardware
    ├── components/
    │   ├── ScanRing.js             # Anillo animado pulsante
    │   └── TagDataCard.js          # Tarjeta de datos del tag leído
    ├── screens/
    │   ├── WelcomeScreen.js        # Pantalla 1: Bienvenida + CTA
    │   └── ScannerScreen.js        # Pantalla 2: Lector RFID real
    └── navigation/
        └── AppNavigator.js         # Stack de navegación
```

---

## Requisitos previos

- Node.js ≥ 18
- Expo CLI: `npm install -g expo`
- Para iOS: Xcode ≥ 15, cuenta de Apple Developer (para entitlements NFC)
- Para Android: Android Studio con SDK ≥ 31
- Dispositivo físico con NFC habilitado (el emulador NO soporta NFC)

---

## Instalación paso a paso

### 1. Instalar dependencias

```bash
cd stamping-rfid
npm install
```

### 2. Prebuild nativo (OBLIGATORIO — Expo Go no soporta NFC)

```bash
# Android
npx expo prebuild --platform android --clean

# iOS
npx expo prebuild --platform ios --clean
```

> `--clean` elimina carpetas `android/` e `ios/` antes de regenerarlas.
> Esto ejecuta el plugin de `react-native-nfc-manager` que inyecta los permisos automáticamente.

### 3. Verificar permisos tras el prebuild

**Android** — `android/app/src/main/AndroidManifest.xml` debe contener:
```xml
<uses-permission android:name="android.permission.NFC" />
<uses-feature android:name="android.hardware.nfc" android:required="false" />
```

**iOS** — `ios/<appname>/<appname>.entitlements` debe contener:
```xml
<key>com.apple.developer.nfc.readersession.formats</key>
<array>
  <string>NDEF</string>
  <string>TAG</string>
</array>
```

Y en `ios/<appname>/Info.plist`:
```xml
<key>NFCReaderUsageDescription</key>
<string>stamping.io necesita acceso al NFC para leer tags RFID en eventos.</string>
```

### 4. Ejecutar en dispositivo físico

```bash
# Android (cable USB o WiFi)
npx expo run:android --device

# iOS (requiere provisioning profile con NFC capability)
npx expo run:ios --device
```

### 5. Desarrollo continuo (sin rebuild)

Una vez hecho el prebuild, puedes usar Metro con hot reload:
```bash
npx expo start --dev-client
```

---

## iOS: Configuración adicional de firma

En Xcode (`ios/stampingrfid.xcworkspace`):

1. **Signing & Capabilities** → selecciona tu Team
2. Añade la capability **Near Field Communication Tag Reading**
3. Esto sincroniza el entitlement automáticamente

---

## Tags compatibles

| Tipo | Estándar | Ejemplo de uso |
|------|----------|----------------|
| NFC-A | ISO 14443-3A | MIFARE Ultralight, NTAG2xx |
| NFC-B | ISO 14443-3B | Smart cards bancarias |
| NFC-V | ISO 15693 | Tags industriales largo alcance |
| ISO-DEP | ISO 14443-4 | MIFARE DESFire, tarjetas EMV |
| NDEF | NFC Forum | Tags de texto, URLs, vCard |

---

## Tecnologías clave

| Librería | Versión | Propósito |
|----------|---------|-----------|
| `react-native-nfc-manager` | ^3.14.14 | API nativa NFC/RFID |
| `@react-navigation/native-stack` | ^6.9.26 | Navegación con performance nativa |
| `expo-linear-gradient` | ~13.0.2 | Gradientes decorativos |
| `expo-haptics` | ~13.0.1 | Feedback táctil al detectar tag |

---

## Notas de producción

- **Memory leaks**: `cancelScan()` se llama en el `useEffect` cleanup de `ScannerScreen` — nunca omitirlo.
- **iOS**: El sheet nativo aparece automáticamente al llamar `requestTechnology`.
- **Android**: Usa el foreground dispatch automáticamente — no requiere configuración adicional.
- **Background**: NFC solo funciona en foreground; el OS lo gestiona automáticamente.
