import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { getDefaultRepository } from '../utils/persistence/LocalStorageWorkflowRepository'
import { getHttpRepository } from '../utils/persistence/HttpWorkflowRepository'
import type { WorkflowRepository } from '../utils/persistence/WorkflowRepository'
import type { WorkflowSummary, WorkflowRunDetail, WorkflowRunSummary, PersistedWorkflow, PersistedNode } from '../types/persistence'

export default function Sequences() {
	// Force HTTP repository when backend is available
	const repo: WorkflowRepository = useMemo(() => {
		// Check multiple possible environment variable sources
		const beBase = (import.meta as any)?.env?.VITE_SEQUENCE_BE_BASE_URL || 
					  (window as any)?.SEQUENCE_BE_BASE_URL ||
					  'http://localhost:3000' // Default to localhost:3000 for development
		
		console.log('Backend base URL detected:', beBase)
		console.log('Using HTTP repository for Sequences page')
		return getHttpRepository()
	}, [])
	const [items, setItems] = useState<WorkflowSummary[]>([])
	const [runsByWorkflow, setRunsByWorkflow] = useState<Record<string, WorkflowRunSummary[]>>({})
	const [runForm, setRunForm] = useState<{ workflowId: string; fields: Array<{ nodeId: string; key: string; label: string }>; values: Record<string, string> } | null>(null)
	const [logsModal, setLogsModal] = useState<{ workflowId: string; run: WorkflowRunDetail } | null>(null)
	const [loadingRun, setLoadingRun] = useState(false)
	const [pollingTimeouts, setPollingTimeouts] = useState<Record<string, number>>({})
	const navigate = useNavigate()

	async function load() {
		const list = await repo.list()
		setItems(list)
	}

	function getRootInputFields(wf: PersistedWorkflow): Array<{ nodeId: string; key: string; label: string }> {
		const incoming = new Map<string, number>()
		for (const n of wf.nodes) incoming.set(n.id, 0)
		for (const e of wf.edges) incoming.set(e.targetId, (incoming.get(e.targetId) ?? 0) + 1)
		const roots: PersistedNode[] = wf.nodes.filter(n => n.base.type === 'inputText' && (incoming.get(n.id) ?? 0) === 0)
		const fields: Array<{ nodeId: string; key: string; label: string }> = []
		for (const n of roots) {
			const arr = ((n.base as any).config?.fields ?? []) as Array<{ id: string; key: string; label: string }>
			for (const f of arr) fields.push({ nodeId: n.id, key: f.key, label: f.label })
		}
		return fields
	}

	async function openRunForm(workflowId: string) {
		const wf = await repo.get(workflowId)
		if (!wf) return
		const fields = getRootInputFields(wf)
		const initial: Record<string, any> = {}
		setRunForm({ workflowId, fields, values: initial })
	}

	async function openRunLogs(workflowId: string) {
		try {
			setLoadingRun(true)
			const runs = await (repo.listRuns?.(workflowId) ?? Promise.resolve([]))
			setRunsByWorkflow(prev => ({ ...prev, [workflowId]: runs }))
			if (runs && runs.length > 0) {
				const detail = await (repo.getRun?.(workflowId, runs[0].id) as Promise<WorkflowRunDetail>)
				setLogsModal({ workflowId, run: detail })
			} else {
				setLogsModal(null)
			}
		} finally {
			setLoadingRun(false)
		}
	}

	// Real-time polling function for workflow runs
	const startRealTimePolling = (workflowId: string, runId: string) => {
		console.log('Starting real-time polling for:', { workflowId, runId })
		console.log('Current logsModal:', logsModal)
		console.log('repo.getRunStatus available:', !!repo.getRunStatus)
		
		let pollCount = 0
		const maxPolls = 150 // 5 minutes max
		
		const poll = async () => {
			try {
				console.log(`Poll attempt ${pollCount + 1} for run ${runId}`)
				if (repo.getRunStatus) {
					console.log('Calling getRunStatus...')
					const status = await repo.getRunStatus(workflowId, runId)
					console.log('Got status:', status)
					
					// Always update the modal if we're polling this run
					// Use functional state update to get current modal state
					setLogsModal(currentModal => {
						// Only update if the modal is showing this specific run
						if (currentModal && currentModal.run.id === runId) {
							console.log('Updating logs modal with new status')
							const updatedRun: WorkflowRunDetail = {
								id: runId,
								status: status.status as any,
								startedAt: new Date(status.startedAt).getTime(),
								finishedAt: status.finishedAt ? new Date(status.finishedAt).getTime() : undefined,
								logs: status.logs.map(log => ({
									id: log.id,
									type: log.type as any,
									message: log.message,
									timestamp: new Date(log.timestamp).getTime(),
									nodePersistedId: log.nodeId || undefined,
									data: undefined
								}))
							}
							
							return { workflowId, run: updatedRun }
						} else {
							console.log('Modal not showing this run or no modal, not updating')
							return currentModal
						}
					})
					
					// Stop polling if workflow is complete
					if (status.status === 'succeeded' || status.status === 'failed') {
						console.log('Workflow completed with status:', status.status)
						// Clear timeout
						if (pollingTimeouts[runId]) {
							clearTimeout(pollingTimeouts[runId])
							setPollingTimeouts(prev => {
								const newTimeouts = { ...prev }
								delete newTimeouts[runId]
								return newTimeouts
							})
						}
						return
					}
					
					// Continue polling
					pollCount++
					if (pollCount < maxPolls) {
						console.log('Scheduling next poll in 2 seconds...')
						const timeoutId = setTimeout(poll, 2000)
						setPollingTimeouts(prev => ({ ...prev, [runId]: timeoutId }))
					} else {
						console.log('Max polls reached, stopping polling')
					}
				} else {
					console.error('repo.getRunStatus is not available')
				}
			} catch (error) {
				console.error('Polling error:', error)
				pollCount++
				if (pollCount < maxPolls) {
					const timeoutId = setTimeout(poll, 2000)
					setPollingTimeouts(prev => ({ ...prev, [runId]: timeoutId }))
				}
			}
		}
		
		// Start polling immediately
		poll()
	}

	// Cleanup polling on unmount
	useEffect(() => {
		return () => {
			Object.values(pollingTimeouts).forEach(timeoutId => clearTimeout(timeoutId))
		}
	}, [pollingTimeouts])

	useEffect(() => { load() }, [])

	return (
		<div>
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-semibold tracking-tight text-slate-900">Sequences</h2>
				<Link to="/sequences/new" className="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700">
					Create Sequence
				</Link>
			</div>
			<p className="mt-2 text-slate-600">Create, edit, and monitor your workflow sequences.</p>
			<div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{items.map((seq) => (
					<div key={seq.id} className="rounded-lg border border-slate-200 p-4">
						<div className="h-28 bg-slate-100 rounded mb-3" />
						<div className="font-medium">{seq.name}</div>
						<div className="text-xs text-slate-500">Updated {new Date(seq.updatedAt).toLocaleString()}</div>
						<div className="mt-3 flex items-center gap-2 text-sm">
							<button className="px-2 py-1 rounded border" onClick={() => navigate(`/sequences/${seq.id}`)}>Edit</button>
							<button className="px-2 py-1 rounded border" onClick={() => openRunForm(seq.id)}>Run</button>
							<button className="px-2 py-1 rounded border" onClick={() => openRunLogs(seq.id)}>Runs</button>
							<button className="px-2 py-1 rounded border text-red-600" onClick={async () => { await repo.delete(seq.id); load() }}>Delete</button>
						</div>
					</div>
				))}
				{items.length === 0 && (
					<div className="text-sm text-slate-500">No sequences yet. Create one to get started.</div>
				)}
			</div>

			{runForm && (
				<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-xl border border-slate-200 w-[720px] max-w-[98vw]">
						<div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
							<div className="text-sm font-medium">Run Workflow</div>
							<button className="text-slate-500 text-sm" onClick={() => setRunForm(null)}>Close</button>
						</div>
						<div className="p-4 space-y-3">
							{runForm.fields.length === 0 && <div className="text-xs text-slate-500">No input fields required.</div>}
							{runForm.fields.map(f => (
								<label key={`${f.nodeId}:${f.key}`} className="block">
									<div className="text-xs text-slate-600 mb-1">{f.label}</div>
									<input className="w-full px-2 py-1 border rounded text-sm" value={runForm.values[f.key] ?? ''} onChange={e => setRunForm(prev => prev ? { ...prev, values: { ...prev.values, [f.key]: e.target.value } } : prev)} />
								</label>
							))}
							<div className="pt-2">
								<button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={async () => {
									setLoadingRun(true)
									try {
										// Use new async execution method if available
										if (repo.executeAsync) {
											const data = await repo.executeAsync(runForm.workflowId, runForm.values)
											// refresh runs and immediately show the run (even if still running)
											const runs = await (repo.listRuns?.(runForm.workflowId) ?? Promise.resolve([]))
											setRunsByWorkflow(prev => ({ ...prev, [runForm.workflowId]: runs }))
											
											// Create a mock detail for the new run to show it's running
											const mockDetail: WorkflowRunDetail = {
												id: data.runId,
												status: 'running',
												startedAt: Date.now(),
												finishedAt: undefined,
												logs: [
													{
														id: 'initial',
														type: 'system',
														message: '🚀 Workflow execution started - polling for real-time updates...',
														timestamp: Date.now(),
														nodePersistedId: undefined,
														data: undefined
													}
												]
											}
											
											setRunForm(null)
											// Set the modal BEFORE starting polling
											setLogsModal({ workflowId: runForm.workflowId, run: mockDetail })
											
											// Use setTimeout to ensure state update completes before polling starts
											setTimeout(() => {
												startRealTimePolling(runForm.workflowId, data.runId)
											}, 100)
										} else {
											// Fallback to old method
											const data = await repo.execute(runForm.workflowId, runForm.values)
											const runs = await (repo.listRuns?.(runForm.workflowId) ?? Promise.resolve([]))
											setRunsByWorkflow(prev => ({ ...prev, [runForm.workflowId]: runs }))
											const detail = await (repo.getRun?.(runForm.workflowId, data.runId) as Promise<WorkflowRunDetail>)
											setRunForm(null)
											setLogsModal({ workflowId: runForm.workflowId, run: detail })
										}
									} finally {
										setLoadingRun(false)
									}
								}}>Run</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{logsModal && (
				<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-xl border border-slate-200 w-[980px] max-w-[98vw]">
						<div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
							<div className="text-sm font-medium">Run History</div>
							<button className="text-slate-500 text-sm" onClick={() => setLogsModal(null)}>Close</button>
						</div>
						<div className="p-4 grid grid-cols-3 gap-4 min-h-[420px]">
							<aside className="col-span-1 border border-slate-200 rounded p-2">
								<div className="text-xs font-medium mb-2">Recent Runs</div>
								<div className="space-y-1 max-h-[420px] overflow-auto">
									{(runsByWorkflow[logsModal.workflowId] || []).map((r) => (
										<div key={r.id} className={`px-2 py-1 rounded cursor-pointer ${logsModal.run?.id === r.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`} onClick={async () => {
											setLoadingRun(true)
											try {
												const detail = await (repo.getRun as any)(logsModal.workflowId, r.id)
												setLogsModal({ workflowId: logsModal.workflowId, run: detail })
											} finally {
												setLoadingRun(false)
											}
										}}>
											<div className="text-xs">{new Date(r.startedAt).toLocaleString()}</div>
											<div className="text-[11px] text-slate-500">{r.status}{r.finishedAt ? ` • ${new Date(r.finishedAt).toLocaleTimeString()}` : ''}</div>
										</div>
									))}
									{(runsByWorkflow[logsModal.workflowId] || []).length === 0 && (
										<div className="text-xs text-slate-500">No runs yet.</div>
									)}
								</div>
							</aside>
							<div className="col-span-2">
								<div className="text-sm font-medium mb-2">Logs</div>
								<div className="border rounded bg-slate-50 p-2 max-h-[420px] overflow-auto">
									{loadingRun && <div className="text-xs text-slate-500">Loading...</div>}
									{!loadingRun && (!logsModal.run || logsModal.run.logs.length === 0) && (
										<div className="text-xs text-slate-500">No logs.</div>
									)}
									{!loadingRun && logsModal.run && logsModal.run.logs.map(l => (
										<div key={l.id} className="flex items-start gap-2 text-xs mb-1">
											<div className={`mt-0.5 h-2 w-2 rounded-full ${l.type === 'error' ? 'bg-red-500' : l.type === 'system' ? 'bg-slate-400' : 'bg-emerald-500'}`}></div>
											<div>
												<div className="text-[11px] text-slate-500">{new Date(l.timestamp).toLocaleTimeString()} {l.nodePersistedId ? `• Node ${l.nodePersistedId}` : ''}</div>
												<div className="whitespace-pre-wrap">{l.message}</div>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
} 