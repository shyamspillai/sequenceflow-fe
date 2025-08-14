import { memo, useMemo, useState, useEffect } from 'react'
import { Handle, Position, type Node as FlowNode, type NodeProps } from '@xyflow/react'
import type { DecisionNodeData } from '../../types/workflow'
import { applyJsonLogic } from '../../utils/validation/jsonLogic'
import { exampleFromSchema } from '../../utils/schema'

function DecisionNodeComponent({ data }: NodeProps<FlowNode<DecisionNodeData>>) {
	const { base } = data
	const [sample, setSample] = useState<string>('{}')
	const [hoveredId, setHoveredId] = useState<string | null>(null)

	useEffect(() => {
		if (base.inputSchema && sample === '{}') {
			const ex = exampleFromSchema(base.inputSchema)
			try { setSample(JSON.stringify(ex, null, 2)) } catch { /* noop */ }
		}
	}, [base.inputSchema, sample])

	const parsedSample = useMemo(() => {
		try {
			return JSON.parse(sample)
		} catch {
			return {}
		}
	}, [sample])

	const effectiveInput = useMemo(() => {
		return data.inputValue ?? parsedSample
	}, [data.inputValue, parsedSample])

	const results = useMemo(() => {
		return (base.config.decisions ?? []).map(d => {
			if (d.predicates && d.predicates.length > 0) {
				const checks = d.predicates.map(p => {
					const subject = p.targetField ? (effectiveInput as any)[p.targetField] : effectiveInput
					return applyJsonLogic(p.validationLogic, { value: subject }).isValid
				})
				const combiner = d.combiner ?? 'all'
				const valid = combiner === 'all' ? checks.every(Boolean) : checks.some(Boolean)
				return { id: d.id, name: d.name, valid }
			}
			// fallback to single rule
			const subject = d.targetField ? (effectiveInput as any)[d.targetField] : effectiveInput
			const res = applyJsonLogic(d.validationLogic, { value: subject })
			return { id: d.id, name: d.name, valid: res.isValid }
		})
	}, [base.config.decisions, effectiveInput])

	return (
		<div className="relative rounded-md border border-slate-200 bg-white shadow-sm w-[360px]">
			<div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
				<div className="text-xs font-medium text-slate-700">{base.name}</div>
				<button className="text-[11px] text-blue-700" onClick={() => data.openEditor?.(base.id)}>Edit</button>
			</div>
			<div className="p-3 space-y-3">
				{base.inputSchema && (
					<div className="text-[10px] text-slate-500">
						Schema available. Provide an object matching the upstream output.
					</div>
				)}
				{data.inputValue ? (
					<div>
						<div className="text-[10px] text-slate-500 mb-1">Upstream input</div>
						<div className="w-full border rounded p-2 text-[11px] font-mono whitespace-pre-wrap break-words bg-slate-50">
							{(() => { try { return JSON.stringify(data.inputValue, null, 2) } catch { return '{}' } })()}
						</div>
					</div>
				) : (
					<textarea className="w-full border rounded p-2 text-xs h-24 font-mono" value={sample} onChange={(e) => setSample(e.target.value)} />
				)}
				<div className="space-y-1">
					{results.map(r => (
						<div key={r.id} className="flex items-center justify-between text-[11px]">
							<div>{r.name}</div>
							<div className={r.valid ? 'text-green-700' : 'text-red-700'}>{r.valid ? 'MATCH' : 'NO MATCH'}</div>
						</div>
					))}
				</div>
			</div>
			<Handle type="target" position={Position.Left} id="in" />
			{(base.config.decisions ?? []).map((d, idx) => {
				const top = 40 + idx * 24
				return (
					<div key={d.id} className="pointer-events-none">
						{hoveredId === d.id && (
							<div className="absolute right-8 -translate-y-1/2 z-10 pointer-events-none" style={{ top }}>
								<div className="px-2 py-1 rounded bg-slate-900 text-white text-[10px] shadow-lg border border-slate-700 whitespace-nowrap">
									{d.name}
								</div>
							</div>
						)}
						<Handle
							type="source"
							position={Position.Right}
							id={`out-${d.id}`}
							title={d.name}
							style={{ top }}
							onMouseEnter={() => setHoveredId(d.id)}
							onMouseLeave={() => setHoveredId(null)}
						/>
					</div>
				)
			})}
		</div>
	)
}

export default memo(DecisionNodeComponent) 