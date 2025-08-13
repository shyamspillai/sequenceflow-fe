export default function Triggers() {
	return (
		<div>
			<h2 className="text-2xl font-semibold tracking-tight text-slate-900">Triggers</h2>
			<p className="mt-2 text-slate-600">Manage the events that kick off your sequences.</p>
			<div className="mt-6 space-y-3">
				{['Webhook Received', 'Schedule', 'Form Submitted', 'Payment Succeeded'].map((name) => (
					<div key={name} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
						<div>
							<div className="font-medium">{name}</div>
							<div className="text-xs text-slate-500">Active</div>
						</div>
						<button className="text-sm px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50">Configure</button>
					</div>
				))}
			</div>
		</div>
	)
} 