import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { ReactFlow, Background, BackgroundVariant, Controls, useEdgesState, useNodesState, addEdge, type Node as FlowNode, type Edge, type Connection, ReactFlowProvider, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { InputTextNodeData, DecisionNode, NotificationNode, ApiCallNode, DelayNode, IfElseNode, WorkflowNodeData } from '../types/workflow'
import NodeEditModal from '../components/nodes/NodeEditModal'
import DecisionNodeEditModal from '../components/nodes/DecisionNodeEditModal'
import IfElseNodeEditModal from '../components/nodes/IfElseNodeEditModal'
import NotificationNodeEditModal from '../components/nodes/NotificationNodeEditModal'
import ApiCallNodeEditModal from '../components/nodes/ApiCallNodeEditModal'
import DelayNodeEditModal from '../components/nodes/DelayNodeEditModal'
import { useParams, useNavigate } from 'react-router-dom'
import { getDefaultRepository } from '../utils/persistence/LocalStorageWorkflowRepository'
import type { WorkflowRepository } from '../utils/persistence/WorkflowRepository'
import { toPersistedWorkflow, fromPersistedWorkflow, validateWorkflowForSave } from '../utils/workflow/adapter'
import { executeWorkflow } from '../utils/workflow/runner'
import { applyConnectionEffects, createNodeOnDrop, getReactFlowNodeTypes } from '../utils/workflow/registry'
import { inputFieldsToJsonSchema } from '../utils/schema'

function BuilderCanvas() {
	const nodeTypes = useMemo(() => getReactFlowNodeTypes(), [])
	const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode<any>>([])
	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
	const { screenToFlowPosition } = useReactFlow()
	const [editingInputNodeId, setEditingInputNodeId] = useState<string | null>(null)
	const [editingDecisionNodeId, setEditingDecisionNodeId] = useState<string | null>(null)
	const [editingIfElseNodeId, setEditingIfElseNodeId] = useState<string | null>(null)
	const [editingNotificationNodeId, setEditingNotificationNodeId] = useState<string | null>(null)
	const [editingApiCallNodeId, setEditingApiCallNodeId] = useState<string | null>(null)
	const [editingDelayNodeId, setEditingDelayNodeId] = useState<string | null>(null)

	const { id } = useParams()
	const navigate = useNavigate()
	const repo: WorkflowRepository = useMemo(() => getDefaultRepository(), [])
	const [workflowName, setWorkflowName] = useState<string>('Untitled Workflow')
	const [workflowId, setWorkflowId] = useState<string | null>(null)
	const [createdAt, setCreatedAt] = useState<number | null>(null)
	const [runOutput, setRunOutput] = useState<string>('')
	const [isRunning, setIsRunning] = useState<boolean>(false)
	const [currentRunId, setCurrentRunId] = useState<string | null>(null)
	const [runStatus, setRunStatus] = useState<string>('')
	const [pollTimeoutId, setPollTimeoutId] = useState<number | null>(null)
	const logsRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		let isMounted = true
		;(async () => {
			if (id) {
				const wf = await repo.get(id)
				if (wf && isMounted) {
					const { nodes, edges } = fromPersistedWorkflow(wf)
					
					// Re-apply connection effects to ensure schemas are properly propagated
					let updatedNodes = nodes
					for (const edge of edges) {
						const connection = { 
							source: edge.source, 
							target: edge.target, 
							sourceHandle: edge.sourceHandle ?? null, 
							targetHandle: edge.targetHandle ?? null 
						}
						updatedNodes = applyConnectionEffects(updatedNodes as Array<FlowNode<WorkflowNodeData>>, connection)
					}
					
					setNodes(updatedNodes)
					setEdges(edges)
					setWorkflowName(wf.name)
					setWorkflowId(wf.id)
					setCreatedAt(wf.createdAt)
					// Clear input node values when loading a workflow
					setInputNodeValues({})
				}
			} else {
				setNodes([])
				setEdges([])
				setWorkflowName('Untitled Workflow')
				setWorkflowId(null)
				setCreatedAt(null)
				// Clear input node values when creating new workflow
				setInputNodeValues({})
			}
		})()
		return () => { isMounted = false }
	}, [id, repo, setNodes, setEdges])

	// Cleanup polling on unmount
	useEffect(() => {
		return () => {
			if (pollTimeoutId) {
				clearTimeout(pollTimeoutId)
			}
		}
	}, [pollTimeoutId])

	const openEditor = useCallback((nodeId: string) => {
		const n = nodes.find(n => n.id === nodeId)
		if (!n) return
		if (n.type === 'inputText') setEditingInputNodeId(nodeId)
		if (n.type === 'decision') setEditingDecisionNodeId(nodeId)
		if (n.type === 'ifElse') setEditingIfElseNodeId(nodeId)
		if (n.type === 'notification') setEditingNotificationNodeId(nodeId)
		if (n.type === 'apiCall') setEditingApiCallNodeId(nodeId)
		if (n.type === 'delay') setEditingDelayNodeId(nodeId)
	}, [nodes])

	// Store current input values from all input nodes
	const [inputNodeValues, setInputNodeValues] = useState<Record<string, Record<string, unknown>>>({})

	// Callback for input nodes to report their current values
	const updateInputNodeValues = useCallback((nodeId: string, values: Record<string, unknown>) => {
		setInputNodeValues(prev => ({ ...prev, [nodeId]: values }))
	}, [])

	// Remove live data propagation - only attach editor callbacks and value update callback
	const attachEditor = useCallback((n: FlowNode<any>): FlowNode<any> => ({
		...n,
		data: { 
			...n.data, 
			openEditor,
			updateNodeValues: n.type === 'inputText' ? updateInputNodeValues : undefined
		}
	}), [openEditor, updateInputNodeValues])

	const onConnect = useCallback((connection: Connection) => {
		setEdges((eds) => addEdge({ ...connection, animated: true }, eds))
		setNodes((prev) => applyConnectionEffects(prev as Array<FlowNode<WorkflowNodeData>>, connection))
	}, [setEdges, setNodes])

	const onEdgesChangeWithSchema = useCallback((changes: any) => {
		onEdgesChange(changes)
	}, [onEdgesChange])

	const onDragOver = useCallback((event: React.DragEvent) => {
		event.preventDefault()
		event.dataTransfer.dropEffect = 'move'
	}, [])

	const onDrop = useCallback((event: React.DragEvent) => {
		event.preventDefault()
		const type = event.dataTransfer.getData('application/reactflow')
		const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
		const node = createNodeOnDrop(type, position, openEditor)
		if (node) setNodes((prev) => [...prev, node])
	}, [screenToFlowPosition, setNodes, openEditor])

	const editingInputNode = useMemo(() => nodes.find(n => n.id === editingInputNodeId) ?? null, [nodes, editingInputNodeId])
	const editingDecisionNode = useMemo(() => nodes.find(n => n.id === editingDecisionNodeId) ?? null, [nodes, editingDecisionNodeId])
	const editingIfElseNode = useMemo(() => nodes.find(n => n.id === editingIfElseNodeId) ?? null, [nodes, editingIfElseNodeId])
	const editingNotificationNode = useMemo(() => nodes.find(n => n.id === editingNotificationNodeId) ?? null, [nodes, editingNotificationNodeId])
	const editingApiCallNode = useMemo(() => nodes.find(n => n.id === editingApiCallNodeId) ?? null, [nodes, editingApiCallNodeId])
	const editingDelayNode = useMemo(() => nodes.find(n => n.id === editingDelayNodeId) ?? null, [nodes, editingDelayNodeId])

	async function handleSave() {
		const check = validateWorkflowForSave(nodes as Array<FlowNode<WorkflowNodeData>>, edges)
		if (!check.ok) {
			alert(check.errors.join('\n'))
			return
		}
		const payload = toPersistedWorkflow(nodes as Array<FlowNode<WorkflowNodeData>>, edges)
		if (!workflowId) {
			const created = await repo.create({ name: workflowName, workflow: payload })
			setWorkflowId(created.id)
			setCreatedAt(created.createdAt)
			navigate(`/sequences/${created.id}`)
		} else {
			const existing = await repo.get(workflowId)
			await repo.update({ id: workflowId, name: workflowName, ...payload, createdAt: existing?.createdAt ?? createdAt ?? Date.now(), updatedAt: Date.now() })
			alert('Saved')
		}
	}

	async function handleRun() {
		const payload = toPersistedWorkflow(nodes as Array<FlowNode<WorkflowNodeData>>, edges)
		const wf = { id: workflowId ?? 'temp', name: workflowName, ...payload, createdAt: Date.now(), updatedAt: Date.now() }
		
		// Extract input values from stored input node values
		const initial: Record<string, unknown> = {}
		
		// Get all input nodes and their current field values
		const inputNodes = nodes.filter(n => n.type === 'inputText') as Array<FlowNode<InputTextNodeData>>
		
		for (const inputNode of inputNodes) {
			const nodeValues = inputNodeValues[inputNode.id] || {}
			// Merge all input node values into the initial payload
			Object.assign(initial, nodeValues)
		}
		
		const beBase = (import.meta as any)?.env?.VITE_SEQUENCE_BE_BASE_URL || (window as any)?.SEQUENCE_BE_BASE_URL
		if (beBase && workflowId) {
			try {
				setIsRunning(true)
				setRunOutput('🚀 Starting workflow execution...\n')
				setRunStatus('starting')
				
				// Scroll to logs section after a short delay
				setTimeout(() => {
					logsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
				}, 1000)
				
				// Start async execution
				const res = await fetch(`${String(beBase).replace(/\/$/, '')}/workflows/${encodeURIComponent(workflowId)}/execute-async`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ input: initial }),
				})
				const asyncResult = await res.json()
				const runId = asyncResult.runId
				setCurrentRunId(runId)
				
				setRunOutput(prev => prev + `📋 Run ID: ${runId}\n⏳ Polling for updates every 2 seconds...\n\n`)
				
				// Start real-time polling
				startPolling(beBase, workflowId, runId)
				
			} catch (error) {
				setIsRunning(false)
				setRunStatus('error')
				setRunOutput(`❌ Failed to start workflow: ${error}`)
			}
			return
		}
		
		// Fallback to local execution
		const res = executeWorkflow(wf, initial)
		setRunOutput(JSON.stringify(res.logs, null, 2))
		
		// Scroll to logs section after a short delay
		setTimeout(() => {
			logsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		}, 500)
	}

	async function startPolling(beBase: string, workflowId: string, runId: string) {
		let pollCount = 0
		const maxPolls = 150 // 5 minutes max (150 * 2 seconds)
		
		const poll = async () => {
			try {
				const statusRes = await fetch(`${String(beBase).replace(/\/$/, '')}/workflows/${encodeURIComponent(workflowId)}/runs/${encodeURIComponent(runId)}/status`)
				const status = await statusRes.json()
				
				setRunStatus(status.status)
				
				// Format and display current status and logs
				let output = `🚀 Workflow Execution (Run ID: ${runId})\n`
				output += `📊 Status: ${status.status.toUpperCase()}\n`
				output += `⏰ Started: ${new Date(status.startedAt).toLocaleTimeString()}\n`
				if (status.finishedAt) {
					output += `🏁 Finished: ${new Date(status.finishedAt).toLocaleTimeString()}\n`
				}
				output += `🔄 Poll #${pollCount + 1}\n\n`
				
				// Show task status
				if (status.tasks && status.tasks.length > 0) {
					output += `📋 Tasks (${status.tasks.length}):\n`
					for (const task of status.tasks) {
						const statusIcon = task.status === 'completed' ? '✅' : 
										  task.status === 'running' ? '🔄' : 
										  task.status === 'failed' ? '❌' : 
										  task.status === 'queued' ? '⏳' : '⭕'
						output += `  ${statusIcon} ${task.nodeType} (${task.status})\n`
					}
					output += '\n'
				}
				
				// Show logs
				if (status.logs && status.logs.length > 0) {
					output += `📝 Logs (${status.logs.length}):\n`
					for (const log of status.logs) {
						const time = new Date(log.timestamp).toLocaleTimeString()
						const icon = log.type === 'system' ? '🔧' : 
									log.type === 'node-output' ? '📤' : '📋'
						output += `  ${icon} [${time}] ${log.message}\n`
					}
				}
				
				setRunOutput(output)
				
				// Check if workflow is complete
				if (status.status === 'succeeded' || status.status === 'failed') {
					setIsRunning(false)
					const finalIcon = status.status === 'succeeded' ? '🎉' : '��'
					setRunOutput(prev => prev + `\n${finalIcon} Workflow ${status.status}!\n`)
					return
				}
				
				// Continue polling if not complete and under max attempts
				pollCount++
				if (pollCount < maxPolls) {
					const timeoutId = setTimeout(poll, 2000) // Poll every 2 seconds
					setPollTimeoutId(timeoutId)
				} else {
					setIsRunning(false)
					setRunStatus('timeout')
					setRunOutput(prev => prev + `\n⏰ Polling stopped after ${maxPolls * 2} seconds\n`)
				}
				
			} catch (error) {
				console.error('Polling error:', error)
				pollCount++
				if (pollCount < maxPolls) {
					const timeoutId = setTimeout(poll, 2000) // Continue polling even on errors
					setPollTimeoutId(timeoutId)
				} else {
					setIsRunning(false)
					setRunStatus('error')
					setRunOutput(prev => prev + `\n❌ Polling failed: ${error}\n`)
				}
			}
		}
		
		// Start first poll immediately
		poll()
	}

	function handleStop() {
		if (pollTimeoutId) {
			clearTimeout(pollTimeoutId)
			setPollTimeoutId(null)
		}
		setIsRunning(false)
		setRunStatus('stopped')
		setRunOutput(prev => prev + `\n⏹️ Polling stopped by user\n`)
		setCurrentRunId(null)
	}


	
	// Group nodes by function type
	const groupedNodes = useMemo(() => {
		const groups = {
			'Input & Data': [
				{ type: 'inputText', label: 'Input Node', description: 'Multiple fields', icon: '📝' }
			],
			'Logic & Control': [
				{ type: 'decision', label: 'Decision', description: 'Binary or N-way outcomes', icon: '🔀' },
				{ type: 'ifElse', label: 'If-Else', description: 'Binary condition with true/false outcomes', icon: '❓' }
			],
			'Actions': [
				{ type: 'apiCall', label: 'API Call', description: 'HTTP request to external service', icon: '🌐' },
				{ type: 'notification', label: 'Notification', description: 'Compose message template', icon: '📢' },
				{ type: 'delay', label: 'Delay', description: 'Wait for a specified duration', icon: '⏱️' }
			]
		}
		return groups
	}, [])

	return (
		<div className="flex flex-col gap-4 min-h-screen bg-gray-50">
			<div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-200">
				<input 
					className="px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors min-w-64" 
					placeholder="Enter workflow name..." 
					value={workflowName} 
					onChange={(e) => setWorkflowName(e.target.value)} 
				/>
				<button 
					className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
					onClick={handleSave}
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
					</svg>
					Save
				</button>
				<button 
					className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
						isRunning 
							? 'text-red-700 bg-red-50 border border-red-300 hover:bg-red-100 focus:ring-red-500' 
							: 'text-white bg-green-600 border border-transparent hover:bg-green-700 focus:ring-green-500'
					}`}
					onClick={isRunning ? handleStop : handleRun}
					disabled={isRunning && !currentRunId}
				>
					{isRunning ? (
						<>
							<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
							</svg>
							Stop
						</>
					) : (
						<>
							<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
							</svg>
							Run
						</>
					)}
				</button>
				{isRunning && (
					<div className="flex items-center gap-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
						<div className="flex items-center gap-2">
							<div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
							<span className="text-sm font-medium text-blue-900">Status: {runStatus || 'starting'}</span>
						</div>
						{currentRunId && (
							<span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
								ID: {currentRunId.slice(0, 8)}...
							</span>
						)}
						<button 
							onClick={() => logsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
							className="flex items-center gap-2 text-xs text-blue-700 ml-2 hover:text-blue-800 transition-colors cursor-pointer"
						>
							<svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
							</svg>
							<span>Scroll down for logs</span>
						</button>
					</div>
				)}
			</div>
			<div className="flex gap-6 px-6" style={{ height: '80vh' }}>
				<aside className="w-80 shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
					<div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
						<h3 className="text-sm font-semibold text-gray-900">Node Palette</h3>
						<p className="text-xs text-gray-500 mt-1">Drag nodes to the canvas to build your workflow</p>
					</div>
					<div className="p-4 max-h-full overflow-auto">
						{Object.entries(groupedNodes).map(([groupName, nodes]) => (
							<div key={groupName} className="mb-6 last:mb-0">
								{/* Group Header */}
								<div className="flex items-center gap-2 mb-3">
									<div className="h-px bg-gradient-to-r from-gray-300 to-transparent flex-1"></div>
									<h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider px-2">
										{groupName}
									</h4>
									<div className="h-px bg-gradient-to-l from-gray-300 to-transparent flex-1"></div>
								</div>
								
								{/* Group Nodes */}
								<div className="space-y-2">
									{nodes.map(node => (
										<div
											key={node.type}
											className="group rounded-lg border border-gray-200 p-3 bg-gradient-to-br from-white to-gray-50 cursor-move hover:border-blue-300 hover:shadow-md hover:scale-[1.02] transition-all duration-200"
											draggable
											onDragStart={(event) => {
												event.dataTransfer.setData('application/reactflow', node.type)
												event.dataTransfer.effectAllowed = 'move'
											}}
										>
											<div className="flex items-start gap-3">
												<div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center text-lg group-hover:from-blue-200 group-hover:to-blue-300 transition-colors">
													{node.icon}
												</div>
												<div className="flex-1 min-w-0">
													<div className="text-sm font-medium text-gray-900 group-hover:text-blue-900 transition-colors">
														{node.label}
													</div>
													<div className="text-xs text-gray-500 mt-1 group-hover:text-blue-700 transition-colors leading-relaxed">
														{node.description}
													</div>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						))}
						
						{/* Help Text */}
						<div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
							<div className="flex items-start gap-2">
								<svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
								</svg>
								<div>
									<p className="text-xs font-medium text-blue-900">Getting Started</p>
									<p className="text-xs text-blue-700 mt-1">
										Drag nodes from above onto the canvas, then connect them to create your workflow.
									</p>
								</div>
							</div>
						</div>
					</div>
				</aside>
				<div className="flex-1 min-w-0 rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white relative">
					<ReactFlow
						nodes={nodes.map(attachEditor)}
						edges={edges}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChangeWithSchema}
						onConnect={onConnect}
						nodeTypes={nodeTypes}
						onDrop={onDrop}
						onDragOver={onDragOver}
						fitView
					>
						<Background variant={BackgroundVariant.Dots} gap={18} size={1.5} color="#cbd5e1" />
						{/* <MiniMap pannable zoomable nodeColor={() => '#0ea5e9'} nodeStrokeColor={() => '#0369a1'} maskColor="rgba(241,245,249,0.9)" /> */}
						<Controls showInteractive={false} />
					</ReactFlow>
					
					{/* Zoom Help Indicator */}
					<div className="absolute top-4 right-4 z-10">
						<div className="group relative">
							<div className="flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm cursor-help">
								<svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
								</svg>
								<span className="text-sm text-gray-700 font-medium">Navigation</span>
							</div>
							
							{/* Tooltip */}
							<div className="absolute right-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
								<div className="space-y-2">
									<div className="flex items-center gap-2">
										<svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
										</svg>
										<span>Scroll up/down to zoom in/out</span>
									</div>
									<div className="flex items-center gap-2">
										<svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3" />
										</svg>
										<span>Click and drag to pan around</span>
									</div>
									<div className="flex items-center gap-2">
										<svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
										</svg>
										<span>Double-click nodes to edit</span>
									</div>
								</div>
								{/* Arrow pointing up */}
								<div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
							</div>
						</div>
					</div>
				</div>
			</div>
			{runOutput && (
				<div ref={logsRef} className="px-6 pb-6 transition-all duration-500 ease-in-out">
					<div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
						<div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center">
										<svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
										</svg>
									</div>
									<div>
										<h3 className="text-sm font-semibold text-gray-900">Workflow Execution</h3>
										<p className="text-xs text-gray-500">Real-time execution logs and status</p>
									</div>
								</div>
								{isRunning && (
									<div className="flex items-center gap-2 px-3 py-1 bg-green-100 border border-green-200 rounded-full">
										<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
										<span className="text-xs font-medium text-green-800">Live updates every 2s</span>
									</div>
								)}
							</div>
						</div>
						<div className="bg-gray-900 p-4">
							<div className="bg-gray-800 px-4 py-2 rounded-t-lg border-b border-gray-700">
								<div className="flex items-center gap-2">
									<div className="flex gap-1.5">
										<div className="w-3 h-3 bg-red-500 rounded-full"></div>
										<div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
										<div className="w-3 h-3 bg-green-500 rounded-full"></div>
									</div>
									<span className="text-gray-300 text-sm font-mono">workflow-execution</span>
								</div>
							</div>
							<pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap min-h-96 overflow-auto p-4 bg-gray-900 rounded-b-lg">{runOutput}</pre>
						</div>
					</div>
				</div>
			)}

			<NodeEditModal
				isOpen={Boolean(editingInputNode)}
				fields={editingInputNode?.data.base.config.fields ?? []}
				currentValues={editingInputNode?.data.value ?? {}}
				onClose={() => setEditingInputNodeId(null)}
				onSave={(updates) => {
					const updatedOutputSchema = inputFieldsToJsonSchema(updates.fields)
					setNodes((prev) => {
						// First update the input node with new schema
						let updatedNodes = prev.map(n => n.id === editingInputNodeId ? {
							...n,
							data: {
								...n.data,
								base: {
									...n.data.base,
									config: { ...n.data.base.config, fields: updates.fields },
									outputSchema: updatedOutputSchema,
								},
							}
						} : n)
						
						// Then re-apply connection effects for all edges from this node
						const affectedEdges = edges.filter(e => e.source === editingInputNodeId)
						for (const edge of affectedEdges) {
							const connection = { source: edge.source, target: edge.target, sourceHandle: edge.sourceHandle ?? null, targetHandle: edge.targetHandle ?? null }
							updatedNodes = applyConnectionEffects(updatedNodes, connection)
						}
						
						return updatedNodes
					})
					setEditingInputNodeId(null)
				}}
			/>

			{editingDecisionNode && (
				<DecisionNodeEditModal
					isOpen={Boolean(editingDecisionNode)}
					node={editingDecisionNode.data.base as DecisionNode}
					onClose={() => setEditingDecisionNodeId(null)}
					onSave={(updates) => {
						setNodes((prev) => prev.map(n => n.id === editingDecisionNodeId ? {
							...n,
							data: {
								...n.data,
								base: {
									...n.data.base,
									config: { ...(n.data.base as DecisionNode).config, decisions: updates.decisions },
								},
							}
						} : n))
						setEditingDecisionNodeId(null)
					}}
				/>
			)}

			{editingIfElseNode && (
				<IfElseNodeEditModal
					isOpen={Boolean(editingIfElseNode)}
					node={editingIfElseNode.data.base as IfElseNode}
					onClose={() => setEditingIfElseNodeId(null)}
					onSave={(updates) => {
						setNodes((prev) => prev.map(n => n.id === editingIfElseNodeId ? {
							...n,
							data: {
								...n.data,
								base: {
									...n.data.base,
									config: { 
										...(n.data.base as IfElseNode).config, 
										condition: updates.condition,
										trueLabel: updates.trueLabel,
										falseLabel: updates.falseLabel
									},
								},
							}
						} : n))
						setEditingIfElseNodeId(null)
					}}
				/>
			)}

			{editingNotificationNode && (
				<NotificationNodeEditModal
					isOpen={Boolean(editingNotificationNode)}
					node={editingNotificationNode.data.base as NotificationNode}
					onClose={() => setEditingNotificationNodeId(null)}
					onSave={(updates) => {
						setNodes((prev) => prev.map(n => n.id === editingNotificationNodeId ? {
							...n,
							data: {
								...n.data,
								base: {
									...n.data.base,
									config: { ...(n.data.base as NotificationNode).config, template: updates.template },
								},
							}
						} : n))
						setEditingNotificationNodeId(null)
					}}
				/>
			)}

			{editingApiCallNode && (
				<ApiCallNodeEditModal
					isOpen={Boolean(editingApiCallNode)}
					node={editingApiCallNode.data.base as ApiCallNode}
					onClose={() => setEditingApiCallNodeId(null)}
					onSave={(updates) => {
						setNodes((prev) => prev.map(n => n.id === editingApiCallNodeId ? {
							...n,
							data: {
								...n.data,
								base: {
									...n.data.base,
									config: { ...(n.data.base as ApiCallNode).config, ...updates },
								},
							}
						} : n))
						setEditingApiCallNodeId(null)
					}}
				/>
			)}

			{editingDelayNode && (
				<DelayNodeEditModal
					isOpen={Boolean(editingDelayNode)}
					node={editingDelayNode.data.base as DelayNode}
					onClose={() => setEditingDelayNodeId(null)}
					onSave={(updates) => {
						setNodes((prev) => prev.map(n => n.id === editingDelayNodeId ? {
							...n,
							data: {
								...n.data,
								base: {
									...n.data.base,
									name: updates.name || n.data.base.name,
									config: {
										...(n.data.base as DelayNode).config,
										...updates.config,
									},
								},
							}
						} : n))
						setEditingDelayNodeId(null)
					}}
				/>
			)}
		</div>
	)
}

export default function SequenceBuilder() {
	return (
		<ReactFlowProvider>
			<BuilderCanvas />
		</ReactFlowProvider>
	)
} 