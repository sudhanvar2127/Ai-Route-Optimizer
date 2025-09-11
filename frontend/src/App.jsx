import React from 'react'
// import { ToastConatainer } from 'react-toastify'
import { Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import EnhancedRouteOptimizer from './pages/EchancedRouteOptimizer'

const App = () => {
  return (
    <div>
      {/* <ToastConatainer /> */}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<EnhancedRouteOptimizer /> } />
      </Routes>
    </div>
  )
}

export default App
