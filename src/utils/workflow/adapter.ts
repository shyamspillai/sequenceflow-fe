import type { Edge, Node as FlowNode } from '@xyflow/react'
import type { PersistedWorkflow, PersistedNode, PersistedEdge } from '../../types/persistence'
import type { WorkflowNodeData, WorkflowNode, InputTextNodeData, DecisionNodeData, NotificationNodeData } from '../../types/workflow'

export function toPersistedWorkflow(nodes: Array<FlowNode<WorkflowNodeData>>, edges: Edge[]): Omit<PersistedWorkflow, 'id' | 'createdAt' | 'updatedAt' | 'name'> {
	const persistedNodes: PersistedNode[] = nodes.map(n => ({
		id: n.id,
		base: (n.data as WorkflowNodeData).base as WorkflowNode,
		position: { x: n.position.x, y: n.position.y },
	}))
	const persistedEdges: PersistedEdge[] = edges.map(e => ({
		id: e.id ?? `${e.source}-${e.target}`,
		sourceId: e.source,
		targetId: e.target,
		sourceHandleId: (e as any).sourceHandle,
		targetHandleId: (e as any).targetHandle,
	}))
	return { nodes: persistedNodes, edges: persistedEdges }
}

export function fromPersistedWorkflow(wf: PersistedWorkflow): { nodes: Array<FlowNode<WorkflowNodeData>>; edges: Edge[] } {
	const nodes: Array<FlowNode<WorkflowNodeData>> = wf.nodes.map(p => {
		if (p.base.type === 'inputText') {
			const data: InputTextNodeData = { base: p.base as any, value: {}, errors: {} }
			return { id: p.id, type: p.base.type, position: p.position as any, data }
		}
		if (p.base.type === 'decision') {
			const data: DecisionNodeData = { base: p.base as any, sampleInput: {} }
			return { id: p.id, type: p.base.type, position: p.position as any, data }
		}
		const data: NotificationNodeData = { base: p.base as any, previewText: '' }
		return { id: p.id, type: p.base.type, position: p.position as any, data }
	})
	const edges: Edge[] = wf.edges.map(e => ({
		id: e.id,
		source: e.sourceId,
		target: e.targetId,
		sourceHandle: e.sourceHandleId,
		targetHandle: e.targetHandleId,
		animated: true,
	})) as Edge[]
	return { nodes, edges }
}

export function validateWorkflowForSave(nodes: Array<FlowNode<WorkflowNodeData>>, edges: Edge[]): { ok: boolean; errors: string[] } {
	const errors: string[] = []
	const hasInput = nodes.some(n => n.type === 'inputText')
	if (!hasInput) errors.push('Workflow must contain at least one input node.')
	const hasNonInput = nodes.some(n => n.type === 'notification' || n.type === 'decision')
	if (hasNonInput && !hasInput) errors.push('Decision/Notification nodes cannot exist without an input node.')
	const nodeIds = new Set(nodes.map(n => n.id))
	const outgoing = new Map<string, string[]>()
	for (const e of edges) {
		if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue
		const arr = outgoing.get(e.source) ?? []
		arr.push(e.target)
		outgoing.set(e.source, arr)
	}
	if (hasInput) {
		const inputIds = nodes.filter(n => n.type === 'inputText').map(n => n.id)
		const reachable = new Set<string>(inputIds)
		const stack = [...inputIds]
		while (stack.length) {
			const cur = stack.pop()!
			for (const nxt of outgoing.get(cur) ?? []) {
				if (!reachable.has(nxt)) { reachable.add(nxt); stack.push(nxt) }
			}
		}
		for (const n of nodes) {
			if ((n.type === 'decision' || n.type === 'notification') && !reachable.has(n.id)) {
				errors.push(`Node ${n.data.base.name} is not connected to any input node.`)
			}
		}
	}
	return { ok: errors.length === 0, errors }
} 