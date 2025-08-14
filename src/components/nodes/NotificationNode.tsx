import { memo } from 'react'
import { Handle, Position, type Node as FlowNode, type NodeProps } from '@xyflow/react'
import type { NotificationNodeData } from '../../types/workflow'

function NotificationNodeComponent({ data }: NodeProps<FlowNode<NotificationNodeData>>) {
	const { base } = data

	return (
		<div className="rounded-md border border-slate-200 bg-white shadow-sm w-[360px]">
			<div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
				<div className="text-xs font-medium text-slate-700">{base.name}</div>
				<button className="text-[11px] text-blue-700" onClick={() => data.openEditor?.(base.id)}>Edit</button>
			</div>
			<div className="p-3 space-y-2">
				{base.inputSchema && Object.keys(base.inputSchema).length > 0 && (
					<div className="text-[10px] text-slate-500">
						Connected to upstream node. Will use input data for template.
					</div>
				)}
				<div className="text-[11px] text-slate-600">Template:</div>
				<div className="text-[12px] text-slate-800 whitespace-pre-wrap break-words border rounded p-2 min-h-12 bg-slate-50">
					{base.config.template || <span className="text-slate-400">No template configured</span>}
				</div>
				<div className="text-[10px] text-slate-500">
					Will generate message during workflow execution
				</div>
			</div>
			<Handle type="target" position={Position.Left} id="in" />
		</div>
	)
}

export default memo(NotificationNodeComponent) 