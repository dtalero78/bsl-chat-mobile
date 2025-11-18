# BSL Chat Mobile

Aplicación móvil React Native + Expo para BSL Chat (WhatsApp multi-cuenta).

## 🚀 Quick Start

### Desarrollo con Expo Go

1. **Instala Expo Go** en tu iPhone desde App Store
2. **Inicia el servidor**:
   ```bash
   npm start
   ```
3. **Escanea el QR** con tu iPhone
4. La app se carga instantáneamente en Expo Go

### Comandos Disponibles

```bash
npm start          # Inicia Metro bundler
npm run android    # Abre en emulador Android
npm run ios        # Abre en simulador iOS (requiere Mac)
npm run web        # Abre en navegador web
```

## 📱 Funcionalidades

- ✅ Lista de conversaciones de WhatsApp
- ✅ Chat en tiempo real con WebSocket
- ✅ Envío y recepción de mensajes
- ✅ Indicadores de estado (enviado, entregado, leído)
- ✅ Fotos de perfil
- ✅ Contador de mensajes no leídos

## 🏗️ Arquitectura

```
bsl-chat-mobile/
├── src/
│   ├── screens/          # Pantallas principales
│   │   ├── ConversationsScreen.tsx
│   │   └── ChatScreen.tsx
│   ├── services/         # Lógica de negocio
│   │   ├── api.ts        # Cliente HTTP (Axios)
│   │   └── websocket.ts  # WebSocket (Socket.IO)
│   ├── components/       # Componentes reutilizables
│   │   ├── MessageBubble.tsx
│   │   └── ConversationItem.tsx
│   └── types/            # TypeScript types
│       ├── Conversation.ts
│       └── Message.ts
├── App.tsx               # Entry point
└── app.json              # Expo config
```

## 🔌 Conexión con Backend

**Backend URL:** `https://bsl-utilidades-yp78a.ondigitalocean.app`

### Endpoints

- `GET /twilio-chat/api/conversaciones` - Lista de conversaciones
- `GET /twilio-chat/api/mensajes/:id` - Mensajes de una conversación
- `POST /twilio-chat/api/enviar-mensaje` - Enviar mensaje

### WebSocket

- **Socket.IO** en el mismo dominio
- Eventos: `nuevo_mensaje`, `mensaje_actualizado`, `conversacion_actualizada`

## 📦 Dependencias Principales

- **expo** - Framework React Native
- **react-navigation** - Navegación entre pantallas
- **axios** - Cliente HTTP
- **socket.io-client** - WebSocket en tiempo real

## 🚀 Deploy a TestFlight

Para publicar en TestFlight usando EAS Build:

```bash
# 1. Instalar EAS CLI
npm install -g eas-cli

# 2. Login con tu cuenta Expo
eas login

# 3. Configurar proyecto
eas build:configure

# 4. Build para iOS
eas build --platform ios

# 5. Submit a App Store Connect
eas submit --platform ios
```

**No requiere Xcode** - todo se hace en la nube.

## 📝 Notas de Desarrollo

- Usa Expo Go para pruebas rápidas durante desarrollo
- Para features que requieren código nativo, usa `expo prebuild`
- El backend ya está desplegado y listo para usar

## 🔗 Repositorios Relacionados

- **Backend:** [bsl-utilidades](https://github.com/dtalero78/bsl-utilidades)
- **Web App:** Incluida en el backend (Flask + Jinja2)

---

**Creado:** 2025-11-18
**Stack:** React Native + Expo + TypeScript
