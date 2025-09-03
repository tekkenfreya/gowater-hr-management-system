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
                    <Link href="/dashboard" className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200">
                      Dashboard
                    </Link>
                    <Link href="/projects" className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200">
                      Projects
                    </Link>
                    <Link href="/team" className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200">
                      Team
                    </Link>
                    <Link href="/reports" className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200">
                      Reports
                    </Link>
                    <Link href="/resources" className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200">
                      Resources
                    </Link>
                  </nav>
                </div>

                {/* Right Actions */}
                <div className="flex items-center space-x-3 flex-shrink-0">
                  <Link
                    href="/auth/login"
                    className="text-gray-600 hover:text-gray-900 px-4 py-2 text-sm font-medium transition-colors duration-200"
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
                <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                  Welcome to the GoWater team portal. Access your employee dashboard, 
                  manage your profile, and stay connected with our mission to deliver clean water.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                <button className="group bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg min-w-[200px]">
                  <span className="flex items-center justify-center">
                    Get Started
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </button>
                <button className="group bg-transparent border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 transform hover:scale-105 min-w-[200px]">
                  <span className="flex items-center justify-center">
                    Learn More
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </span>
                </button>
              </div>

              {/* Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                <div className="bg-white border border-gray-200 p-8 rounded-3xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 group">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Pure Quality</h3>
                  <p className="text-gray-600 text-lg">
                    Advanced filtration technology ensuring the highest water purity standards for our customers
                  </p>
                </div>

                <div className="bg-white border border-gray-200 p-8 rounded-3xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 group">
                  <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Healthy Living</h3>
                  <p className="text-gray-600 text-lg">
                    Promoting wellness through clean, mineral-rich water that supports healthy communities
                  </p>
                </div>

                <div className="bg-white border border-gray-200 p-8 rounded-3xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 group">
                  <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-blue-500 rounded-2xl mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Global Impact</h3>
                  <p className="text-gray-600 text-lg">
                    Sustainable water solutions serving communities worldwide with environmental responsibility
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
    </div>
  );
}
