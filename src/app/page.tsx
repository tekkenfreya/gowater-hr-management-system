import Link from 'next/link';

export default function Home() {

  return (
    <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="relative z-10">
          <div className="bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-8">
              <div className="flex items-center justify-between py-1 min-h-[100px]">
                
                {/* Logo Section */}
                <div className="flex items-center flex-shrink-0">
                  <img src="/gowater new logo.png" alt="GoWater Logo" className="h-32 w-auto" />
                </div>

                {/* Center Navigation */}
                <div className="hidden lg:flex flex-1 justify-center max-w-2xl mx-8">
                  <nav className="flex items-center space-x-1 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-2xl border border-gray-200 shadow-sm">
                    <Link href="#features" className="text-gray-800 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200">
                      Features
                    </Link>
                    <a href="mailto:support@gowater.com" className="text-gray-800 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200">
                      Support
                    </a>
                    <a href="https://gowater.com" target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200">
                      About
                    </a>
                  </nav>
                </div>

                {/* Right Actions */}
                <div className="flex items-center space-x-3 flex-shrink-0">
                  <Link
                    href="/auth/login"
                    className="text-gray-800 hover:text-gray-900 px-4 py-2 text-sm font-medium transition-colors duration-200"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Sign up
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="pt-20 pb-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="mb-12">
                <h2 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                  GoWater
                  <span className="block bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                    Employee Portal
                  </span>
                </h2>
                <p className="text-xl md:text-2xl text-gray-800 max-w-3xl mx-auto leading-relaxed">
                  Welcome to the GoWater team portal. Access your employee dashboard, 
                  manage your profile, and stay connected with our mission to deliver clean water.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                <Link href="/auth/login" className="group bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg min-w-[200px]">
                  <span className="flex items-center justify-center">
                    Access Portal
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  </span>
                </Link>
                <a href="#features" className="group bg-transparent border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 transform hover:scale-105 min-w-[200px]">
                  <span className="flex items-center justify-center">
                    Learn More
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </span>
                </a>
              </div>

              {/* Employee Portal Features */}
              <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                <div className="bg-white border border-gray-200 p-8 rounded-3xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 group">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Time Management</h3>
                  <p className="text-gray-700 text-lg">
                    Track your hours, manage attendance, and view your work schedules all in one place
                  </p>
                </div>

                <div className="bg-white border border-gray-200 p-8 rounded-3xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 group">
                  <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Leave Management</h3>
                  <p className="text-gray-700 text-lg">
                    Request and manage your time off seamlessly with our intuitive leave management system
                  </p>
                </div>

                <div className="bg-white border border-gray-200 p-8 rounded-3xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 group">
                  <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-blue-500 rounded-2xl mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Team Collaboration</h3>
                  <p className="text-gray-700 text-lg">
                    Connect and work effectively with your colleagues through our collaborative platform
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
    </div>
  );
}
