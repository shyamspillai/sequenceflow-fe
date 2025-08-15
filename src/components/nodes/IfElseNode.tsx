import { memo } from 'react'
import { Handle, Position, type Node as FlowNode, type NodeProps } from '@xyflow/react'
import type { IfElseNodeData } from '../../types/workflow'

function IfElseNodeComponent({ data }: NodeProps<FlowNode<IfElseNodeData>>) {
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
					If-Else Condition:
				</div>
				<div className="space-y-1">
					{base.config.condition && (
						<div className="flex items-center justify-between text-[11px]">
							<div className="text-slate-700">{base.config.condition.name}</div>
							<div className="text-slate-500">
								{base.config.condition.predicates?.length > 0 ? 'Configured' : 'Not configured'}
							</div>
						</div>
					)}
					{!base.config.condition && (
						<div className="text-[11px] text-slate-400 italic">No condition configured</div>
					)}
				</div>
				
				<div className="text-[11px] text-slate-600 mb-1">
					Outputs:
				</div>
				<div className="space-y-1">
					<div className="flex items-center justify-between text-[11px]">
						<div className="text-green-700">✓ {base.config.trueLabel || 'True'}</div>
						<div className="text-slate-500">Ready</div>
					</div>
					<div className="flex items-center justify-between text-[11px]">
						<div className="text-red-700">✗ {base.config.falseLabel || 'False'}</div>
						<div className="text-slate-500">Ready</div>
					</div>
				</div>
			</div>
			<Handle type="target" position={Position.Left} id="in" />
			{/* True output handle */}
			<Handle
				type="source"
				position={Position.Right}
				id="out-true"
				style={{
					top: '70px',
					background: '#10b981',
					width: 8,
					height: 8
				}}
			/>
			{/* False output handle */}
			<Handle
				type="source"
				position={Position.Right}
				id="out-false"
				style={{
					top: '94px',
					background: '#ef4444',
					width: 8,
					height: 8
				}}
			/>
		</div>
	)
}

export default memo(IfElseNodeComponent) 