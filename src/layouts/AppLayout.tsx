import { NavLink, Outlet } from 'react-router-dom'

function classNames(...classes: Array<string | false | null | undefined>) {
	return classes.filter(Boolean).join(' ')
}

export default function AppLayout() {
	const userName = 'Jane Doe'
	const userEmail = 'jane.doe@example.com'

	return (
		<div className="min-h-screen bg-slate-50 text-slate-800 flex">
			<aside className="w-64 shrink-0 border-r border-slate-200 bg-white">
				<div className="px-4 py-5 border-b border-slate-200">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-full bg-blue-600/10 text-blue-700 flex items-center justify-center font-semibold">{userName.split(' ').map(n => n[0]).slice(0,2).join('')}</div>
						<div>
							<div className="font-medium text-slate-900 leading-tight">{userName}</div>
							<div className="text-xs text-slate-500">{userEmail}</div>
						</div>
					</div>
				</div>
				<nav className="px-2 py-4 text-sm">
					<NavLink
						to="/sequences"
						className={({ isActive }) => classNames(
							'flex items-center gap-3 rounded-md px-3 py-2 text-slate-700 hover:bg-slate-50',
							isActive && 'bg-blue-50 text-blue-700 hover:bg-blue-50'
						)}
					>
						<span>Sequences</span>
					</NavLink>
					<NavLink
						to="/triggers"
						className={({ isActive }) => classNames(
							'flex items-center gap-3 rounded-md px-3 py-2 text-slate-700 hover:bg-slate-50',
							isActive && 'bg-blue-50 text-blue-700 hover:bg-blue-50'
						)}
					>
						<span>Triggers</span>
					</NavLink>
					<NavLink
						to="/usage"
						className={({ isActive }) => classNames(
							'flex items-center gap-3 rounded-md px-3 py-2 text-slate-700 hover:bg-slate-50',
							isActive && 'bg-blue-50 text-blue-700 hover:bg-blue-50'
						)}
					>
						<span>Usage</span>
					</NavLink>
					<div className="h-px bg-slate-200 my-3" />
					<NavLink
						to="/logout"
						className={({ isActive }) => classNames(
							'flex items-center gap-3 rounded-md px-3 py-2 text-slate-700 hover:bg-slate-50',
							isActive && 'bg-blue-50 text-blue-700 hover:bg-blue-50'
						)}
					>
						<span>Logout</span>
					</NavLink>
				</nav>
			</aside>
			<div className="flex-1 min-w-0">
				<header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
					<div className="px-6 py-4 flex items-center justify-between">
						<div className="font-semibold tracking-tight text-slate-900">Sequence Flow</div>
					</div>
				</header>
				<main className="px-6 py-6">
					<div className="mx-auto max-w-6xl">
						<div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
							<Outlet />
						</div>
					</div>
				</main>
			</div>
		</div>
	)
} 