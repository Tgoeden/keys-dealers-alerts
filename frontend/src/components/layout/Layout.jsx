import { Sidebar } from './Sidebar';
import { Toaster } from '../ui/sonner';

export const Layout = ({ children }) => {
  return (
    <div className="app-container">
      <div className="main-layout">
        <Sidebar />
        <main className="main-content bg-slate-50 min-h-screen">
          {children}
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default Layout;
