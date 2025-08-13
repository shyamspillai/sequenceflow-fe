export default function Sequences() {
	return (
		<div>
			<h2 className="text-2xl font-semibold tracking-tight text-slate-900">Sequences</h2>
			<p className="mt-2 text-slate-600">Create, edit, and monitor your workflow sequences.</p>
			<div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{Array.from({ length: 6 }).map((_, idx) => (
					<div key={idx} className="rounded-lg border border-slate-200 p-4 hover:shadow-sm transition">
						<div className="h-28 bg-slate-100 rounded mb-3" />
						<div className="font-medium">Sequence {idx + 1}</div>
						<div className="text-xs text-slate-500">Draft • Updated just now</div>
					</div>
				))}
			</div>
		</div>
	)
} 