import { memo } from 'react'
import { Handle, Position, type Node as FlowNode, type NodeProps } from '@xyflow/react'
import type { DelayNodeData } from '../../types/workflow'

function DelayNodeComponent({ data }: NodeProps<FlowNode<DelayNodeData>>) {
	const { base } = data

	const formatDelay = (type: string, value: number): string => {
		if (value === 1) {
			return `1 ${type.slice(0, -1)}` // Remove 's' for singular
		}
		return `${value} ${type}`
	}

	return (
		<div className="rounded-md border border-slate-200 bg-white shadow-sm w-[360px]">
			<div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
				<div className="text-xs font-medium text-slate-700">{base.name}</div>
				<button className="text-[11px] text-blue-700" onClick={() => data.openEditor?.(base.id)}>Edit</button>
			</div>
			<div className="p-3 space-y-2">
				{base.inputSchema && Object.keys(base.inputSchema).length > 0 && (
					<div className="text-[10px] text-slate-500">
						Connected to upstream node. Will pass data through after delay.
					</div>
				)}
				<div className="text-[11px] text-slate-600">Delay Duration:</div>
				<div className="text-[12px] text-slate-800 border rounded p-2 bg-slate-50 text-center">
					<div className="text-lg font-semibold text-blue-600">
						{formatDelay(base.config.delayType, base.config.delayValue)}
					</div>
				</div>
				<div className="text-[10px] text-slate-500">
					Downstream nodes will execute after this delay
				</div>
			</div>
			<Handle type="target" position={Position.Left} id="in" />
			<Handle type="source" position={Position.Right} id="out" />
		</div>
	)
}

export default memo(DelayNodeComponent) 