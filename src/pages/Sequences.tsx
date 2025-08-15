import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
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
		<div className="px-6 py-8 bg-gray-50 min-h-full">
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Sequences</h1>
					<p className="mt-2 text-lg text-gray-600">Create, edit, and monitor your workflow sequences.</p>
				</div>
				<Link 
					to="/sequences/new" 
					className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
					</svg>
					Create Sequence
				</Link>
			</div>

			{items.length === 0 ? (
				<div className="text-center py-12">
					<svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
					</svg>
					<h3 className="mt-2 text-sm font-medium text-gray-900">No sequences</h3>
					<p className="mt-1 text-sm text-gray-500">Get started by creating your first workflow sequence.</p>
					<div className="mt-6">
						<Link 
							to="/sequences/new" 
							className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
							</svg>
							Create your first sequence
						</Link>
					</div>
				</div>
			) : (
				<div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
					<div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
						<div className="flex items-center justify-between">
							<h2 className="text-lg font-medium text-gray-900">All Sequences</h2>
							<span className="text-sm text-gray-500">{items.length} sequence{items.length !== 1 ? 's' : ''}</span>
						</div>
					</div>
					<div className="divide-y divide-gray-200">
						{items.map((seq) => (
							<div key={seq.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
								<div className="flex items-center justify-between">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-3">
											<div className="flex-shrink-0">
												<div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
													<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
													</svg>
												</div>
											</div>
											<div className="flex-1 min-w-0">
												<h3 className="text-lg font-medium text-gray-900 truncate">{seq.name}</h3>
												<div className="flex items-center gap-4 mt-1">
													<span className="text-sm text-gray-500">
														Updated {new Date(seq.updatedAt).toLocaleDateString()} at {new Date(seq.updatedAt).toLocaleTimeString()}
													</span>
													<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
														Active
													</span>
												</div>
											</div>
										</div>
									</div>
									<div className="flex items-center gap-2 ml-4">
										<button 
											onClick={() => navigate(`/sequences/${seq.id}`)}
											className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
										>
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
											Edit
										</button>
										<button 
											onClick={() => openRunForm(seq.id)}
											className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
										>
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M15 14h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
											Run
										</button>
										<button 
											onClick={() => openRunLogs(seq.id)}
											className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
										>
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
											</svg>
											Runs
										</button>
										<button 
											onClick={async () => { await repo.delete(seq.id); load() }}
											className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
										>
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
											Delete
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{runForm && (
				<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-2xl">
						{/* Header */}
						<div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
										<svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M15 14h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
									</div>
									<div>
										<h2 className="text-xl font-semibold text-gray-900">Run Workflow</h2>
										<p className="text-sm text-gray-500">Configure parameters and execute your sequence</p>
									</div>
								</div>
								<button 
									onClick={() => setRunForm(null)}
									className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
								>
									<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>
						</div>

						{/* Content */}
						<div className="p-6">
							{runForm.fields.length === 0 ? (
								<div className="text-center py-8">
									<svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
									</svg>
									<h3 className="mt-2 text-sm font-medium text-gray-900">Ready to run</h3>
									<p className="mt-1 text-sm text-gray-500">This workflow doesn't require any input parameters.</p>
								</div>
							) : (
								<div className="space-y-6">
									<div>
										<h3 className="text-lg font-medium text-gray-900 mb-2">Input Parameters</h3>
										<p className="text-sm text-gray-600 mb-4">Configure the input values for your workflow execution.</p>
									</div>
									
									<div className="space-y-4">
										{runForm.fields.map(f => (
											<div key={`${f.nodeId}:${f.key}`} className="space-y-2">
												<label className="block text-sm font-medium text-gray-700">
													{f.label}
												</label>
												<div className="relative">
													<input 
														type="text"
														className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
														placeholder={`Enter ${f.label.toLowerCase()}...`}
														value={runForm.values[f.key] ?? ''} 
														onChange={e => setRunForm(prev => prev ? { ...prev, values: { ...prev.values, [f.key]: e.target.value } } : prev)} 
													/>
													<div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
														<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
														</svg>
													</div>
												</div>
											</div>
										))}
									</div>
								</div>
							)}
						</div>

						{/* Footer */}
						<div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
							<div className="text-sm text-gray-500">
								Workflow will execute immediately after clicking run
							</div>
							<div className="flex items-center gap-3">
								<button 
									onClick={() => setRunForm(null)}
									className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
								>
									Cancel
								</button>
								<button 
									onClick={async () => {
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
									}}
									disabled={loadingRun}
									className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{loadingRun ? (
										<>
											<svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
												<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
												<path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
											</svg>
											Running...
										</>
									) : (
										<>
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M15 14h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
											Run Workflow
										</>
									)}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{logsModal && (
				<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-6xl max-h-[90vh] flex flex-col">
						{/* Header */}
						<div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
										<svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
										</svg>
									</div>
									<div>
										<h2 className="text-xl font-semibold text-gray-900">Workflow Runs</h2>
										<p className="text-sm text-gray-500">Monitor execution history and logs</p>
									</div>
								</div>
								<button 
									onClick={() => setLogsModal(null)}
									className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
								>
									<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>
						</div>

						{/* Content */}
						<div className="flex-1 grid grid-cols-12 gap-6 p-6 min-h-0">
							{/* Runs Sidebar */}
							<aside className="col-span-4 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
								<div className="px-4 py-3 bg-white border-b border-gray-200">
									<h3 className="text-sm font-semibold text-gray-900">Recent Runs</h3>
									<p className="text-xs text-gray-500 mt-1">{(runsByWorkflow[logsModal.workflowId] || []).length} total runs</p>
								</div>
								<div className="p-2 max-h-96 overflow-auto">
									{(runsByWorkflow[logsModal.workflowId] || []).length === 0 ? (
										<div className="text-center py-8">
											<svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
											</svg>
											<p className="text-xs text-gray-500 mt-2">No runs yet</p>
										</div>
									) : (
										<div className="space-y-2">
											{(runsByWorkflow[logsModal.workflowId] || []).map((r) => {
												const isSelected = logsModal.run?.id === r.id
												const statusColor = r.status === 'succeeded' ? 'bg-green-100 text-green-800' : 
																  r.status === 'failed' ? 'bg-red-100 text-red-800' : 
																  r.status === 'running' ? 'bg-blue-100 text-blue-800' : 
																  'bg-gray-100 text-gray-800'
												const statusIcon = r.status === 'succeeded' ? 
													<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> :
													r.status === 'failed' ? 
													<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg> :
													r.status === 'running' ? 
													<svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> :
													<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>

												return (
													<div 
														key={r.id} 
														className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
															isSelected 
																? 'bg-blue-50 border-2 border-blue-200 shadow-sm' 
																: 'bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
														}`}
														onClick={async () => {
															setLoadingRun(true)
															try {
																const detail = await (repo.getRun as any)(logsModal.workflowId, r.id)
																setLogsModal({ workflowId: logsModal.workflowId, run: detail })
															} finally {
																setLoadingRun(false)
															}
														}}
													>
														<div className="flex items-center justify-between mb-2">
															<span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
																{statusIcon}
																{r.status}
															</span>
															<span className="text-xs text-gray-500">
																{r.finishedAt ? `${Math.round((r.finishedAt - r.startedAt) / 1000)}s` : 'Running...'}
															</span>
														</div>
														<div className="text-xs text-gray-600">
															Started: {new Date(r.startedAt).toLocaleDateString()} at {new Date(r.startedAt).toLocaleTimeString()}
														</div>
														{r.finishedAt && (
															<div className="text-xs text-gray-500">
																Finished: {new Date(r.finishedAt).toLocaleTimeString()}
															</div>
														)}
													</div>
												)
											})}
										</div>
									)}
								</div>
							</aside>

							{/* Logs Panel */}
							<div className="col-span-8 flex flex-col min-h-0">
								<div className="flex items-center justify-between mb-4">
									<div className="flex items-center gap-3">
										<h3 className="text-lg font-semibold text-gray-900">Execution Logs</h3>
										{logsModal.run && (
											<span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
												logsModal.run.status === 'succeeded' ? 'bg-green-100 text-green-800' : 
												logsModal.run.status === 'failed' ? 'bg-red-100 text-red-800' : 
												logsModal.run.status === 'running' ? 'bg-blue-100 text-blue-800' : 
												'bg-gray-100 text-gray-800'
											}`}>
												{logsModal.run.status === 'running' && (
													<svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
														<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
														<path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
													</svg>
												)}
												{logsModal.run.status}
											</span>
										)}
									</div>
									{logsModal.run && (
										<div className="text-sm text-gray-500">
											Run ID: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{logsModal.run.id}</code>
										</div>
									)}
								</div>

								<div className="flex-1 bg-gray-900 rounded-lg border border-gray-300 overflow-hidden">
									<div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
										<div className="flex items-center gap-2">
											<div className="flex gap-1.5">
												<div className="w-3 h-3 bg-red-500 rounded-full"></div>
												<div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
												<div className="w-3 h-3 bg-green-500 rounded-full"></div>
											</div>
											<span className="text-gray-300 text-sm font-mono">workflow-logs</span>
										</div>
									</div>
									<div className="p-4 max-h-96 overflow-auto font-mono text-sm">
										{loadingRun && (
											<div className="flex items-center gap-2 text-gray-400">
												<svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
													<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
													<path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
												</svg>
												Loading logs...
											</div>
										)}
										{!loadingRun && (!logsModal.run || logsModal.run.logs.length === 0) && (
											<div className="text-gray-500 text-center py-8">
												<svg className="mx-auto h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
												</svg>
												No logs available
											</div>
										)}
										{!loadingRun && logsModal.run && logsModal.run.logs.map((l, index) => {
											const logColor = l.type === 'error' ? 'text-red-400' : 
															l.type === 'system' ? 'text-blue-400' : 
															'text-green-400'
											const logIcon = l.type === 'error' ? '❌' : 
														   l.type === 'system' ? '🔧' : 
														   '✅'
											
											return (
												<div key={l.id} className="mb-3 last:mb-0">
													<div className="flex items-start gap-3">
														<span className="text-gray-500 text-xs mt-1 w-16 flex-shrink-0">
															{new Date(l.timestamp).toLocaleTimeString()}
														</span>
														<div className="flex-1 min-w-0">
															<div className="flex items-center gap-2 mb-1">
																<span className="text-sm">{logIcon}</span>
																<span className={`text-xs font-medium ${logColor}`}>
																	{l.type.toUpperCase()}
																</span>
																{l.nodePersistedId && (
																	<span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
																		Node: {l.nodePersistedId}
																	</span>
																)}
															</div>
															<div className="text-gray-300 whitespace-pre-wrap break-words">
																{l.message}
															</div>
														</div>
													</div>
													{index < logsModal.run.logs.length - 1 && (
														<div className="border-l border-gray-700 ml-8 h-2 mt-2"></div>
													)}
												</div>
											)
										})}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
} 