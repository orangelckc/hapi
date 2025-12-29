import { Hono } from 'hono'
import { z } from 'zod'
import QRCode from 'qrcode'
import { randomBytes } from 'node:crypto'
import { configuration } from '../../configuration'
import type { WebAppEnv } from '../middleware/auth'
import type { Store } from '../../store'

const initiatePairingSchema = z.object({
    cliApiToken: z.string().optional() // Token to associate with pairing
})

const completePairingSchema = z.object({
    pairingToken: z.string(),
    cliApiToken: z.string().optional(), // Optional - may come from server
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
            const json = await c.req.json().catch(() => ({}))
            const parsed = initiatePairingSchema.safeParse(json)
            const cliApiToken = parsed.success ? parsed.data.cliApiToken : undefined
            
            const pairingToken = generatePairingToken()
            
            // Get server configuration for URL generation
            const serverUrl = configuration.miniAppUrl || 'http://localhost:3006'
            
            // Store pairing session with CLI API token (expires in 5 minutes)
            const pairing = store.createPairing(pairingToken, 5 * 60 * 1000)
            
            // If CLI provided a token, store it (but don't mark as complete yet)
            if (cliApiToken && pairing) {
                // We need a way to update just the token without completing
                // For now, we'll handle this in the completePairing logic
            }

            // Generate pairing URL that mobile app will use
            // Using both hapi:// and https:// for compatibility
            const hapiUrl = `hapi://pair?token=${pairingToken}`
            const httpsUrl = `${serverUrl}/api/happy/pair?token=${pairingToken}`

            // Generate QR code as data URL (using hapi:// scheme for happy-mobile compatibility)
            const qrCodeDataUrl = await QRCode.toDataURL(hapiUrl, {
                errorCorrectionLevel: 'M',
                margin: 1,
                width: 300
            })

            return c.json({
                pairingToken,
                pairingUrl: hapiUrl,
                httpUrl: httpsUrl,
                qrCode: qrCodeDataUrl,
                expiresInSeconds: 300,
                // Include token in response for CLI to use in polling
                cliApiToken: cliApiToken || null
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

        // Use the provided cliApiToken, or the one stored during pairing initiation
        const tokenToUse = cliApiToken || pairing.cliApiToken
        
        if (!tokenToUse) {
            return c.json({ error: 'No API token available for pairing' }, 400)
        }

        const success = store.completePairing(pairingToken, tokenToUse, machineId, userAgent)
        if (!success) {
            return c.json({ error: 'Failed to complete pairing' }, 500)
        }

        return c.json({ 
            success: true,
            message: 'Pairing completed successfully',
            cliApiToken: tokenToUse
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
