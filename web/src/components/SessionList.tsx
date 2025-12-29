import type { SessionSummary } from '@/types/api'

function PlusIcon(props: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={props.className}
        >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    )
}

function BulbIcon(props: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={props.className}
        >
            <path d="M9 18h6" />
            <path d="M10 22h4" />
            <path d="M12 2a7 7 0 0 0-4 12c.6.6 1 1.2 1 2h6c0-.8.4-1.4 1-2a7 7 0 0 0-4-12Z" />
        </svg>
    )
}

function getSessionTitle(session: SessionSummary): string {
    if (session.metadata?.name) {
        return session.metadata.name
    }
    if (session.metadata?.summary?.text) {
        return session.metadata.summary.text
    }
    if (session.metadata?.path) {
        const parts = session.metadata.path.split('/').filter(Boolean)
        return parts.length > 0 ? parts[parts.length - 1] : session.id.slice(0, 8)
    }
    return session.id.slice(0, 8)
}

function getTodoProgress(session: SessionSummary): { completed: number; total: number } | null {
    if (!session.todoProgress) return null
    if (session.todoProgress.completed === session.todoProgress.total) return null
    return session.todoProgress
}

function getAgentLabel(session: SessionSummary): string {
    const flavor = session.metadata?.flavor?.trim()
    if (flavor) return flavor
    return 'unknown'
}

function getModelLabel(session: SessionSummary): string {
    return session.modelMode ?? 'default'
}

function formatRelativeTime(value: number): string | null {
    const ms = value < 1_000_000_000_000 ? value * 1000 : value
    if (!Number.isFinite(ms)) return null
    const delta = Date.now() - ms
    if (delta < 60_000) return 'just now'
    const minutes = Math.floor(delta / 60_000)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return new Date(ms).toLocaleDateString()
}

function getLastSeenLabel(session: SessionSummary): string | null {
    if (session.active) return null
    const lastSeen = formatRelativeTime(session.activeAt ?? session.updatedAt)
    if (!lastSeen) return null
    return `last seen ${lastSeen}`
}

export function SessionList(props: {
    sessions: SessionSummary[]
    onSelect: (sessionId: string) => void
    onNewSession: () => void
    onRefresh: () => void
    isLoading: boolean
    renderHeader?: boolean
}) {
    const { renderHeader = true } = props

    return (
        <div className="mx-auto w-full max-w-content flex flex-col">
            {renderHeader ? (
                <div className="flex items-center justify-between px-4 py-2">
                    <div className="text-sm text-[var(--app-hint)] font-medium">
                        {props.sessions.length} sessions
                    </div>
                    <button
                        type="button"
                        onClick={props.onNewSession}
                        className="session-list-new-button p-2.5 rounded-full text-[var(--app-link)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="New Session"
                        aria-label="Create new session"
                    >
                        <PlusIcon className="h-6 w-6" />
                    </button>
                </div>
            ) : null}

            <div className="flex flex-col divide-y divide-[var(--app-divider)]">
                {props.sessions.map((s) => (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => props.onSelect(s.id)}
                        className="session-list-item flex w-full flex-col gap-2 px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-link)] min-h-[88px] active:bg-[var(--app-subtle-bg)]"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                    className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${s.active ? 'bg-[var(--app-badge-success-text)]' : 'bg-[var(--app-hint)]'}`}
                                    aria-hidden="true"
                                />
                                <div className="truncate text-base font-medium leading-snug">
                                    {getSessionTitle(s)}
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0 text-xs">
                                {(() => {
                                    const progress = getTodoProgress(s)
                                    if (!progress) return null
                                    return (
                                        <span className="flex items-center gap-1.5 text-[var(--app-hint)]">
                                            <BulbIcon className="h-3.5 w-3.5" />
                                            <span className="font-medium">{progress.completed}/{progress.total}</span>
                                        </span>
                                    )
                                })()}
                                {s.pendingRequestsCount > 0 ? (
                                    <span className="text-[var(--app-badge-warning-text)] font-medium px-1.5 py-0.5 bg-[var(--app-badge-warning-bg)] rounded">
                                        {s.pendingRequestsCount}
                                    </span>
                                ) : null}
                            </div>
                        </div>
                        <div className="truncate text-sm text-[var(--app-hint)] leading-relaxed">
                            {s.metadata?.path ?? s.id}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[var(--app-hint)]">
                            <span className="font-medium">❖ {getAgentLabel(s)}</span>
                            <span>model: {getModelLabel(s)}</span>
                            {s.metadata?.worktree?.branch ? (
                                <span className="truncate max-w-[200px]">worktree: {s.metadata.worktree.branch}</span>
                            ) : null}
                            {(() => {
                                const lastSeen = getLastSeenLabel(s)
                                if (!lastSeen) return null
                                return <span>{lastSeen}</span>
                            })()}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )
}
