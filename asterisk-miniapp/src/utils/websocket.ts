import { Socket, io } from 'socket.io-client'
import type { SelfApp } from '@selfxyz/core'

export enum QRCodeSteps {
  WAITING_FOR_MOBILE = 0,
  MOBILE_CONNECTED = 1,
  PROOF_GENERATION_STARTED = 2,
  PROOF_GENERATED = 3,
  PROOF_GENERATION_FAILED = 4,
  PROOF_VERIFIED = 5
}

export interface WebAppInfo {
  appName: string
  userId: string
  logoBase64: string
}

const newSocket = (websocketUrl: string, sessionId: string): Socket => {
  const fullUrl = `${websocketUrl}/websocket`
  console.log(`[WebSocket] Creating new socket. URL: ${fullUrl}, sessionId: ${sessionId}`)
  
  return io(fullUrl, {
    path: '/',
    query: { sessionId, clientType: 'web' },
    transports: ['websocket']
  })
}

export function initWebSocket(
  websocketUrl: string,
  selfApp: SelfApp,
  type: 'websocket' | 'deeplink',
  setProofStep: (step: QRCodeSteps) => void,
  onSuccess: () => void
): () => void {
  const sessionId = selfApp.sessionId
  const socket = newSocket(websocketUrl, sessionId)

  const handleMessage = async (data: any) => {
    console.log(data)
    console.log('[WebSocket] Received mobile status:', data.status)
    
    switch (data.status) {
      case 'mobile_connected':
        setProofStep(QRCodeSteps.MOBILE_CONNECTED)
        if (type === 'websocket') {
          socket.emit('self_app', { ...selfApp, sessionId })
        }
        break
        
      case 'mobile_disconnected':
        setProofStep(QRCodeSteps.WAITING_FOR_MOBILE)
        break
        
      case 'proof_generation_started':
        setProofStep(QRCodeSteps.PROOF_GENERATION_STARTED)
        break
        
      case 'proof_generated':
        setProofStep(QRCodeSteps.PROOF_GENERATED)
        break
        
      case 'proof_generation_failed':
        setProofStep(QRCodeSteps.PROOF_GENERATION_FAILED)
        break
        
      case 'proof_verified':
        setProofStep(QRCodeSteps.PROOF_VERIFIED)
        onSuccess()
        break
        
      default:
        console.log('[WebSocket] Unhandled status:', data.status)
    }
  }

  socket.on('connect', () => {
    console.log(`[WebSocket] Connected with id: ${socket.id}`)
  })

  socket.on('connect_error', (error) => {
    console.error('[WebSocket] Connection error:', error)
  })

  socket.on('mobile_status', handleMessage)

  socket.on('disconnect', (reason: string) => {
    console.log(`[WebSocket] Disconnected. Reason: ${reason}`)
  })

  return () => {
    console.log(`[WebSocket] Cleaning up connection for sessionId: ${sessionId}`)
    socket.disconnect()
  }
} 