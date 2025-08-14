import { memo } from 'react'
import { Handle, Position, type Node as FlowNode, type NodeProps } from '@xyflow/react'
import type { DecisionNodeData } from '../../types/workflow'

function DecisionNodeComponent({ data }: NodeProps<FlowNode<DecisionNodeData>>) {
	const { base } = data

	return (
		<div className="relative rounded-md border border-slate-200 bg-white shadow-sm w-[360px]">
			<div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
				<div className="text-xs font-medium text-slate-700">{base.name}</div>
				<button className="text-[11px] text-blue-700" onClick={() => data.openEditor?.(base.id)}>Edit</button>
			</div>
			<div className="p-3 space-y-3">
				{base.inputSchema && Object.keys(base.inputSchema).length > 0 && (
					<div className="text-[10px] text-slate-500">
						Connected to upstream node. Will receive input data during execution.
					</div>
				)}
				
				<div className="text-[11px] text-slate-600 mb-2">
					Configured outcomes ({(base.config.decisions ?? []).length}):
				</div>
				<div className="space-y-1">
					{(base.config.decisions ?? []).map((d) => (
						<div key={d.id} className="flex items-center justify-between text-[11px]">
							<div className="text-slate-700">{d.name}</div>
							<div className="text-slate-500">Ready</div>
						</div>
					))}
					{(base.config.decisions ?? []).length === 0 && (
						<div className="text-[11px] text-slate-400 italic">No decisions configured</div>
					)}
				</div>
			</div>
			<Handle type="target" position={Position.Left} id="in" />
			{(base.config.decisions ?? []).map((d, idx) => {
				const top = 40 + idx * 24
				return (
					<Handle
						key={d.id}
						type="source"
						position={Position.Right}
						id={`out-${d.id}`}
						style={{
							top: `${top}px`,
							background: '#10b981',
							width: 8,
							height: 8
						}}
					/>
				)
			})}
		</div>
	)
}

export default memo(DecisionNodeComponent) 