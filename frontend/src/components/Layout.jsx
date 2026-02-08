import Header from './Header';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-row-reverse font-sans text-right" dir="rtl">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <main className="flex-1 mr-64 transition-all duration-300 flex flex-col min-h-screen">
                <Header />
                <div className="p-8 flex-1 overflow-y-auto">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Layout;
