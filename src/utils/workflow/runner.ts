import type { PersistedWorkflow } from '../../types/persistence'
import type { WorkflowNode } from '../../types/workflow'
import { applyJsonLogic } from '../validation/jsonLogic'
import { interpolateTemplate } from '../template'

export type ExecutionResult = {
	logs: Array<
		| { kind: 'notification'; nodeId: string; name: string; content: string }
	>
}

function findStartNode(wf: PersistedWorkflow): WorkflowNode | null {
	const n = wf.nodes.find(n => n.base.type === 'inputText')
	return n ? n.base : null
}

export function executeWorkflow(wf: PersistedWorkflow, initialInput?: Record<string, unknown>): ExecutionResult {
	const start = findStartNode(wf)
	if (!start) return { logs: [] }
	// Build adjacency
	const out = new Map<string, Array<{ targetId: string; sourceHandleId?: string }>>()
	for (const e of wf.edges) {
		const arr = out.get(e.sourceId) ?? []
		arr.push({ targetId: e.targetId, sourceHandleId: e.sourceHandleId })
		out.set(e.sourceId, arr)
	}
	const nodeById = new Map(wf.nodes.map(n => [n.id, n.base]))

	const logs: ExecutionResult['logs'] = []
	let payload: Record<string, unknown> = initialInput ?? {}
	// For now, propagate a single payload along all outgoing edges.
	const visited = new Set<string>()
	const stack: string[] = [start.id]
	while (stack.length) {
		const curId = stack.pop()!
		if (visited.has(curId)) continue
		visited.add(curId)
		const node = nodeById.get(curId)
		if (!node) continue
		if (node.type === 'decision') {
			const decisions = node.config.decisions ?? []
			const matches = new Set<string>()
			for (const d of decisions) {
				if (d.predicates && d.predicates.length > 0) {
					const checks = d.predicates.map(p => applyJsonLogic(p.validationLogic, { value: p.targetField ? (payload as any)[p.targetField] : payload }).isValid)
					const combiner = d.combiner ?? 'all'
					const valid = combiner === 'all' ? checks.every(Boolean) : checks.some(Boolean)
					if (valid) matches.add(d.id)
				} else {
					const subject = d.targetField ? (payload as any)[d.targetField] : payload
					const res = applyJsonLogic(d.validationLogic, { value: subject })
					if (res.isValid) matches.add(d.id)
				}
			}
			for (const edge of out.get(curId) ?? []) {
				if (!edge.sourceHandleId) { stack.push(edge.targetId); continue }
				if (edge.sourceHandleId.startsWith('out-')) {
					const condId = edge.sourceHandleId.slice('out-'.length)
					if (matches.has(condId)) stack.push(edge.targetId)
				}
			}
		} else if (node.type === 'notification') {
			const content = interpolateTemplate((node.config as any).template ?? '', payload as Record<string, any>)
			logs.push({ kind: 'notification', nodeId: node.id, name: node.name, content })
			for (const edge of out.get(curId) ?? []) stack.push(edge.targetId)
		} else if (node.type === 'inputText') {
			// payload already set
			for (const edge of out.get(curId) ?? []) stack.push(edge.targetId)
		}
	}
	return { logs }
} 