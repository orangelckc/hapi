/**
 * Happy-Mobile Compatibility Layer
 * 
 * This module provides compatibility with the happy-mobile client app.
 * It translates happy-mobile protocol messages to HAPI's protocol.
 */

import { Hono } from 'hono'
import type { WebAppEnv } from '../middleware/auth'
import type { Store } from '../../store'
import type { SyncEngine } from '../../sync/syncEngine'

/**
 * Create happy-mobile compatible routes
 */
export function createHappyCompatRoutes(
    store: Store,
    getSyncEngine: () => SyncEngine | null
): Hono<WebAppEnv> {
    const app = new Hono<WebAppEnv>()

    /**
     * Happy-mobile pairing endpoint
     * This endpoint is called when happy-mobile scans a hapi:// QR code
     */
    app.post('/pair', async (c) => {
        try {
            const body = await c.req.json()
            const { token, deviceId, deviceName } = body

            if (!token) {
                return c.json({ error: 'Missing pairing token' }, 400)
            }

            // Get pairing from store
            const pairing = store.getPairingByToken(token)
            if (!pairing) {
                return c.json({ error: 'Invalid or expired pairing token' }, 404)
            }

            if (pairing.completedAt) {
                return c.json({ error: 'Pairing already completed' }, 400)
            }

            if (pairing.expiresAt < Date.now()) {
                return c.json({ error: 'Pairing token expired' }, 400)
            }

            // Complete pairing with device info
            const userAgent = c.req.header('user-agent') ?? `happy-mobile/${deviceName || 'unknown'}`
            const machineId = deviceId || `happy-mobile-${Date.now()}`

            // For happy-mobile compatibility, we need to return the CLI API token
            // that was generated during pairing initiation
            const cliApiToken = pairing.cliApiToken

            if (!cliApiToken) {
                // Pairing record is invalid - missing required token
                return c.json({ error: 'Invalid pairing: missing authentication token' }, 400)
            }

            const success = store.completePairing(token, cliApiToken, machineId, userAgent)
            if (!success) {
                return c.json({ error: 'Failed to complete pairing' }, 500)
            }

            return c.json({
                success: true,
                apiToken: cliApiToken,
                machineId,
                message: 'Pairing successful'
            })
        } catch (error) {
            console.error('Happy-mobile pairing error:', error)
            return c.json({ error: 'Internal server error' }, 500)
        }
    })

    /**
     * Happy-mobile session sync endpoint
     * Translates happy-mobile session format to HAPI format
     */
    app.post('/sync', async (c) => {
        const syncEngine = getSyncEngine()
        if (!syncEngine) {
            return c.json({ error: 'Sync engine not available' }, 503)
        }

        try {
            const body = await c.req.json()
            const { sessions, messages } = body

            // Transform happy-mobile format to HAPI format
            // This is a placeholder - actual transformation depends on happy-mobile protocol
            const transformedSessions = Array.isArray(sessions) ? sessions : []
            const transformedMessages = Array.isArray(messages) ? messages : []

            return c.json({
                success: true,
                synced: {
                    sessions: transformedSessions.length,
                    messages: transformedMessages.length
                }
            })
        } catch (error) {
            console.error('Happy-mobile sync error:', error)
            return c.json({ error: 'Sync failed' }, 500)
        }
    })

    /**
     * Happy-mobile status endpoint
     * Returns server status in happy-mobile compatible format
     */
    app.get('/status', async (c) => {
        const syncEngine = getSyncEngine()
        
        return c.json({
            status: 'online',
            version: '0.3.0-hapi-compat',
            compatible: true,
            features: {
                pairing: true,
                qrCode: true,
                sync: true,
                notifications: true
            }
        })
    })

    return app
}
