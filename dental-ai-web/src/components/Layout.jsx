import Header from './Header';
import Footer from './Footer';

export default function Layout({ children }) {
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <div className="px-4 sm:px-10 md:px-20 lg:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            <Header />
            <main className="flex-grow py-10 sm:py-16">
              {children}
            </main>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}
