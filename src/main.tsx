import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import {
	createBrowserRouter,
	createRoutesFromElements,
	RouterProvider,
	Route,
} from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import AppLayout from './layouts/AppLayout'
import Landing from './pages/Landing'
import Sequences from './pages/Sequences'
import Triggers from './pages/Triggers'
import Usage from './pages/Usage'
import Logout from './pages/Logout'
import SequenceBuilder from './pages/SequenceBuilder'

const router = createBrowserRouter(
	createRoutesFromElements(
		<>
			<Route element={<PublicLayout />}>
				<Route index element={<Landing />} />
			</Route>
			<Route element={<AppLayout />}>
				<Route path="/sequences" element={<Sequences />} />
				<Route path="/sequences/new" element={<SequenceBuilder />} />
				<Route path="/sequences/:id" element={<SequenceBuilder />} />
				<Route path="/triggers" element={<Triggers />} />
				<Route path="/usage" element={<Usage />} />
				<Route path="/logout" element={<Logout />} />
			</Route>
		</>
	)
)

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>,
) 