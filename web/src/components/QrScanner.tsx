import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@/components/Spinner'

interface QrScannerProps {
    isOpen: boolean
    onClose: () => void
    onScanSuccess: (pairingUrl: string) => void
}

export function QrScanner({ isOpen, onClose, onScanSuccess }: QrScannerProps) {
    const [isScanning, setIsScanning] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const isCleaningUp = useRef(false)

    useEffect(() => {
        if (!isOpen) {
            return
        }

        let mounted = true
        isCleaningUp.current = false

        const initScanner = async () => {
            try {
                setError(null)
                setIsScanning(true)

                const scanner = new Html5Qrcode('qr-reader')
                scannerRef.current = scanner

                await scanner.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 }
                    },
                    (decodedText) => {
                        if (mounted && !isCleaningUp.current) {
                            // Check if it's a valid hapi pairing URL
                            if (decodedText.startsWith('hapi://pair?token=')) {
                                onScanSuccess(decodedText)
                                cleanup()
                            } else {
                                setError('Invalid QR code. Please scan a HAPI pairing QR code.')
                            }
                        }
                    },
                    undefined
                )
            } catch (err) {
                if (mounted) {
                    console.error('QR Scanner error:', err)
                    setError('Failed to start camera. Please check camera permissions.')
                    setIsScanning(false)
                }
            }
        }

        const cleanup = async () => {
            if (isCleaningUp.current) return
            isCleaningUp.current = true

            if (scannerRef.current) {
                try {
                    const state = await scannerRef.current.getState()
                    if (state === 2) { // Scanner.STATE_SCANNING
                        await scannerRef.current.stop()
                    }
                } catch (err) {
                    console.error('Error stopping scanner:', err)
                }
                scannerRef.current = null
            }
            setIsScanning(false)
        }

        initScanner()

        return () => {
            mounted = false
            cleanup()
        }
    }, [isOpen, onScanSuccess])

    const handleClose = () => {
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Scan QR Code</DialogTitle>
                    <DialogDescription>
                        Point your camera at the QR code displayed on your CLI
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div 
                        id="qr-reader" 
                        className="w-full rounded-lg overflow-hidden bg-black"
                        style={{ minHeight: '300px' }}
                    />

                    {error && (
                        <div className="text-sm text-red-500 text-center">
                            {error}
                        </div>
                    )}

                    {isScanning && !error && (
                        <div className="text-sm text-[var(--app-hint)] text-center">
                            Position the QR code within the frame
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
