import { Outlet, Link } from 'react-router-dom'

export default function PublicLayout() {
	return (
		<div className="min-h-screen bg-slate-50 text-slate-800">
			<header className="border-b border-slate-200 bg-white">
				<div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
					<Link to="/" className="font-semibold tracking-tight text-slate-900">
						Sequence Flow
					</Link>
					<nav className="text-sm text-slate-600">
						<Link to="/sequences" className="hover:text-slate-900">Enter App</Link>
					</nav>
				</div>
			</header>
			<main className="mx-auto max-w-5xl px-6 py-12">
				<div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
					<Outlet />
				</div>
			</main>
		</div>
	)
} 