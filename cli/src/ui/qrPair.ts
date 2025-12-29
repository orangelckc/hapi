import chalk from 'chalk'
import axios from 'axios'
import { configuration } from '@/configuration'
import { updateSettings } from '@/persistence'

// @ts-ignore - qrcode-terminal doesn't have types
import qrcode from 'qrcode-terminal'

interface PairingInitResponse {
    pairingToken: string
    pairingUrl: string
    qrCode: string
    expiresInSeconds: number
}

interface PairingCheckResponse {
    status: 'pending' | 'completed'
    cliApiToken?: string
    machineId?: string
    expiresAt?: number
}

export async function handleQrPairCommand(): Promise<void> {
    console.log(chalk.bold('\n🔗 QR Code Pairing\n'))
    console.log(chalk.gray('Scan this QR code with your mobile device to pair with HAPI.\n'))

    try {
        // Request pairing initiation from server
        const serverUrl = configuration.serverUrl
        const initResponse = await axios.post<PairingInitResponse>(
            `${serverUrl}/api/pairing/initiate`,
            {},
            { timeout: 10000 }
        )

        const { pairingToken, pairingUrl, expiresInSeconds } = initResponse.data

        // Display QR code in terminal
        qrcode.generate(pairingUrl, { small: true }, (qrCodeStr: string) => {
            console.log(qrCodeStr)
        })

        console.log(chalk.gray(`Pairing URL: ${pairingUrl}`))
        console.log(chalk.gray(`Token expires in ${expiresInSeconds} seconds\n`))
        console.log(chalk.yellow('Waiting for mobile device to scan...\n'))

        // Poll for pairing completion
        const pollInterval = 2000 // 2 seconds
        const maxAttempts = Math.ceil((expiresInSeconds * 1000) / pollInterval)
        let attempts = 0

        const pollTimer = setInterval(async () => {
            attempts++

            try {
                const checkResponse = await axios.post<PairingCheckResponse>(
                    `${serverUrl}/api/pairing/check`,
                    { pairingToken },
                    { timeout: 5000 }
                )

                if (checkResponse.data.status === 'completed') {
                    clearInterval(pollTimer)
                    
                    const { cliApiToken, machineId } = checkResponse.data
                    
                    if (!cliApiToken) {
                        console.error(chalk.red('✗ Pairing completed but no token received'))
                        process.exit(1)
                    }

                    // Save the token to settings
                    await updateSettings(current => ({
                        ...current,
                        cliApiToken,
                        machineId: machineId || current.machineId
                    }))

                    console.log(chalk.green('✓ Pairing successful!'))
                    console.log(chalk.gray(`Token saved to ${configuration.settingsFile}`))
                    console.log(chalk.gray(`Machine ID: ${machineId || 'not provided'}\n`))
                    
                    process.exit(0)
                }

                // Show progress indicator
                const remaining = Math.max(0, maxAttempts - attempts)
                const dots = '.'.repeat((attempts % 3) + 1)
                process.stdout.write(`\r${chalk.yellow(`Waiting${dots.padEnd(3)} (${remaining} checks remaining)`)}\r`)

                if (attempts >= maxAttempts) {
                    clearInterval(pollTimer)
                    console.log('')
                    console.error(chalk.red('✗ Pairing timeout - QR code expired'))
                    console.log(chalk.gray('Please try again with: hapi auth qr-pair\n'))
                    process.exit(1)
                }
            } catch (error) {
                if (axios.isAxiosError(error) && error.response?.status === 400) {
                    clearInterval(pollTimer)
                    console.log('')
                    console.error(chalk.red('✗ Pairing token expired'))
                    process.exit(1)
                }
                // Continue polling on other errors
            }
        }, pollInterval)

        // Handle Ctrl+C gracefully
        process.on('SIGINT', () => {
            clearInterval(pollTimer)
            console.log('\n')
            console.log(chalk.yellow('Pairing cancelled'))
            process.exit(0)
        })

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error(chalk.red(`Failed to initiate pairing: ${error.message}`))
            if (error.code === 'ECONNREFUSED') {
                console.log(chalk.gray(`\nMake sure the server is running at ${configuration.serverUrl}`))
            }
        } else {
            console.error(chalk.red('Unexpected error during pairing'))
            console.error(error)
        }
        process.exit(1)
    }
}
