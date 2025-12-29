import { Hono } from 'hono'
import { z } from 'zod'
import QRCode from 'qrcode'
import { randomBytes } from 'node:crypto'
import type { WebAppEnv } from '../middleware/auth'
import type { Store } from '../../store'

const initiatePairingSchema = z.object({
    machineId: z.string().optional()
})

const completePairingSchema = z.object({
    pairingToken: z.string(),
    cliApiToken: z.string(),
    machineId: z.string()
})

const checkPairingSchema = z.object({
    pairingToken: z.string()
})

function generatePairingToken(): string {
    return randomBytes(32).toString('base64url')
}

export function createPairingRoutes(store: Store): Hono<WebAppEnv> {
    const app = new Hono<WebAppEnv>()

    // Initiate pairing - generates a QR code for CLI to display
    app.post('/initiate', async (c) => {
        try {
            const pairingToken = generatePairingToken()
            
            // Store pairing session (expires in 5 minutes)
            store.createPairing(pairingToken, 5 * 60 * 1000)

            // Generate pairing URL that mobile app will use
            const pairingUrl = `hapi://pair?token=${pairingToken}`

            // Generate QR code as data URL
            const qrCodeDataUrl = await QRCode.toDataURL(pairingUrl, {
                errorCorrectionLevel: 'M',
                margin: 1,
                width: 300
            })

            return c.json({
                pairingToken,
                pairingUrl,
                qrCode: qrCodeDataUrl,
                expiresInSeconds: 300
            })
        } catch (error) {
            console.error('Failed to initiate pairing:', error)
            return c.json({ error: 'Failed to initiate pairing' }, 500)
        }
    })

    // Complete pairing - mobile app calls this after scanning QR code
    app.post('/complete', async (c) => {
        const json = await c.req.json().catch(() => null)
        const parsed = completePairingSchema.safeParse(json)
        
        if (!parsed.success) {
            return c.json({ error: 'Invalid request body' }, 400)
        }

        const { pairingToken, cliApiToken, machineId } = parsed.data
        const userAgent = c.req.header('user-agent') ?? null

        const pairing = store.getPairingByToken(pairingToken)
        if (!pairing) {
            return c.json({ error: 'Invalid pairing token' }, 404)
        }

        if (pairing.completedAt) {
            return c.json({ error: 'Pairing already completed' }, 400)
        }

        if (pairing.expiresAt < Date.now()) {
            return c.json({ error: 'Pairing token expired' }, 400)
        }

        const success = store.completePairing(pairingToken, cliApiToken, machineId, userAgent)
        if (!success) {
            return c.json({ error: 'Failed to complete pairing' }, 500)
        }

        return c.json({ 
            success: true,
            message: 'Pairing completed successfully'
        })
    })

    // Check pairing status - CLI polls this to know when pairing is complete
    app.post('/check', async (c) => {
        const json = await c.req.json().catch(() => null)
        const parsed = checkPairingSchema.safeParse(json)
        
        if (!parsed.success) {
            return c.json({ error: 'Invalid request body' }, 400)
        }

        const { pairingToken } = parsed.data

        const pairing = store.getPairingByToken(pairingToken)
        if (!pairing) {
            return c.json({ error: 'Invalid pairing token' }, 404)
        }

        if (pairing.expiresAt < Date.now()) {
            return c.json({ error: 'Pairing token expired' }, 400)
        }

        if (pairing.completedAt && pairing.cliApiToken && pairing.machineId) {
            return c.json({
                status: 'completed',
                cliApiToken: pairing.cliApiToken,
                machineId: pairing.machineId
            })
        }

        return c.json({
            status: 'pending',
            expiresAt: pairing.expiresAt
        })
    })

    // Cleanup expired pairings (can be called periodically)
    app.post('/cleanup', async (c) => {
        try {
            const count = store.cleanupExpiredPairings()
            return c.json({ cleaned: count })
        } catch (error) {
            console.error('Failed to cleanup pairings:', error)
            return c.json({ error: 'Failed to cleanup pairings' }, 500)
        }
    })

    return app
}
