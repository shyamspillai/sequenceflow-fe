import { useEffect } from 'react'

export default function Logout() {
	useEffect(() => {
		// TODO: Implement real logout logic
		// Clear authentication tokens, redirect to login, etc.
	}, [])

	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
			{/* Logout Icon */}
			<div className="mb-8">
				<div className="relative">
					<svg 
						className="w-24 h-24 text-green-500 mx-auto" 
						fill="none" 
						stroke="currentColor" 
						viewBox="0 0 24 24" 
						xmlns="http://www.w3.org/2000/svg"
					>
						<path 
							strokeLinecap="round" 
							strokeLinejoin="round" 
							strokeWidth={1.5} 
							d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
						/>
					</svg>
					{/* Success checkmark overlay */}
					<div className="absolute -top-2 -right-2 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
						<svg 
							className="w-5 h-5 text-green-600" 
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path 
								strokeLinecap="round" 
								strokeLinejoin="round" 
								strokeWidth={2} 
								d="M5 13l4 4L19 7"
							/>
						</svg>
					</div>
				</div>
			</div>
			
			{/* Success Message */}
			<h2 className="text-3xl font-bold text-slate-900 mb-4">
				Successfully Logged Out
			</h2>
			
			<p className="text-lg text-slate-600 mb-6 max-w-md">
				Thank you for using our workflow automation platform. You have been securely logged out.
			</p>
			
			{/* Action Buttons */}
			<div className="flex flex-col sm:flex-row gap-4">
				<button 
					className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors duration-200 font-medium"
					onClick={() => window.location.href = '/'}
				>
					Go to Home
				</button>
			</div>
			
			{/* Security Note */}
			<div className="mt-8 p-4 bg-slate-50 rounded-lg max-w-md">
				<div className="flex items-center justify-center mb-2">
					<svg 
						className="w-5 h-5 text-slate-500 mr-2" 
						fill="none" 
						stroke="currentColor" 
						viewBox="0 0 24 24"
					>
						<path 
							strokeLinecap="round" 
							strokeLinejoin="round" 
							strokeWidth={2} 
							d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
						/>
					</svg>
					<span className="text-sm font-medium text-slate-700">Security Tip</span>
				</div>
				<p className="text-xs text-slate-600">
					For your security, always log out when using shared or public computers.
				</p>
			</div>
		</div>
	)
} 